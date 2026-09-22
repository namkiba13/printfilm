"""剧本摘要 Agent 提示词与用户消息（对齐 manju scriptSummary）。"""

from __future__ import annotations

from app.services.drama.image_styles import (
    IMAGE_STYLE_IDS,
    get_image_style_label,
    resolve_image_style_prompt,
)

# SCRIPT_SUMMARY_SYSTEM_PROMPT 指导 LLM 将原始创意转为结构化剧本摘要
SCRIPT_SUMMARY_SYSTEM_PROMPT = """You are a professional short-film/series story planner.
Turn the author's original idea into a structured story summary ready for production.

Requirements:
1. Preserve the core setting, plot and ending; fill gaps only where necessary.
2. episodeCount must exactly match the requested episode count. Otherwise estimate an appropriate series length.
3. Match the chosen visual style in character visualImage descriptions and storyType tags.
4. Join multiple storyType/coreHook tags with '+'. Keep targetAudience concise.
5. seriesTitle is a short, memorable, complete title in the output language, not a copied idea or placeholder.
6. oneLineStory states the central plot and strongest hook in one sentence, distinct from the title.
7. Include every named on-screen character, including recurring supporting roles and antagonists.
   Group unnamed extras where appropriate. Never create separate characters for voice profiles.
   Usually 5–12 characters suffice; include more only when the idea calls for them.
8. Give each character concrete background, personality, relationships and filmable visual details.
   visualImage describes age, gender, face, hair, build, clothing materials/colors, posture and distinctive props.
9. growthArc uses 'stage A -> stage B -> stage C', with the stage descriptions in the output language.
10. synopsis is one coherent paragraph covering the world, conflict, alliances, climax, ending and aftermath.
11. Every natural-language value must follow the original idea's language or explicit language request.
    Preserve supplied names. Avoid vague adjectives and do not mix languages.

Return only a strict JSON object, without Markdown fences, with these fields:
{
  "episodeCount": number,
  "seriesTitle": string,
  "storyType": string,
  "targetAudience": string,
  "coreHook": string,
  "oneLineStory": string,
  "characters": [
    {
      "name": string,
      "title": string,
      "roleType": string,
      "visualImage": string,
      "coreTags": string,
      "identityBackground": string,
      "growthExperience": string,
      "personality": string,
      "relationships": string,
      "growthArc": string
    }
  ],
  "synopsis": string
}"""


# 解析合法的画面风格 ID
def _resolve_image_style_id(style_id: str | None) -> str | None:
    if not style_id:
        return None
    sid = style_id.strip()
    return sid if sid in IMAGE_STYLE_IDS else None


# 将入参格式化为 LLM 用户消息（对齐 manju buildScriptSummaryUserMessage）
def build_script_summary_user_message(
    creative: str,
    *,
    episode_count: int | None = None,
    image_style_id: str | None = None,
) -> str:
    trimmed = (creative or "").strip()
    sections = [f'Original concept:\n{trimmed}']
    production_params: list[str] = []

    if episode_count is not None:
        production_params.append(
            f'- Target episode count: {episode_count} episodes (episodeCount in the output must exactly match this value and must not be changed)'
        )

    resolved_style = _resolve_image_style_id(image_style_id)
    if resolved_style:
        label = get_image_style_label(resolved_style)
        style_prompt = resolve_image_style_prompt(resolved_style)
        production_params.append(f'- Visual style: {label} ({resolved_style})')
        if style_prompt:
            production_params.append(f'  Style description: {style_prompt}')
        production_params.append('  Character visualImage, story genre tags, and overall aesthetic must conform to this visual style')

    if production_params:
        sections.append("\n".join(['Production parameters:', *production_params]))

    return "\n\n".join(sections)
