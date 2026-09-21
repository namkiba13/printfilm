"""漫剧内置图片风格 ID 与生图提示词片段。"""

from __future__ import annotations

import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# 画风板只借鉴气质，禁止抄参考图里的人物与构图
STYLE_BOARD_PROMPT_HINT = (
    'Additional style reference image: draw inspiration only from its color palette, brushwork, lighting, and overall mood; do not copy the people, main subjects, or composition.'
)

_STYLE_BOARD_EXTS = (".png", ".jpg", ".jpeg", ".webp")
_board_url_cache: dict[tuple[str, int, int], str] = {}
_board_fail_cache: dict[tuple[str, int, int], float] = {}
_BOARD_FAIL_TTL_SEC = 60.0

# IMAGE_STYLE_IDS 内置风格 ID（与前端 dramaImageStyles 对齐）
IMAGE_STYLE_IDS = (
    "retro-sci-fi-atompunk",
    "palace-intrigue-cold",
    "domestic-suspense-cold",
    "ancient-romance-soft",
    "ancient-chinese-mythology",
    "japanese-youth-film",
    "japanese-daily-natural",
    "korean-urban-soft",
    "chinese-urban-realistic",
    "wuxia-realistic-photo",
    "90s-realistic-film",
    "retro-narrative-film",
    "american-retro-hollywood",
    "neon-cyberpunk-film",
    "90s-rural-china-film",
    "cgi-3d-animation",
    "ghibli-handdrawn-anime",
    "tezuka-era-cartoon",
    "shanghai-animation",
    "pixel-art",
    "shadow-puppet-illustration",
)

