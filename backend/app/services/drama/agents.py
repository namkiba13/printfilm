"""Drama script agents: summary + episode outline + episode scripts."""

from __future__ import annotations

from typing import Any

from app.services.drama.llm import drama_chat_json
from app.services.content_language import truncate_text
from app.services.drama.script_summary_prompt import (
    SCRIPT_SUMMARY_SYSTEM_PROMPT,
    build_script_summary_user_message,
)

# 正文过短阈值（汉字量近似用去空白后长度）
MIN_EPISODE_CONTENT_CHARS = 450
# 短剧单集目标篇幅（约 1–1.5 分钟成片，对应 6–10 镜）
TARGET_EPISODE_CONTENT_CHARS = 550
EPISODE_SCENE_COUNT_HINT = "2-3 场"
# 手动加集标记；自动流水线不会填这些空集
MANUAL_EPISODE_ORIGIN = "manual"
# 与创建项目上限对齐
MAX_DRAMA_EPISODES = 120

# 与 manju episodeScript 对齐：先规划全集集名
EPISODE_OUTLINE_SYSTEM = """Plan the complete episode outline from the original idea and story summary.
Return exactly the requested number of episodes, numbered consecutively from 1.
Each title must be a short, complete phrase in the original idea's output language.
Cover the setup, escalating conflict, turning points, climax and ending. Connect adjacent
episodes causally and avoid repetitive hooks. Preserve established names.
Return only JSON: {"episodes":[{"episodeNumber":1,"title":"..."}]}"""

EPISODE_BODY_FORMAT = """
Screenplay format for each content string:
1. Use 2–3 scenes, headed '### Scene {episode}-{scene}', for example '### Scene 1-2'.
2. Next line: DAY/NIGHT/DAWN followed by INT or EXT and the location name.
3. Next line: 'Cast: name, name'. Include on-screen characters only, using their full established names.
4. Start each action line with △. Describe concrete framing, blocking, props and expressions.
5. Dialogue: 'Character name (emotion/vo/os): spoken words'. Use vo for voiceover and os for inner monologue.
6. Optional visual-only lines start 'Establishing Shot:' or 'Wide Shot:'. Do not read these as narration.
7. Do not repeat the episode title inside content. Write a full filmable episode, not a synopsis.
8. Include 2–3 action beats and 2–3 lines of dialogue per scene. Keep it concise but at least
   450 characters overall, targeting 60–90 seconds of screen time without padding.
9. Keep the machine labels Scene, Cast, DAY/NIGHT, INT/EXT, △, vo/os as written.
   All actual titles, descriptions and spoken content follow the original idea's output language.
Return only a JSON object, never a bare array or Markdown fence.
"""

EPISODE_BATCH_CONTENT_SYSTEM = """Write the requested batch of complete episode screenplays.
Return only the requested episode numbers, with no omissions or extras. Use the original
idea, summary, full episode plan and previous scripts to preserve continuity. End the batch
with a suitable hook. Include a brief creative idea and plot summary for each episode.
JSON: {"episodes":[{"episodeNumber":1,"title":"...","creative":"...","summary":"...","content":"..."}]}
""" + EPISODE_BODY_FORMAT

EPISODE_OPTIMIZE_SYSTEM = """Turn the author's episode draft into a filmable screenplay.
Preserve characters, conflicts, scene intentions and key dialogue. If the draft is already
a screenplay, improve structure rather than inventing another story. If it is an outline,
expand its events into complete scenes. Respect the series context and adjacent episodes.
Return exactly one requested episode: {"episodes":[{"episodeNumber":1,"title":"...","content":"..."}]}
""" + EPISODE_BODY_FORMAT

EPISODE_SUMMARY_FROM_CREATIVE_SYSTEM = """Write a plot summary for the single requested episode.
Use its original idea plus the series context and adjacent episodes. Describe characters,
conflict, turning point and ending hook in one substantial paragraph, not screenplay form.
Preserve established character names; give full names for new characters. You may improve
the short episode title. Use the original idea's output language throughout.
Return only JSON: {"episodes":[{"episodeNumber":1,"title":"...","summary":"..."}]}
Do not return content/body."""

EPISODE_BODY_FROM_BRIEF_SYSTEM = """Write a complete filmable screenplay for the single requested episode.
Follow its idea and summary rather than starting a different story. Preserve continuity
with the series context and adjacent episodes. Use established character names and introduce
any new character by full name in the cast list.
Return {"episodes":[{"episodeNumber":1,"title":"...","content":"..."}]} with exactly one episode.
""" + EPISODE_BODY_FORMAT

