"""根据角色设定生成音色描述提示词（供 TTS / Seedance reference_audio）。"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.models_drama import DramaAsset, DramaProject
from app.services.drama.llm import drama_chat_text
from app.services.content_language import truncate_text
from app.services.voices import infer_drama_speaker_from_prompt

logger = logging.getLogger(__name__)

VOICE_PROMPT_SYSTEM = """You are a voice casting director for a short film.
Return one concise voice description for TTS and video reference audio.
Use the original idea's output language throughout, without JSON, a title or quotes.
Describe perceived age and gender, vocal texture (clear, low, husky, youthful), pace,
articulation, tone and emotional baseline. Match the character's identity, personality
and story genre. Write casting guidance, not dialogue or a plot synopsis.
Every phrase in the description must be in the selected output language."""

WHITESPACE_PATTERN = re.compile(r"\s+")


# 从剧本摘要中按名称查找角色
def find_summary_character(summary: dict[str, Any] | None, name: str) -> dict[str, Any] | None:
    if not summary or not name:
        return None
    target = name.strip()
    for ch in summary.get("characters") or []:
        if isinstance(ch, dict) and str(ch.get("name") or "").strip() == target:
            return ch
    return None


# 合并资产 params 与摘要字段，组装 LLM 输入
def build_character_voice_context(
    asset: DramaAsset,
    summary_char: dict[str, Any] | None = None,
) -> str:
    params = asset.params if isinstance(asset.params, dict) else {}
    summary = summary_char or {}

    def pick(*keys: str) -> str:
        for key in keys:
            raw = params.get(key)
            if raw is None and summary:
                raw = summary.get(key)
            text = str(raw or "").strip()
            if text:
                return text
        return ""

    lines = [f"Character name: {asset.name or 'Unnamed'}"]
    mapping = [
        ("Title", pick("title")),
        ("Role", pick("roleType")),
        ("Tags", pick("coreTags")),
        ("Background", pick("identityBackground")),
        ("Experience", pick("growthExperience")),
        ("Personality", pick("personality")),
        ("Relationships", pick("relationships")),
        ("Growth arc", pick("growthArc")),
        ("Appearance", pick("visualImage", "visualPrompt")),
        ("Introduction", pick("introText", "intro")),
    ]
    for label, value in mapping:
        if value:
            lines.append(f"{label}：{value}")
    return "\n".join(lines)


# 清洗 LLM 输出的音色描述
def normalize_voice_prompt_text(raw: str) -> str:
    text = (raw or "").strip()
    text = re.sub(r"^[\"'「『]|[\"'」』]$", "", text).strip()
    text = WHITESPACE_PATTERN.sub(" ", text)
    return truncate_text(text, 300)


# 无 LLM 时的规则兜底
def fallback_voice_prompt(asset: DramaAsset, summary_char: dict[str, Any] | None = None) -> str:
    params = asset.params if isinstance(asset.params, dict) else {}
    summary = summary_char or {}
    # Reuse authored descriptions rather than inventing a Chinese voice profile.
    return "\n".join(str(params.get(key) or summary.get(key) or "").strip()
                     for key in ("voicePrompt", "personality", "roleType", "visualImage")
                     if params.get(key) or summary.get(key)) or (asset.name or "")


async def suggest_voice_prompt_for_character(
    asset: DramaAsset,
    project: DramaProject,
) -> tuple[str, str, str]:
    """根据角色资产与剧本摘要生成音色描述、推荐 speaker 与试听台词。"""
    summary = None
    if project.script and isinstance(project.script.summary, dict):
        summary = project.script.summary
    summary_char = find_summary_character(summary, asset.name or "")
    context = build_character_voice_context(asset, summary_char)

    logger.info(
        "生成音色提示词 project_id=%s asset_id=%s name=%s context_len=%s",
        project.id,
        asset.id,
        asset.name,
        len(context),
    )
    raw = await drama_chat_text(
        VOICE_PROMPT_SYSTEM,
        f"Describe a suitable voice for this character:\n\n{context}",
        temperature=0.6,
        max_tokens=512,
        language_source=(project.script.source if project.script else None) or context,
    )
    prompt = normalize_voice_prompt_text(raw)
    if len(prompt) < 8:
        raise ValueError("The voice description model returned no usable content. Please try again")
    name = asset.name or 'Role'
    speaker = infer_drama_speaker_from_prompt(prompt, character_name=name, asset_id=asset.id)
    sample_text = truncate_text(prompt, 240)
    return prompt, speaker, sample_text
