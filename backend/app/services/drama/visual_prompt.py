"""根据角色/场景设定解析资产生图提示词（规则 + LLM）。"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models_drama import DramaAsset, DramaProject
from app.services.billing import record_llm_chat_line
from app.services.drama.llm import drama_chat_text
from app.services.llm_client import LlmUnavailableError
from app.services.content_language import truncate_text
from app.services.drama.seed import _episode_bodies
from app.services.drama.seed_asset_params import (
    build_scene_params,
    compose_character_visual_text,
)
from app.services.drama.voice_prompt import find_summary_character

logger = logging.getLogger(__name__)

WEAK_PROMPT_PATTERN = re.compile(
    r"^(character|scene|prop|material|none|image|audio|video)\s+\S+$",
    re.IGNORECASE,
)

# 模板化套话：出现且总长偏短则视为需 AI 重写
GENERIC_TEMPLATE_MARKERS = (
    "影视级写实环境空间",
    "构图层次分明、光影有戏剧张力",
    "适合短剧横屏拍摄",
    "影视级写实人物",
    "白底全身定妆照",
    "材质与氛围清晰，构图简洁",
    "影视级静物/空镜",
)

MIN_PROMPT_LEN: dict[str, int] = {
    "character": 120,
    "scene": 100,
    "prop": 70,
    "material": 70,
}

CHARACTER_VISUAL_SYSTEM = """You are a film character art director writing a visual description for image generation.
Return one detailed paragraph entirely in the original idea's output language; no JSON,
title, quotes or field labels. Describe age, gender, facial features, hair, build, layered
clothing with materials/colors/patterns, accessories, props, posture and expression.
Turn personality and background into visible details. Match the story's setting and style.
The description will be used for a white-background character sheet with front/side/back,
face and half-body views, but do not write layout instructions. Avoid vague praise,
plot summaries and dialogue. Include enough concrete detail for a consistent character."""

SCENE_VISUAL_SYSTEM = """You are a film environment art director writing a location description.
Return one detailed paragraph entirely in the original idea's output language, without
JSON, title or quotes. Describe the space, era, walls/windows/doors, functional areas,
furnishings, materials, lighting, color and mood. Focus on the environment rather than
portraits. Use actions and props from the scene excerpts to make the space filmable.
The result is for an environment reference sheet with elevations and detail views;
describe the location, not the sheet layout. Avoid generic cinematic-quality claims."""

PROP_VISUAL_SYSTEM = """You are a film prop designer. Return one concrete paragraph entirely
in the original idea's output language, without JSON, title or quotes. Describe the
object's form, proportions, layered materials, color, mechanisms, markings, wear and
dramatic significance. It will be used for a white-background multi-view reference sheet;
do not describe its layout or add a person holding the object."""

MATERIAL_VISUAL_SYSTEM = """You are a film atmosphere art director. In the original idea's
output language, describe framing, composition, lighting, color, mood and implied motion
for a 16:9 atmospheric still. Use concrete details, no portraits, title or JSON."""


# 是否命中模板套话且整体偏短
def is_generic_template_prompt(text: str) -> bool:
    stripped = (text or "").strip()
    if len(stripped) >= 180:
        return False
    hits = sum(1 for marker in GENERIC_TEMPLATE_MARKERS if marker in stripped)
    return hits >= 1 or (stripped.startswith("场景：") and len(stripped) < 120)


# 判断当前提示词是否过短、占位或模板化
def is_weak_visual_prompt(prompt: str, asset_name: str, kind: str) -> bool:
    text = (prompt or "").strip()
    kind_lower = (kind or "").strip().lower()
    min_len = MIN_PROMPT_LEN.get(kind_lower, 60)
    if len(text) < min_len:
        return True
    name = (asset_name or "").strip()
    if name and text.lower() in {f"{kind_lower} {name}".lower(), name.lower()}:
        return True
    if WEAK_PROMPT_PATTERN.match(text):
        return True
    if is_generic_template_prompt(text):
        return True
    # 角色若只有「身份：」「标签：」字段堆叠而无足够 visualImage 密度
    if kind_lower == "character" and text.count("：") >= 3 and len(text) < 160:
        label_hits = sum(1 for label in ("身份：", "定位：", "标签：", "性格：", "背景：") if label in text)
        if label_hits >= 2 and "，" not in text[:40]:
            return True
    return False


# 从资产 params 与摘要拼角色上下文
def build_character_visual_context(
    asset: DramaAsset,
    summary_char: dict[str, Any] | None = None,
    summary: dict[str, Any] | None = None,
) -> str:
    params = asset.params if isinstance(asset.params, dict) else {}
    summary_char = summary_char or {}

    def pick(*keys: str) -> str:
        for key in keys:
            raw = params.get(key)
            if raw is None and summary_char:
                raw = summary_char.get(key)
            text = str(raw or "").strip()
            if text:
                return text
        return ""

    lines = [f"角色名：{asset.name or '未命名'}"]
    mapping = [
        ("称谓", pick("title")),
        ("角色类型", pick("roleType")),
        ("核心标签", pick("coreTags")),
        ("身份背景", pick("identityBackground")),
        ("成长经历", pick("growthExperience")),
        ("性格", pick("personality")),
        ("人物关系", pick("relationships")),
        ("成长弧线", pick("growthArc")),
        ("已有外形描述", pick("visualImage", "visualPrompt")),
    ]
    for label, value in mapping:
        if value:
            lines.append(f"{label}：{value}")
    if summary:
        for key, label in (
            ("storyType", "故事类型"),
            ("oneLineStory", "一句话故事"),
            ("coreHook", "核心钩子"),
        ):
            val = str(summary.get(key) or "").strip()
            if val:
                lines.append(f"{label}：{val}")
        syn = str(summary.get("synopsis") or "").strip()
        if syn:
            lines.append(f"故事梗概：{syn[:500]}")
    return "\n".join(lines)


# 从 params + 摘要规则拼接角色生图提示词
def fallback_character_visual_prompt(
    asset: DramaAsset,
    summary_char: dict[str, Any] | None = None,
) -> str:
    params = asset.params if isinstance(asset.params, dict) else {}
    merged = {**(summary_char or {}), **{k: v for k, v in params.items() if v}}
    if asset.name and not merged.get("name"):
        merged["name"] = asset.name
    text = compose_character_visual_text(merged)
    if text:
        return normalize_visual_prompt_text(text)
    return normalize_visual_prompt_text(asset.name or "")


# 从场戏正文提取与场景名相关的摘录
def collect_scene_excerpts(bodies: list[str], scene_name: str, max_chars: int = 3200) -> str:
    target = (scene_name or "").strip()
    if not target:
        return ""
    chunks: list[str] = []
    for body in bodies:
        if target not in body:
            continue
        for block in re.split(r"(?=###\s*(?:场|Scene))", body, flags=re.I):
            head = block[:280]
            if target in head or target in block[:160]:
                snippet = block.strip()
                if len(snippet) > 40:
                    chunks.append(snippet[:1200])
    if not chunks:
        for body in bodies:
            idx = body.find(target)
            if idx >= 0:
                start = max(0, idx - 200)
                chunks.append(body[start : idx + 600].strip())
    return "\n---\n".join(chunks[:5])[:max_chars]


# 规则拼接场景生图提示词
def fallback_scene_visual_prompt(
    asset: DramaAsset,
    summary: dict[str, Any] | None,
    episode_bodies: list[str] | None = None,
) -> str:
    story_type = str((summary or {}).get("storyType") or "").strip()
    base = build_scene_params(asset.name or "场景", story_type)["visualPrompt"]
    excerpt = collect_scene_excerpts(episode_bodies or [], asset.name or "")
    if excerpt:
        return normalize_visual_prompt_text(f"{base}\n{truncate_text(excerpt, 400)}")
    return normalize_visual_prompt_text(base)


# 清洗 LLM 输出
def normalize_visual_prompt_text(raw: str) -> str:
    text = (raw or "").strip()
    text = re.sub(r"^[\"'「『]|[\"'」』]$", "", text).strip()
    text = re.sub(r"^(视觉形象描述|环境描述|道具描述)[:：]\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return truncate_text(text, 680)


# 合并规则稿与 LLM 稿，避免过短
def merge_visual_prompts(rule_prompt: str, llm_prompt: str, *, min_len: int = 100) -> str:
    rule = normalize_visual_prompt_text(rule_prompt)
    llm = normalize_visual_prompt_text(llm_prompt)
    if len(llm) >= min_len and not is_generic_template_prompt(llm):
        return llm
    if rule and llm:
        merged = normalize_visual_prompt_text(f"{llm}。{rule}" if len(llm) < len(rule) else f"{rule}。{llm}")
        if len(merged) >= min_len:
            return merged
    return llm or rule


async def _llm_visual_prompt(
    system: str,
    user: str,
    *,
    min_len: int = 80,
    db: AsyncSession | None = None,
    user_id: int | None = None,
    drama_project_id: int | None = None,
    language_source: str | None = None,
) -> str:
    raw = await drama_chat_text(system, user, temperature=0.6, max_tokens=1024, language_source=language_source)
    prompt = normalize_visual_prompt_text(raw)
    if db is not None and user_id is not None:
        await record_llm_chat_line(
            db,
            user_id=user_id,
            domain="drama",
            drama_project_id=drama_project_id,
        )
    return prompt if len(prompt) >= min_len else ""


async def resolve_visual_prompt_for_asset(
    asset: DramaAsset,
    project: DramaProject,
    incoming_prompt: str | None = None,
    *,
    force_refresh: bool = False,
    strict_llm: bool = False,
    db: AsyncSession | None = None,
) -> str:
    """解析资产生图用的用户描述（过短/模板化则规则 + LLM 补全）。"""
    kind = (asset.type or "character").lower()
    name = asset.name or ""
    params = asset.params if isinstance(asset.params, dict) else {}
    stored = str(
        params.get("visualPrompt") or params.get("visualImage") or incoming_prompt or ""
    ).strip()

    summary: dict[str, Any] | None = None
    if project.script and isinstance(project.script.summary, dict):
        summary = project.script.summary
    bodies = _episode_bodies(project.script.episode_content) if project.script else []

    if not force_refresh and stored and not is_weak_visual_prompt(stored, name, kind):
        return stored

    min_len = MIN_PROMPT_LEN.get(kind, 80)
    llm_bill = {
        "db": db, "user_id": project.user_id, "drama_project_id": project.id,
        "language_source": (project.script.source if project.script else None) or incoming_prompt or stored or name,
    }

    if kind == "character":
        summary_char = find_summary_character(summary, name)
        rule_prompt = fallback_character_visual_prompt(asset, summary_char)

        context = build_character_visual_context(asset, summary_char, summary)
        style_id = str((project.params or {}).get("image_style_id") or "").strip()
        if style_id:
            context += f"\n项目画面风格 ID：{style_id}"
        try:
            llm = await _llm_visual_prompt(
                CHARACTER_VISUAL_SYSTEM,
                f"请为以下角色生成视觉形象描述：\n\n{context}",
                min_len=80,
                **llm_bill,
            )
            prompt = merge_visual_prompts(rule_prompt, llm, min_len=min_len)
            if len(prompt) >= min_len or len(prompt) >= 80:
                return prompt
            if strict_llm:
                raise RuntimeError(f'AI prompt for character “{name}” is too short ({len(prompt)} characters)')
        except LlmUnavailableError:
            raise
        except Exception as exc:
            if strict_llm:
                raise RuntimeError(f'Failed to generate AI prompt for character “{name}”') from exc
            logger.exception("角色视觉提示词 LLM 失败 asset_id=%s", asset.id)
        return rule_prompt

    if kind == "scene":
        rule_prompt = fallback_scene_visual_prompt(asset, summary, bodies)

        excerpt = collect_scene_excerpts(bodies, name)
        story_bits = []
        if summary:
            story_bits.append(f"故事类型：{summary.get('storyType') or ''}")
            story_bits.append(f"一句话：{summary.get('oneLineStory') or ''}")
            syn = str(summary.get("synopsis") or "").strip()
            if syn:
                story_bits.append(f"梗概：{syn[:500]}")
        user_msg = "\n".join(
            [
                f"场景名：{name}",
                *story_bits,
                f"场戏摘录：\n{excerpt}" if excerpt else "（暂无场戏摘录，请根据场景名与故事类型合理补全）",
            ]
        )
        try:
            llm = await _llm_visual_prompt(SCENE_VISUAL_SYSTEM, user_msg, min_len=80, **llm_bill)
            prompt = merge_visual_prompts(rule_prompt, llm, min_len=min_len)
            if len(prompt) >= min_len or len(prompt) >= 80:
                return prompt
            if strict_llm:
                raise RuntimeError(f'AI prompt for scene “{name}” is too short ({len(prompt)} characters)')
        except LlmUnavailableError:
            raise
        except Exception as exc:
            if strict_llm:
                raise RuntimeError(f'Failed to generate AI prompt for scene “{name}”') from exc
            logger.exception("场景视觉提示词 LLM 失败 asset_id=%s", asset.id)
        return rule_prompt

    if kind in {"prop", "material", "none"}:
        rule_prompt = stored or normalize_visual_prompt_text(name)

        system = PROP_VISUAL_SYSTEM if kind == "prop" else MATERIAL_VISUAL_SYSTEM
        ctx = f"名称：{name}\n"
        if summary:
            ctx += f"故事类型：{summary.get('storyType') or ''}\n"
        if stored:
            ctx += f"已有描述：{stored}\n"
        excerpt = collect_scene_excerpts(bodies, name)
        if excerpt:
            ctx += f"剧本相关摘录：\n{excerpt[:800]}"
        try:
            llm = await _llm_visual_prompt(system, ctx, min_len=60, **llm_bill)
            prompt = merge_visual_prompts(rule_prompt, llm, min_len=min_len)
            if len(prompt) >= 60:
                return prompt
            if strict_llm:
                raise RuntimeError(f'AI prompt for “{name}” is too short ({len(prompt)} characters)')
        except LlmUnavailableError:
            raise
        except Exception as exc:
            if strict_llm:
                raise RuntimeError(f'Failed to generate AI prompt for “{name}”') from exc
            logger.exception("%s 视觉提示词 LLM 失败 asset_id=%s", kind, asset.id)
        return rule_prompt

    if stored and len(stored) >= min_len:
        return stored
    return normalize_visual_prompt_text(name)