# IMAGE_STYLE_PROMPTS 风格 → 提示词片段
IMAGE_STYLE_PROMPTS: dict[str, str] = {
    "retro-sci-fi-atompunk": (
        'Retro sci-fi atompunk style, 1950s futuristic aesthetic, streamlined metal and atomic energy symbols, neon highlights, metallic texture, high-contrast colors, subtle film grain'
    ),
    "palace-intrigue-cold": (
        'Austere style for Chinese palace intrigue, low-saturation dark tones, restrained lighting, solemn composition, luxurious yet oppressive palace atmosphere, defined contours, dramatic side lighting'
    ),
    "domestic-suspense-cold": (
        'Cool-toned style for domestic suspense film and television, blue-gray palette, low-key lighting, heavy shadows, realistic photographic texture, tense and oppressive atmosphere, rich detail'
    ),
    "ancient-romance-soft": (
        'Aesthetic soft-light style for ancient Chinese idol dramas, dreamy soft focus, warm gauzy light halos, refined ancient-costume makeup and styling, blurred background, romantic and ethereal atmosphere'
    ),
    "ancient-chinese-mythology": (
        'Style of ancient Chinese mythological epics, primordial wilderness atmosphere, vast mountains and rivers with divine light through mist, bronze ritual vessels and coarse linen textures, ink-wash blue-green and mineral-pigment palette, solemn and sacred, epic large-scale scenes, cinematic lighting; avoid modern idol-drama soft lighting and sugary romance filters'
    ),
    "japanese-youth-film": (
        'Japanese youth-film style with analog photography, Kodak film tones, natural sunlight, shallow depth of field, fine grain, youthful and sincere everyday atmosphere'
    ),
    "japanese-daily-natural": (
        'Natural-light style of Japanese slice-of-life documentaries, soft natural light, low contrast, authentic everyday scenes, quiet and soothing, subtle film texture'
    ),
    "korean-urban-soft": 'Soft-light style for Korean urban dramas, warm filter, luminous skin, blurred urban background, romantic and gentle lighting atmosphere',
    "chinese-urban-realistic": (
        'Realistic photographic style for domestic urban realism, natural light, authentic life scenes, neutral tones, sharp details, no excessive beautification'
    ),
    "wuxia-realistic-photo": (
        'Realistic photographic style for Chinese wuxia and jianghu stories, natural lighting, authentic terrain and costume textures, dynamic composition, jianghu atmosphere, cinematic depth of field'
    ),
    "90s-realistic-film": (
        '1990s realistic film style, film texture, natural skin tones, period-appropriate clothing and environments, soft contrast, nostalgic color palette'
    ),
    "retro-narrative-film": (
        'Retro narrative film style, classic cinematic composition, film color grading, story-rich scene blocking, cinematic lighting'
    ),
    "american-retro-hollywood": (
        'American retro Hollywood Golden Age style, high-contrast lighting, warm color or classic black-and-white, star-quality glamour, sumptuous depth of field'
    ),
    "neon-cyberpunk-film": (
        'Neon cyberpunk film style, blue-violet neon lighting, rainy-night reflections, high contrast, futuristic cityscape, smoky atmosphere and holographic light effects'
    ),
    "90s-rural-china-film": (
        '1990s Chinese rural film style, natural light, earth-yellow and green tones, rough and authentic texture, rural life atmosphere'
    ),
    "cgi-3d-animation": (
        'Film-grade 3D CGI animation style, with a Pixar/DreamWorks feel, rounded forms and clean silhouettes, soft volumetric lighting and subsurface scattering, clean materials and saturated colors, shallow depth of field, non-photorealistic, not Japanese cel-shaded flat style, not flat paper-cut style'
    ),
    "ghibli-handdrawn-anime": (
        'Hand-drawn 2D animated film aesthetic, watercolor and gouache backgrounds, soft natural light and golden-hour glow, realistic human proportions and understated facial features (not big-eyed cel-shaded anime girls), everyday clothing, lush vegetation, windblown grass and drifting clouds, warm ochre and blue-green tones, atmospheric perspective and cinematic composition, non-photorealistic, not 3D CGI, not pixel art, not flat paper-cut style'
    ),
    "tezuka-era-cartoon": 'Classic Japanese cartoon style from the era of Osamu Tezuka, simple lines, retro animation flat coloring, nostalgic animated-film texture',
    "shanghai-animation": (
        'Classic animation style of the Shanghai Animation Film Studio, with the charm of traditional Chinese painting, a combination of watercolor and meticulous gongbi painting, poetic and beautiful, traditional colors'
    ),
    "pixel-art": 'Pixel art style, crisp pixel blocks, retro game aesthetic, limited color palette, 8-bit or 16-bit texture',
    "shadow-puppet-illustration": (
        'Chinese shadow-puppet illustration style, silhouette contours, pierced textures, warm backlighting, decorative folk-art elements, layered projection effects'
    ),
}

# IMAGE_STYLE_LABELS 风格展示名
IMAGE_STYLE_LABELS: dict[str, str] = {
    "retro-sci-fi-atompunk": 'Retro sci-fi atomic punk',
    "palace-intrigue-cold": 'Palace intrigue, cold and austere',
    "domestic-suspense-cold": 'Chinese suspense, cool tones',
    "ancient-romance-soft": 'Chinese historical romance, soft light',
    "ancient-chinese-mythology": 'Epic ancient Chinese mythology',
    "japanese-youth-film": 'Japanese youth film',
    "japanese-daily-natural": 'Japanese slice-of-life, natural',
    "korean-urban-soft": 'K-drama urban soft light',
    "chinese-urban-realistic": 'Chinese urban realism',
    "wuxia-realistic-photo": 'Wuxia jianghu realistic cinematography',
    "90s-realistic-film": '1990s realist cinema',
    "retro-narrative-film": 'Retro narrative cinema',
    "american-retro-hollywood": 'American retro Hollywood',
    "neon-cyberpunk-film": 'Neon cyberpunk cinema',
    "90s-rural-china-film": '1990s Chinese rural cinema',
    "cgi-3d-animation": '3D animation',
    "ghibli-handdrawn-anime": 'Hand-drawn in the style of Hayao Miyazaki',
    "tezuka-era-cartoon": 'Cartoon style of the Osamu Tezuka era',
    "shanghai-animation": 'Shanghai Animation Film Studio style',
    "pixel-art": 'Pixel art',
    "shadow-puppet-illustration": 'Shadow puppetry illustration',
}