EPISODE_BRIEF_FROM_BODY_SYSTEM = """Infer a concise original idea and plot summary from the supplied episode screenplay.
Stay faithful to its existing events. The creative field explains the starting situation,
central conflict and hook; summary covers characters, conflict, turning point and ending.
Use the original idea's output language. You may improve the short title, but do not rewrite
or return content/body. Return exactly one requested episode in this JSON object:
{"episodes":[{"episodeNumber":1,"title":"...","creative":"...","summary":"..."}]}"""


def _format_neighbor_episode_briefs(episodes: list[dict[str, Any]], number: int, limit: int = 3) -> str:
    """邻集标题/创意/摘要，作正文节选的补充。"""
    others = [
        item
        for item in episodes
        if isinstance(item, dict) and int(item.get("episodeNumber") or 0) != number
    ]
    others.sort(key=lambda x: abs(int(x.get("episodeNumber") or 0) - number))
    picked = others[:limit]
    if not picked:
        return '(No adjacent episodes available)'
    blocks: list[str] = []
    for item in sorted(picked, key=lambda x: int(x.get("episodeNumber") or 0)):
        num = item.get("episodeNumber")
        title = item.get("title") or f'Episode {num}'
        creative = str(item.get("creative") or "").strip()
        summary = str(item.get("summary") or "").strip()
        parts = [f'Episode {num} "{title}"']
        if creative:
            parts.append(f'Idea: {creative[:400]}')
        if summary:
            parts.append(f'Summary: {summary[:500]}')
        blocks.append("\n".join(parts))
    return "\n\n".join(blocks)


def _format_neighbor_episode_bodies(
    episodes: list[dict[str, Any]],
    number: int,
    limit: int = 3,
) -> str:
    """与 batch 同级：取距当前集最近、且已有正文的若干集节选。"""
    others = [
        item
        for item in episodes
        if isinstance(item, dict)
        and int(item.get("episodeNumber") or 0) != number
        and str(item.get("body") or item.get("content") or "").strip()
    ]
    others.sort(key=lambda x: abs(int(x.get("episodeNumber") or 0) - number))
    picked = others[:limit]
    if not picked:
        return '(No adjacent episode content available)'
    blocks: list[str] = []
    for item in sorted(picked, key=lambda x: int(x.get("episodeNumber") or 0)):
        num = item.get("episodeNumber")
        title = item.get("title") or f'Episode {num}'
        body = str(item.get("body") or item.get("content") or "").strip()
        if len(body) > 1800:
            body = body[:1800] + '\n…(Content above truncated)'
        blocks.append(f"{num}.{title}：\n{body}")
    return "\n\n".join(blocks)


def format_character_asset_names_line(names: list[str] | None) -> str:
    """定妆角色名一行，供单集 prompt 约束称呼。"""
    cleaned: list[str] = []
    for raw in names or []:
        name = str(raw or "").strip()
        if name and name not in cleaned:
            cleaned.append(name)
    if not cleaned:
        return '(No finalized character assets available; new characters must have their full names clearly specified in the cast list.)'
    joined = "、".join(cleaned[:80])
    return f"Prioritize using these established character names: {joined}; write each new character's full name in the cast list"


def build_single_episode_context(
    project_summary: dict[str, Any],
    existing: list[dict[str, Any]],
    number: int,
    *,
    project_source: str = "",
    character_asset_names: list[str] | None = None,
) -> list[str]:
    """单集 summary/body/full/brief/optimize 共用的厚上下文块。"""
    return [
        f"整剧原始创意：\n{(project_source or '').strip() or '（无）'}",
        f"全剧剧本摘要：\n{format_summary_text(project_summary)}",
        f"全剧分集规划：\n{_format_episode_title_list(existing)}",
        f"邻集正文（近 {3} 集节选）：\n{_format_neighbor_episode_bodies(existing, number)}",
        f"邻集创意/摘要补充：\n{_format_neighbor_episode_briefs(existing, number)}",
        f"已有定妆角色名：\n{format_character_asset_names_line(character_asset_names)}",
    ]


