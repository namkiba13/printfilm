"""English presentation of system notation, with legacy-compatible request decoding.

Only known production markers/default labels are translated. Story prose and source
ideas are never sent through a translator or rewritten by this module.
"""

import re
from typing import Any


HEADERS = {
    "旁白": "Narration", "对白": "Dialogue", "内心独白": "Inner monologue",
    "画面": "Visual", "空镜": "Establishing shot", "字幕": "Subtitles",
    "人物介绍": "Character intro", "片头": "Opening", "背景介绍": "Background",
    "配乐": "Music", "BGM": "BGM", "强制约束": "Production rules",
    "风格锁定": "Style lock", "人物锁定": "Character lock", "约束": "Constraints",
    "场景": "Scene", "角色设定": "Character setup", "人物设定": "Character definition",
}
NOTES = {
    "无配音仅环境音": "ambient sound only, no voiceover",
    "可仅环境音与 BGM": "ambient sound and BGM only",
    "慢速清晰": "slow and clear", "自然语速": "natural pace",
    "同步字幕": "synced captions", "画面叠字": "on-screen text",
    "角色身旁": "beside character", "后期混音": "post-production mix",
    "后期叠旁白字幕": "post-production narration captions",
    "简体中文逐句同步": "synchronized sentence by sentence in the spoken language",
    "全程简体中文字幕": "captions in the spoken language throughout",
    "旁白逐句同步烧录": "burned in sentence by sentence with narration",
    "简体中文": "spoken language", "逐句轮换": "one sentence at a time",
    "与口播同步": "synchronized with speech", "仅标记段落同步": "marked segments only",
    "底部居中": "bottom center", "音频、字幕与配乐": "audio, captions and music",
    "音量低于人声约 30%": "volume about 30% below speech",
    "音量低于人声": "volume below speech",
    "贴合剧情氛围的轻量配乐，情绪随画面起伏": "Light score following the scene's emotional progression",
    "贴合内容的轻量配乐，情绪平稳，不抢旁白": "Light, steady score supporting the narration",
    "低沉紧张、鼓点渐强，烘托压迫与危机感": "Low, tense score with rising drums and a sense of danger",
    "低沉紧张、鼓点渐强，烘托压迫感": "Low, tense score with rising drums",
    "庄重史诗、弦乐铺底，气势恢宏但不抢戏": "Restrained epic strings supporting the scene",
    "神秘悬疑、低频铺底，留白感强": "Sparse, mysterious low-frequency score",
    "流动感环境音乐，水声与弦乐交织": "Flowing ambient music with water and strings",
    "轻柔开阔、希望感，钢琴或弦乐为主": "Gentle, hopeful piano or strings",
    "温暖人文、钢琴弦乐铺底": "Warm piano and strings",
    "轻电子氛围，克制不抢戏": "Subtle electronic ambience",
    "轻快专业、干净电子铺底": "Light, clean electronic score",
    "史诗弦乐铺底，气势克制": "Restrained epic strings",
}
LABELS = {
    "基础形象": "Base appearance", "平稳": "Steady", "轻快专业": "Light and professional",
    "轻快": "Light", "舒缓": "Relaxed", "温暖": "Warm", "紧张": "Tense",
    "缓慢横移": "Slow pan", "缓慢推近": "Slow push-in", "轻推": "Gentle push-in",
    "轻拉远": "Gentle pull-out", "缓慢上摇": "Slow tilt-up",
    "主角": "Protagonist", "配角": "Supporting role", "反派": "Antagonist",
    "角色": "Character", "出场人物": "Cast member",
}
_CUE = re.compile(r"(?m)^([ \t]*(?:(?:@duration:\d+|\d{2}:\d{2}-\d{2}:\d{2})[ \t]+)?)【([^】\n]+)】")
_LABEL_KEYS = {"camera", "bgm", "bgm_mood", "bgm_lock", "bgm_mood_override", "appearanceName", "roleType", "coreTags"}


def _replace_known(text: str, pairs: dict[str, str], reverse: bool) -> str:
    """Replace longest known system phrases first, without cascading replacements."""
    mapping = {value: key for key, value in pairs.items()} if reverse else pairs
    pattern = re.compile("|".join(re.escape(key) for key in sorted(mapping, key=len, reverse=True)))
    return pattern.sub(lambda match: mapping[match.group()], text)


def _notation(text: str, reverse: bool = False) -> str:
    """Convert only recognized cue headers/modifiers; leave dialogue after the cue intact."""
    headers = {value: key for key, value in HEADERS.items()} if reverse else HEADERS

    def cue(match: re.Match[str]) -> str:
        inner = match.group(2)
        head = re.match(r"^([^·：:]+)(.*)$", inner)
        if not head or head.group(1).strip() not in headers:
            return match.group()
        name = headers[head.group(1).strip()]
        tail = _replace_known(head.group(2), NOTES, reverse)
        if name in {"BGM", "Music", "配乐"}:
            labels = {value: key for key, value in LABELS.items()} if reverse else LABELS
            pattern = re.compile(r"(?<=[：:·；;，,])([ \t]*)(" + "|".join(re.escape(key) for key in labels) + r")(?=[ \t]*(?:[·；;，,]|$))")
            tail = pattern.sub(lambda item: item.group(1) + labels[item.group(2)], tail)
        if reverse:
            tail = re.sub(r"^:\s?", "：", tail)
        else:
            tail = re.sub(r"^：", ": ", tail)
        return f"{match.group(1)}【{name}{tail}】"

    result = _CUE.sub(cue, text)
    if reverse:
        result = re.sub(r"(?m)^(\s*#{1,3}\s*)Scene\s*(\d+\s*[-－—]\s*\d+)", r"\1场\2", result)
        result = re.sub(r"(?m)^(\s*)Cast:\s*", r"\1出场人物：", result)
        result = re.sub(r"(?m)^(【片头[^】]*】\s*)Episode\s+(\d+)", r"\1第\2集", result)
    else:
        result = re.sub(r"(?m)^(\s*#{1,3}\s*)场(?:景)?\s*(\d+\s*[-－—]\s*\d+)", r"\1Scene \2", result)
        result = re.sub(r"(?m)^(\s*)出场人物[：:]\s*", r"\1Cast: ", result)
        result = re.sub(r"(?m)^(【Opening[^】]*】\s*)第\s*(\d+)\s*集", r"\1Episode \2", result)
    return result


def _payload(value: Any, reverse: bool = False, key: str = "") -> Any:
    """Copy nested presentation data so formatting cannot mutate stored JSON."""
    if isinstance(value, str):
        if key in {"source", "source_text"}:
            return value
        result = _notation(value, reverse)
        if key in _LABEL_KEYS:
            mapping = {v: k for k, v in LABELS.items()} if reverse else LABELS
            result = mapping.get(result, result)
            result = _replace_known(result, NOTES, reverse)
        return result
    if isinstance(value, dict):
        return {k: _payload(v, reverse, k) for k, v in value.items()}
    if isinstance(value, list):
        return [_payload(item, reverse, key) for item in value]
    return value


def english_system_text(value: Any) -> Any:
    """Public API/editor representation of production notation."""
    return _payload(value)


def canonical_system_text(value: Any) -> Any:
    """Accept English editor notation while keeping legacy processing semantics."""
    return _payload(value, reverse=True)


def english_system_label(value: str | None) -> str | None:
    """Translate known camera/music defaults, not free-form story text."""
    return _payload(value, key="bgm_mood")


def canonical_system_label(value: str | None) -> str | None:
    """Decode English defaults accepted by existing camera/music processing."""
    return _payload(value, reverse=True, key="bgm_mood")