# 根据风格 ID 返回展示名称
def get_image_style_label(style_id: str) -> str:
    return IMAGE_STYLE_LABELS.get(style_id, style_id)


# 根据风格 ID 返回生图提示词片段，无效 ID 返回空字符串
def resolve_image_style_prompt(style_id: str | None = None) -> str:
    if not style_id:
        return ""
    return IMAGE_STYLE_PROMPTS.get(style_id, "")


def _first_raster(directory: Path, style_id: str) -> Path | None:
    """目录下按常见栅格后缀找风格板，跳过 svg 占位。"""
    if not directory.is_dir():
        return None
    for ext in _STYLE_BOARD_EXTS:
        path = directory / f"{style_id}{ext}"
        if path.is_file() and path.stat().st_size > 1024:
            return path
    return None


# 延迟导入，避免与 storage 循环依赖
def _static_root() -> Path:
    from app.services.storage import STATIC_ROOT

    return STATIC_ROOT


def _safe_image_style_id(style_id: str | None) -> str | None:
    """只接受内置风格 ID，拒绝路径穿越。"""
    sid = (style_id or "").strip()
    if not sid or sid not in IMAGE_STYLE_IDS:
        return None
    if any(part in sid for part in ("/", "\\", "..")):
        return None
    return sid


def style_board_local_path(style_id: str | None) -> Path | None:
    """风格板本地文件：优先 backend/static，其次前端 public 封面。"""
    sid = _safe_image_style_id(style_id)
    if not sid:
        return None
    backend_dir = _static_root() / "drama" / "image-styles"
    found = _first_raster(backend_dir, sid)
    if found:
        return found
    repo_root = Path(__file__).resolve().parents[4]
    return _first_raster(repo_root / "frontend" / "public" / "image-styles", sid)


def resolve_image_style_board_url(style_id: str | None = None) -> str:
    """把风格板发到公网 https，供 Seedream / Seedance 拉图；失败则空串（仍走提示词）。"""
    path = style_board_local_path(style_id)
    if path is None:
        return ""
    cache_key = (str(path.resolve()), int(path.stat().st_mtime_ns), int(path.stat().st_size))
    cached = _board_url_cache.get(cache_key)
    if cached:
        return cached
    failed_at = _board_fail_cache.get(cache_key)
    if failed_at is not None and (time.monotonic() - failed_at) < _BOARD_FAIL_TTL_SEC:
        return ""
    from app.services import storage
    from app.services.style_lock import seedream_ref_urls

    dest = path
    static_root = _static_root()
    try:
        resolved = path.resolve()
        if static_root not in resolved.parents and static_root != resolved.parent:
            dest_dir = static_root / "drama" / "image-styles"
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / path.name
            if not dest.exists() or dest.stat().st_mtime < path.stat().st_mtime:
                dest.write_bytes(path.read_bytes())
        published = storage.publish_local(dest, sync=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("风格板未能发布为公网 URL style=%s: %s", style_id, exc)
        _board_fail_cache[cache_key] = time.monotonic()
        return ""
    urls = seedream_ref_urls(published, limit=1)
    url = urls[0] if urls else ""
    if not url:
        logger.warning("风格板 URL 不是上游可拉取的 https style=%s published=%s", style_id, published)
        _board_fail_cache[cache_key] = time.monotonic()
        return ""
    _board_fail_cache.pop(cache_key, None)
    _board_url_cache[cache_key] = url
    return url


def append_style_board_url(
    urls: list[str],
    board_url: str | None,
    *,
    max_total: int = 9,
) -> list[str]:
    """画风板接到角色/场景图之后，去重，并为板子预留最后一个名额。"""
    board = (board_url or "").strip()
    out = [u.strip() for u in urls if (u or "").strip()]
    cap = max(1, int(max_total))
    if board:
        out = [u for u in out if u != board][: cap - 1]
        out.append(board)
        return out
    return out[:cap]