async def run_episode_summary_from_creative(
    project_summary: dict[str, Any],
    existing: list[dict[str, Any]],
    number: int,
    creative: str,
    *,
    project_source: str = "",
    title: str | None = None,
    character_asset_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """本集创意 → 集级 summary（可更新 title）。"""
    brief = (creative or "").strip()
    if len(brief) < 20:
        raise ValueError('The original idea for this episode must be at least 20 characters')
    title_text = (title or "").strip() or f"第 {number} 集"
    user_parts = [
        *build_single_episode_context(
            project_summary,
            existing,
            number,
            project_source=project_source,
            character_asset_names=character_asset_names,
        ),
        f"当前集号：{number}",
        f"当前集名：{title_text}",
        f"本集原始创意：\n{brief}",
        "请只输出本集 title 与 summary。",
    ]
    data = await drama_chat_json(
        EPISODE_SUMMARY_FROM_CREATIVE_SYSTEM,
        "\n\n".join(user_parts),
        max_tokens=4096,
        language_source=project_source or brief,
    )
    episodes = data.get("episodes") if isinstance(data, dict) else None
    if not isinstance(episodes, list) or not episodes:
        raise ValueError('The model did not return a summary for this episode')
    item = episodes[0] if isinstance(episodes[0], dict) else {}
    out_summary = str(item.get("summary") or item.get("synopsis") or "").strip()
    if len(out_summary) < 40:
        raise ValueError('The episode summary is too short. Please try again')
    out_title = str(item.get("title") or "").strip() or title_text
    return [
        {
            "episodeNumber": number,
            "title": out_title,
            "creative": brief,
            "summary": out_summary,
            "body": "",
        }
    ]


async def run_episode_body_from_brief(
    project_summary: dict[str, Any],
    existing: list[dict[str, Any]],
    number: int,
    *,
    creative: str,
    summary: str,
    project_source: str = "",
    title: str | None = None,
    character_asset_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """本集创意+摘要 → 拍摄正文 body。"""
    brief = (creative or "").strip()
    syn = (summary or "").strip()
    if len(brief) < 10 and len(syn) < 40:
        raise ValueError('Please enter the idea or summary for this episode first')
    title_text = (title or "").strip() or f"第 {number} 集"
    user_parts = [
        *build_single_episode_context(
            project_summary,
            existing,
            number,
            project_source=project_source,
            character_asset_names=character_asset_names,
        ),
        f"当前集号：{number}",
        f"当前集名：{title_text}",
        f"本集原始创意：\n{brief or '（无，以摘要为准）'}",
        f"本集剧情摘要：\n{syn or '（无，以创意为准）'}",
        "请撰写本集拍摄正文 content。",
    ]
    data = await drama_chat_json(
        EPISODE_BODY_FROM_BRIEF_SYSTEM,
        "\n\n".join(user_parts),
        max_tokens=8192,
        language_source=project_source or brief or syn,
    )
    episodes = data.get("episodes") if isinstance(data, dict) else None
    if not isinstance(episodes, list):
        raise ValueError('The model did not return the body of this episode')
    title_by_num = {number: title_text}
    normalized = _normalize_batch_episodes(episodes, number, number, title_by_num)
    if not normalized:
        raise ValueError(f'The model did not return the body for Episode {number}')
    row = normalized[0]
    row["creative"] = brief or str(row.get("creative") or "")
    row["summary"] = syn or str(row.get("summary") or "")
    if _content_char_len(str(row.get("body") or "")) < MIN_EPISODE_CONTENT_CHARS:
        # 短则再试一次强调长度
        retry = await drama_chat_json(
            EPISODE_BODY_FROM_BRIEF_SYSTEM,
            "\n\n".join(
                user_parts
                + [
                    f"The previous draft was too short. Expand to at least {MIN_EPISODE_CONTENT_CHARS} characters in the same output language; "
                    f"含 {EPISODE_SCENE_COUNT_HINT}、每场 2-3 段 △ 与 2-3 句台词，仍只输出第 {number} 集。"
                ]
            ),
            max_tokens=8192,
            language_source=project_source or brief or syn,
        )
        retry_eps = retry.get("episodes") if isinstance(retry, dict) else None
        if isinstance(retry_eps, list):
            normalized = _normalize_batch_episodes(retry_eps, number, number, title_by_num) or normalized
            row = normalized[0]
            row["creative"] = brief or str(row.get("creative") or "")
            row["summary"] = syn or str(row.get("summary") or "")
    return [row]


async def run_episode_full_from_creative(
    project_summary: dict[str, Any],
    existing: list[dict[str, Any]],
    number: int,
    creative: str,
    *,
    project_source: str = "",
    title: str | None = None,
    character_asset_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """创意 → 摘要 → 正文（一键整集）。"""
    summary_rows = await run_episode_summary_from_creative(
        project_summary,
        existing,
        number,
        creative,
        project_source=project_source,
        title=title,
        character_asset_names=character_asset_names,
    )
    syn_row = summary_rows[0]
    body_rows = await run_episode_body_from_brief(
        project_summary,
        existing,
        number,
        creative=str(syn_row.get("creative") or creative),
        summary=str(syn_row.get("summary") or ""),
        project_source=project_source,
        title=str(syn_row.get("title") or title or ""),
        character_asset_names=character_asset_names,
    )
    out = body_rows[0]
    out["creative"] = str(syn_row.get("creative") or creative).strip()
    out["summary"] = str(syn_row.get("summary") or "").strip()
    out["title"] = str(out.get("title") or syn_row.get("title") or title or f"第 {number} 集")
    return [out]


async def run_episode_brief_from_body(
    project_summary: dict[str, Any],
    existing: list[dict[str, Any]],
    number: int,
    body: str,
    *,
    project_source: str = "",
    title: str | None = None,
    character_asset_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """已有拍摄正文 → 反推本集 creative + summary（不改 body）。"""
    script_body = (body or "").strip()
    if len(script_body) < 80:
        raise ValueError('The episode script is too short to infer the idea and summary')
    title_text = (title or "").strip() or f"第 {number} 集"
    user_parts = [
        *build_single_episode_context(
            project_summary,
            existing,
            number,
            project_source=project_source,
            character_asset_names=character_asset_names,
        ),
        f"当前集号：{number}",
        f"当前集名：{title_text}",
        f"本集拍摄正文：\n{script_body[:12000]}",
        "请只输出本集 title、creative、summary；不要改写正文。",
    ]
    data = await drama_chat_json(
        EPISODE_BRIEF_FROM_BODY_SYSTEM,
        "\n\n".join(user_parts),
        max_tokens=4096,
        language_source=project_source or script_body,
    )
    episodes = data.get("episodes") if isinstance(data, dict) else None
    if not isinstance(episodes, list) or not episodes:
        raise ValueError('The model did not return the episode idea and summary')
    item = episodes[0] if isinstance(episodes[0], dict) else {}
    out_creative = str(item.get("creative") or "").strip()
    out_summary = str(item.get("summary") or item.get("synopsis") or "").strip()
    if len(out_creative) < 20:
        raise ValueError('The inferred episode idea is too short. Please try again')
    if len(out_summary) < 40:
        raise ValueError('The inferred episode summary is too short. Please try again')
    out_title = str(item.get("title") or "").strip() or title_text
    return [
        {
            "episodeNumber": number,
            "title": out_title,
            "creative": out_creative,
            "summary": out_summary,
            "body": script_body,
        }
    ]


async def run_script_summary(
    creative: str,
    episode_count: int | None = None,
    image_style_id: str | None = None,
) -> dict[str, Any]:
    # Build structured outline from creative brief
    trimmed = (creative or "").strip()
    if len(trimmed) < 10:
        raise ValueError('The original idea must be at least 10 characters')

    user_message = build_script_summary_user_message(
        trimmed,
        episode_count=episode_count,
        image_style_id=image_style_id,
    )
    data = await drama_chat_json(
        SCRIPT_SUMMARY_SYSTEM_PROMPT,
        user_message,
        max_tokens=8192,
        language_source=trimmed,
    )
    if episode_count:
        data["episodeCount"] = episode_count
    return data


def resolve_episode_target(
    summary: dict[str, Any] | None,
    project_params: dict[str, Any] | None = None,
    script_params: dict[str, Any] | None = None,
) -> int:
    # 解析目标总集数：优先项目创建时的集数，其次摘要 / 剧本参数
    candidates = [
        (project_params or {}).get("episode_count"),
        (summary or {}).get("episodeCount"),
        (script_params or {}).get("episode_count"),
    ]
    for raw in candidates:
        try:
            value = int(raw)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        if value >= 1:
            return value
    return 12


def merge_episode_bodies(
    existing: list[dict[str, Any]],
    batch: list[dict[str, Any]],
    prefer_incoming: bool = False,
) -> list[dict[str, Any]]:
    # 按集号合并；默认更长文本优先，prefer_incoming 时以后写入为准（空值回退保留旧值）
    by_number: dict[int, dict[str, Any]] = {}
    for item in existing + batch:
        if not isinstance(item, dict):
            continue
        try:
            number = int(item.get("episodeNumber") or item.get("episode_number") or 0)
        except (TypeError, ValueError):
            continue
        if number < 1:
            continue
        body = str(item.get("body") or item.get("content") or "")
        creative = str(item.get("creative") or "").strip()
        summary = str(item.get("summary") or item.get("synopsis") or "").strip()
        title = str(item.get("title") or "").strip() or f'Episode {number}'
        prev = by_number.get(number)
        if prev:
            prev_body = str(prev.get("body") or "")
            prev_creative = str(prev.get("creative") or "").strip()
            prev_summary = str(prev.get("summary") or "").strip()
            if prefer_incoming:
                body = body if body.strip() else prev_body
                creative = creative or prev_creative
                summary = summary or prev_summary
            else:
                if len(prev_body.strip()) > len(body.strip()):
                    body = prev_body
                if len(prev_creative) > len(creative):
                    creative = prev_creative
                if len(prev_summary) > len(summary):
                    summary = prev_summary
                if not creative:
                    creative = prev_creative
                if not summary:
                    summary = prev_summary
            if title.startswith("第 ") and prev.get("title"):
                title = str(prev.get("title"))
            elif not title or title == f"第 {number} 集":
                title = str(prev.get("title") or title)
        new_origin = str(item.get("origin") or "").strip()
        prev_origin = str(prev.get("origin") or "").strip() if prev else ""
        origin = new_origin or prev_origin
        merged: dict[str, Any] = {
            "episodeNumber": number,
            "title": title,
            "body": body,
        }
        if creative:
            merged["creative"] = creative
        if summary:
            merged["summary"] = summary
        if origin == MANUAL_EPISODE_ORIGIN:
            merged["origin"] = MANUAL_EPISODE_ORIGIN
        by_number[number] = merged
    return [by_number[n] for n in sorted(by_number)]


def auto_missing_episode_numbers(existing: list[dict[str, Any]], total: int) -> list[int]:
    """自动流水线待填集号：跳过手动加集且正文未达标的空集。"""
    by_num: dict[int, dict[str, Any]] = {}
    for item in existing:
        if not isinstance(item, dict):
            continue
        try:
            number = int(item.get("episodeNumber") or 0)
        except (TypeError, ValueError):
            continue
        if number >= 1:
            by_num[number] = item
    missing: list[int] = []
    target = max(int(total or 0), 0)
    for number in range(1, target + 1):
        item = by_num.get(number)
        if item is None:
            missing.append(number)
            continue
        body = str(item.get("body") or item.get("content") or "")
        if _content_char_len(body) >= MIN_EPISODE_CONTENT_CHARS:
            continue
        if str(item.get("origin") or "") == MANUAL_EPISODE_ORIGIN:
            continue
        missing.append(number)
    return missing


def append_manual_episode(
    existing: list[dict[str, Any]],
    title: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """在已有分集后追加一集空的手动集，返回 (新列表, 新集号)。"""
    max_number = 0
    for item in existing:
        if not isinstance(item, dict):
            continue
        try:
            number = int(item.get("episodeNumber") or 0)
        except (TypeError, ValueError):
            continue
        if number > max_number:
            max_number = number
    next_number = max_number + 1
    if next_number < 1:
        next_number = 1
    if next_number > MAX_DRAMA_EPISODES:
        raise ValueError(f'Up to {MAX_DRAMA_EPISODES} episodes')
    title_text = (title or "").strip() or f"第 {next_number} 集"
    added = {
        "episodeNumber": next_number,
        "title": title_text,
        "creative": "",
        "summary": "",
        "body": "",
        "origin": MANUAL_EPISODE_ORIGIN,
    }
    merged = merge_episode_bodies(existing, [added])
    return merged, next_number


def count_completed_episodes(episodes: list[dict[str, Any]], total: int) -> int:
    # 统计 1..total 中正文达到质量阈值的集数
    done = 0
    for item in episodes:
        try:
            number = int(item.get("episodeNumber") or 0)
        except (TypeError, ValueError):
            continue
        body = str(item.get("body") or "").strip()
        if 1 <= number <= total and _content_char_len(body) >= MIN_EPISODE_CONTENT_CHARS:
            done += 1
    return done


def _content_char_len(text: str) -> int:
    return len("".join((text or "").split()))


def normalize_series_title(raw: str | None) -> str:
    """清洗 AI 输出的剧名，去掉书名号/引号与过长尾巴。"""
    title = str(raw or "").strip()
    if not title:
        return ""
    title = title.strip("「」『』《》\"'“”‘’").strip()
    title = title.splitlines()[0].strip()
    return truncate_text(title, 80 if " " in title else 24).rstrip("，。；、…·-— ")


def pick_auto_project_title(
    summary: dict[str, Any],
    *,
    creative: str,
    current_title: str,
) -> str | None:
    """摘要完成后：优先用 AI 剧名覆盖「创意截断/过长」默认标题；用户已改名则不覆盖。"""
    series = normalize_series_title(
        summary.get("seriesTitle") or summary.get("title") or summary.get("projectTitle")
    )
    if not series:
        return None
    current = (current_title or "").strip()
    creative_prefix = (creative or "").strip()[:20]
    looks_default = (
        not current
        or current in {"未命名漫剧", "自由画布项目", "Untitled AI Drama", "Free Canvas Project"}
        or len(current) > 36
        or (creative_prefix and current.startswith(creative_prefix))
        or current.endswith("…")
    )
    if not looks_default:
        return None
    return series


def format_summary_text(summary: dict[str, Any]) -> str:
    # Human-readable outline for UI / LLM context
    lines = [
        f"Series title: {summary.get('seriesTitle', '')}",
        f"Episode count: {summary.get('episodeCount', '')}",
        f"Genre: {summary.get('storyType', '')}",
        f"Target audience: {summary.get('targetAudience', '')}",
        f"Hook: {summary.get('coreHook', '')}",
        f"One-liner: {summary.get('oneLineStory', '')}",
        "",
        'Characters:',
    ]
    for c in summary.get("characters") or []:
        if isinstance(c, dict):
            lines.append(
                f"- {c.get('name', '')} ({c.get('roleType', '')}/{c.get('title', '')}): {c.get('visualImage', '')}; Tags: {c.get('coreTags', '')}; Arc: {c.get('growthArc', '')}"
            )
    lines.extend(["", 'Synopsis:', str(summary.get("synopsis") or "")])
    return "\n".join(lines)


def _format_episode_title_list(episodes: list[dict[str, Any]]) -> str:
    rows: list[str] = []
    for item in sorted(episodes, key=lambda x: int(x.get("episodeNumber") or 0)):
        num = item.get("episodeNumber")
        title = item.get("title") or f'Episode {num}'
        rows.append(f'Episode {num}: {title}')
    return "\n".join(rows) if rows else '(No episode plan available)'


def _format_existing_episode_content(episodes: list[dict[str, Any]], limit: int = 3) -> str:
    # 仅附最近若干集正文，控制上下文长度
    completed = [
        item
        for item in episodes
        if isinstance(item, dict) and str(item.get("body") or item.get("content") or "").strip()
    ]
    completed.sort(key=lambda x: int(x.get("episodeNumber") or 0))
    if not completed:
        return '(None available; start from the opening for this batch)'
    tail = completed[-limit:]
    blocks: list[str] = []
    for item in tail:
        num = item.get("episodeNumber")
        title = item.get("title") or f'Episode {num}'
        body = str(item.get("body") or item.get("content") or "").strip()
        # 过长时截断尾部摘要，避免挤占当前集生成空间
        if len(body) > 1800:
            body = body[:1800] + '\n…(Content above truncated)'
        blocks.append(f"{num}.{title}：\n{body}")
    return "\n\n".join(blocks)


def _titles_ready(existing: list[dict[str, Any]], total: int) -> bool:
    titled = {
        int(item.get("episodeNumber") or 0)
        for item in existing
        if isinstance(item, dict)
        and str(item.get("title") or "").strip()
        and not str(item.get("title") or "").startswith("第 ")
    }
    # 也接受「第 N 集」以外、或至少有 total 条带 title 的记录
    with_title = [
        item
        for item in existing
        if isinstance(item, dict)
        and 1 <= int(item.get("episodeNumber") or 0) <= total
        and str(item.get("title") or "").strip()
    ]
    if len(with_title) >= total:
        # 若全是占位「第 N 集」则仍需重跑大纲
        placeholder_only = all(
            str(item.get("title") or "").strip() in {f"第 {item.get('episodeNumber')} 集", f"第{item.get('episodeNumber')}集"}
            for item in with_title
        )
        return not placeholder_only
    return len(titled) >= total


async def run_episode_outline(
    creative: str,
    summary: dict[str, Any],
    episode_count: int,
) -> list[dict[str, Any]]:
    # 生成全集集名大纲
    summary_text = format_summary_text(summary)
    user = "\n".join(
        [
            f"总集数：{episode_count} 集（episodes 数组必须恰好 {episode_count} 项）",
            "",
            f"原始创意：\n{(creative or '').strip()}",
            "",
            f"剧本摘要：\n{summary_text}",
            "",
            "请输出全部分集的 episodeNumber 与 title。",
        ]
    )
    data = await drama_chat_json(EPISODE_OUTLINE_SYSTEM, user, max_tokens=4096, language_source=creative or summary_text)
    episodes = data.get("episodes") if isinstance(data, dict) else data
    if not isinstance(episodes, list) or not episodes:
        raise ValueError('Invalid episode outline response format')
    result: list[dict[str, Any]] = []
    for i, item in enumerate(episodes):
        if not isinstance(item, dict):
            continue
        try:
            number = int(item.get("episodeNumber") or (i + 1))
        except (TypeError, ValueError):
            number = i + 1
        title = str(item.get("title") or "").strip() or f'Episode {number}'
        result.append({"episodeNumber": number, "title": title, "body": ""})
    if len(result) < episode_count:
        # 补齐缺失集号
        have = {int(x["episodeNumber"]) for x in result}
        for n in range(1, episode_count + 1):
            if n not in have:
                result.append({"episodeNumber": n, "title": f'Episode {n}', "body": ""})
    result.sort(key=lambda x: int(x["episodeNumber"]))
    return result[:episode_count]


async def ensure_episode_outline(
    creative: str,
    summary: dict[str, Any],
    existing: list[dict[str, Any]],
    total: int,
) -> tuple[list[dict[str, Any]], bool]:
    """返回 (合并后分集列表, 是否实际调用 LLM 生成大纲)。"""
    if _titles_ready(existing, total):
        return existing, False
    outline = await run_episode_outline(creative, summary, total)
    return merge_episode_bodies(outline, existing), True


async def run_episode_script_batch(
    summary: dict[str, Any],
    existing: list[dict[str, Any]],
    batch_size: int = 1,
    total: int | None = None,
    creative: str = "",
) -> list[dict[str, Any]]:
    # 按缺失集号生成下一批正文（默认逐集）；手动空集不参与自动补写
    target = int(total or summary.get("episodeCount") or 12)
    missing = auto_missing_episode_numbers(existing, target)
    if not missing:
        return []
    start = missing[0]
    end = start
    for i in range(1, min(batch_size, len(missing))):
        if missing[i] != end + 1:
            break
        end = missing[i]

    title_by_num = {
        int(item.get("episodeNumber") or 0): str(item.get("title") or "")
        for item in existing
        if isinstance(item, dict)
    }
    batch_titles = "\n".join(
        f"第 {n} 集：{title_by_num.get(n) or f'第 {n} 集'}" for n in range(start, end + 1)
    )
    batch_size_n = end - start + 1
    summary_text = format_summary_text(summary)
    user = "\n".join(
        [
            f"当前任务：撰写第 {start} 集至第 {end} 集（共 {batch_size_n} 集）的完整剧本正文",
            f"全剧共 {target} 集",
            f"episodes 输出数组必须恰好 {batch_size_n} 项，episodeNumber 从 {start} 到 {end}",
            f"Each content must be at least {MIN_EPISODE_CONTENT_CHARS} characters in the output language, with {EPISODE_SCENE_COUNT_HINT}, concise △ actions and dialogue.",
            "",
            f"原始创意：\n{(creative or '').strip() or '（无额外创意，以摘要为准）'}",
            "",
            f"剧本摘要：\n{summary_text}",
            "",
            f"全剧分集规划：\n{_format_episode_title_list(existing)}",
            "",
            f"本批次待撰写：\n{batch_titles}",
            "",
            f"已有剧集正文：\n{_format_existing_episode_content(existing)}",
            "",
            f"请输出第 {start}–{end} 集各集的 content 字段（可附带 title）。",
        ]
    )

    data = await drama_chat_json(
        EPISODE_BATCH_CONTENT_SYSTEM,
        user,
        temperature=0.6,
        max_tokens=16384,
        language_source=creative or summary_text,
    )

    episodes = data.get("episodes") if isinstance(data, dict) else data
    if not isinstance(episodes, list):
        raise ValueError('Invalid episode script response format')

    normalized = _normalize_batch_episodes(episodes, start, end, title_by_num)
    # 正文过短则带强调提示重试一次
    too_short = [
        item
        for item in normalized
        if _content_char_len(str(item.get("body") or "")) < MIN_EPISODE_CONTENT_CHARS
    ]
    if too_short:
        retry_user = (
            user
            + "\n\n上次输出过短。请重写本批次，每集 content 约 "
            + str(TARGET_EPISODE_CONTENT_CHARS)
            + f" characters in the same output language (at least {MIN_EPISODE_CONTENT_CHARS}), with {EPISODE_SCENE_COUNT_HINT}, actions and dialogue; do not reduce it to a synopsis."
        )
        retry = await drama_chat_json(
            EPISODE_BATCH_CONTENT_SYSTEM,
            retry_user,
            temperature=0.6,
            max_tokens=16384,
            language_source=creative or summary_text,
        )
        retry_eps = retry.get("episodes") if isinstance(retry, dict) else retry
        if isinstance(retry_eps, list):
            normalized = _normalize_batch_episodes(retry_eps, start, end, title_by_num)

    if not normalized:
        raise ValueError(f'The model did not return the body for Episodes {start}–{end}')
    return normalized


async def run_episode_script_from_draft(
    summary: dict[str, Any],
    existing: list[dict[str, Any]],
    episode_number: int,
    draft: str,
    creative: str = "",
    character_asset_names: list[str] | None = None,
) -> list[dict[str, Any]]:
    """把用户草稿优化成指定集的拍摄正文。"""
    number = int(episode_number)
    draft_text = (draft or "").strip()
    if number < 1:
        raise ValueError('Invalid episode number')
    if len(draft_text) < 20:
        raise ValueError('Please enter an episode script draft of at least 20 characters first')

    title_by_num = {
        int(item.get("episodeNumber") or 0): str(item.get("title") or "")
        for item in existing
        if isinstance(item, dict)
    }
    current_title = title_by_num.get(number) or f"第 {number} 集"
    ctx = build_single_episode_context(
        summary,
        existing,
        number,
        project_source=creative,
        character_asset_names=character_asset_names,
    )
    user = "\n\n".join(
        [
            f"当前任务：把用户草稿优化为第 {number} 集完整拍摄剧本",
            f"episodeNumber 必须为 {number}，episodes 数组必须恰好 1 项",
            f"当前集名：{current_title}（可按草稿核心事件微调 title）",
            f"Each content must be at least {MIN_EPISODE_CONTENT_CHARS} characters in the output language, with {EPISODE_SCENE_COUNT_HINT}, concise △ actions and dialogue.",
            *ctx,
            f"用户提供的第 {number} 集草稿：\n{draft_text}",
            f"请输出第 {number} 集的 title 与 content。",
        ]
    )
    data = await drama_chat_json(
        EPISODE_OPTIMIZE_SYSTEM,
        user,
        temperature=0.55,
        max_tokens=16384,
        language_source=creative or draft_text,
    )
    episodes = data.get("episodes") if isinstance(data, dict) else data
    if not isinstance(episodes, list):
        raise ValueError('Invalid episode script response format')
    normalized = _normalize_batch_episodes(episodes, number, number, title_by_num)
    too_short = [
        item
        for item in normalized
        if _content_char_len(str(item.get("body") or "")) < MIN_EPISODE_CONTENT_CHARS
    ]
    if too_short:
        retry_user = (
            user
            + "\n\n上次输出过短。请按用户草稿重写第 "
            + str(number)
            + " 集，content 约 "
            + str(TARGET_EPISODE_CONTENT_CHARS)
            + f" characters in the same output language (at least {MIN_EPISODE_CONTENT_CHARS}), with {EPISODE_SCENE_COUNT_HINT}, concise actions and dialogue."
        )
        retry = await drama_chat_json(
            EPISODE_OPTIMIZE_SYSTEM,
            retry_user,
            temperature=0.55,
            max_tokens=16384,
            language_source=creative or draft_text,
        )
        retry_eps = retry.get("episodes") if isinstance(retry, dict) else retry
        if isinstance(retry_eps, list):
            normalized = _normalize_batch_episodes(retry_eps, number, number, title_by_num)
    if not normalized:
        raise ValueError(f'The model did not return the body for Episode {number}')
    origin_item = next(
        (
            item
            for item in existing
            if isinstance(item, dict) and int(item.get("episodeNumber") or 0) == number
        ),
        None,
    )
    origin = str((origin_item or {}).get("origin") or "")
    if origin == MANUAL_EPISODE_ORIGIN:
        for item in normalized:
            item["origin"] = MANUAL_EPISODE_ORIGIN
    return normalized


def _normalize_batch_episodes(
    episodes: list[Any],
    start: int,
    end: int,
    title_by_num: dict[int, str],
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for offset, item in enumerate(episodes):
        if not isinstance(item, dict):
            continue
        number = item.get("episodeNumber") or item.get("episode_number") or (start + offset)
        try:
            number_i = int(number)
        except (TypeError, ValueError):
            number_i = start + offset
        if number_i < start or number_i > end:
            continue
        body = str(item.get("content") or item.get("body") or "").strip()
        if not body:
            continue
        title = (
            str(item.get("title") or "").strip()
            or title_by_num.get(number_i)
            or f'Episode {number_i}'
        )
        row: dict[str, Any] = {
            "episodeNumber": number_i,
            "title": title,
            "body": body,
        }
        creative = str(item.get("creative") or "").strip()
        summary = str(item.get("summary") or item.get("synopsis") or "").strip()
        if creative:
            row["creative"] = creative
        if summary:
            row["summary"] = summary
        normalized.append(row)
    return normalized
