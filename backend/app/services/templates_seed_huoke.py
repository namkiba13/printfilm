"""获客短视频模板（并入科普模板库）。

结构来自共创营销 Demo 四平台骨架（小红书 / 抖音 / 点评 / 朋友圈）：
钩子→印象→分点体验→推荐给谁；0–3 秒钩子→画面→1–2 体验→CTA；
总体评价→环境服务→推荐理由→性价比→适合谁；一句感受→一个细节→轻推荐。

铁律：不编造用户没写的体验；卖点只能客观陈述；不用广告法绝对化用语。
category[0] 固定为「科普」，便于首页科普筛选；另挂「获客」「商业」。
sort_order 0–3：创建页「热门推荐」与默认模板会优先落到这四条。
"""

# 四条模板共用：事实边界 + 人称边界 + 合规（写入 llm_system_addon 前缀）
HUOKE_IRON_RULES = (
    '[Customer Acquisition Iron Rules] Use only facts appearing in the user\'s copy; do not invent a single word about prices, services, taste, effects, or service details that are not mentioned. If information is insufficient, keep it short and never fill gaps with assumptions. [Point-of-View Boundaries] First-person statements ("I tried it/I saw it/for us") may only come from the user\'s original text; business selling points may only be written as objective statements ("Their specialty is X"), never as "I used X and it was great." Selling points not mentioned by the user must not be included in the "Real Experience" bullet points. [Compliance] Absolute terms such as best, first, nationally recognized, 100%, permanent, and cure-all are prohibited; numbers must follow the user\'s copy; do not fabricate success rates, case counts, or celebrity endorsements. [Names] Store names, addresses, and product names appearing in the user\'s copy must be preserved exactly; do not change them to generic names such as a store or brand; never invent names absent from the copy. [Voiceover]'
)

# 叠字：竖屏获客片顶部大字 + 底部口播字幕
_HUOKE_SUB_SPLIT = {
    "font": "SourceHanSans",
    "position": "split",
    "title_scale": 1.65,
    "sub_scale": 1.45,
    "caption_scale": 1.28,
}


def _tpl(
    *,
    tid: str,
    name: str,
    description: str,
    style_prefix: str,
    negative_prompt: str,
    default_ratio: str,
    shot_duration_min: int,
    shot_duration_max: int,
    structure_addon: str,
    seedream_config: dict,
    seedance_config: dict,
    audio_config: dict,
    subtitle_config: dict,
    sort_order: int,
    photoreal: bool = False,
    shot_count_min: int = 3,
    shot_count_max: int = 5,
) -> dict:
    """组装一条获客科普模板，字段与 TEMPLATES 条目一致。"""
    cfg = dict(seedream_config)
    if photoreal:
        cfg["photoreal"] = True
    cfg["shot_count_min"] = shot_count_min
    cfg["shot_count_max"] = shot_count_max
    cfg["allow_source_names"] = True
    return {
        "id": tid,
        "name": name,
        "description": description,
        "category": ["科普", "获客", "商业"],
        "preview_cover": f"/static/templates/covers/{tid}.png",
        "style_prefix": style_prefix,
        "negative_prompt": negative_prompt,
        "default_ratio": default_ratio,
        "shot_duration_min": shot_duration_min,
        "shot_duration_max": shot_duration_max,
        "llm_system_addon": HUOKE_IRON_RULES + structure_addon,
        "seedream_config": cfg,
        "seedance_config": seedance_config,
        "audio_config": audio_config,
        "subtitle_config": subtitle_config,
        "sort_order": sort_order,
        "is_active": True,
        "is_premium": False,
    }


HUOKE_TEMPLATES: list[dict] = [
    _tpl(
        tid="huoke_douyin_hook",
        name='Customer Acquisition · Douyin Hook',
        description='Vertical voiceover pacing: hook in the first 3 seconds → scene visuals → 1–2 verifiable experiences → call to visit the store/place an order. Suitable for customer-acquisition campaigns.',
        style_prefix=(
            'Vertical customer-acquisition Short Video still: storefront exterior, product close-ups, service actions, or operating interfaces alternating; high-contrast natural light, clear subject, negative space for large text overlays, cinematic product-demo quality, neither cartoon nor anime'
        ),
        negative_prompt=(
            'Cartoon, anime, cel shading, 2D anime style, neon cyberpunk screens, task lists, garbled text in the image, subtitle watermarks, garbled logos, fake trophies or certificates, exaggerated promotional poster collages'
        ),
        default_ratio="9:16",
        shot_duration_min=3,
        shot_duration_max=6,
        structure_addon=(
            "This is a Douyin customer-acquisition voiceover video. [Shot Count] Divide it into 3–4 shots, ignoring any longer default range; if facts are insufficient, combine beats—fewer shots are preferable to inventing anything. Beats: ① [0–3-Second Hook] contrast/suspense/pain point, with an extremely short title; ② [Scene Visuals] establish where and what is happening, using only scenes present in the user's copy; ③ [Core Experience] no more than 2 verifiable points; do not invent details just to fill the quota; ④ [Call to Action] the specific next step for visiting, ordering, or sending a direct message, without promising results. In each shot, segments alternate between visual and narration; narration uses short sentences that can be read in one breath; title = hook phrase, subtitle = objective selling-point sentence, text = spoken copy."
        ),
        seedream_config={
            "ref_images": [],
            "strength": 0.72,
            "consistency_mode": "style",
            "extra_prompt": (
                'Clear vertical subject, negative space at the top and bottom for text overlays; composition must differ in every shot; no text in the image'
            ),
        },
        seedance_config={
            "motion_bias": 'Slight handheld push-in, alternating product or store details',
            "character_consistency": False,
            "generate_audio": True,
        },
        audio_config={"voice_preset": "urban_editorial", "bgm_mood": 'Upbeat professional'},
        subtitle_config=dict(_HUOKE_SUB_SPLIT),
        sort_order=0,
        photoreal=True,
        shot_count_min=3,
        shot_count_max=4,
    ),
    _tpl(
        tid="huoke_xhs_recommend",
        name='Customer Acquisition · Xiaohongshu Recommendation',
        description='Vertical friend-to-friend recommendation structure: hook title → first impression → real experience in bullet points → who it is recommended for. Information-rich cover, conversational tone.',
        style_prefix=(
            'Vertical lifestyle recommendation still: bright natural light, light-colored tabletop or a corner of a store, clear product/space details, magazine-cover feel, layered negative space, suitable for title overlays, neither heavy-makeup studio photography nor cartoon'
        ),
        negative_prompt=(
            'Dark, dirty, cluttered, cyberpunk neon, cartoon or anime, hard-sell poster text piles, fake cutouts, garbled watermarks'
        ),
        default_ratio="9:16",
        shot_duration_min=4,
        shot_duration_max=8,
        structure_addon=(
            "This is a Xiaohongshu customer-acquisition recommendation video. [Shot Count] Divide it into 3–5 shots, ignoring any longer default range; if facts are insufficient, use fewer shots and do not invent experiences to fill them. Beats: ① Hook title (emotional or contrasting, not ad-like); ② Why I came / first impression (only from the user's original text); ③ Real experience in bullet points (one detail per shot); ④ Who it is recommended for / whether it is worth it (scenarios must come from the copy; if unavailable, end objectively). The voiceover should sound like talking to a close friend; keep titles short and include one specific detail in the subtitle. In each shot, segments alternate between visual and narration."
        ),
        seedream_config={
            "ref_images": [],
            "strength": 0.7,
            "consistency_mode": "style",
            "extra_prompt": 'Bright vertical composition, ample negative space at the top for a title overlay, no text in the image, different scene in every shot',
        },
        seedance_config={
            "motion_bias": 'Slow pan and slight push-in on details',
            "character_consistency": False,
            "generate_audio": True,
        },
        audio_config={"voice_preset": "warm_storyteller", "bgm_mood": 'Warm and humanistic'},
        subtitle_config=dict(_HUOKE_SUB_SPLIT),
        sort_order=1,
        photoreal=True,
        shot_count_min=3,
        shot_count_max=5,
    ),
    _tpl(
        tid="huoke_review_facts",
        name='Customer Acquisition · Word-of-Mouth Breakdown',
        description='Horizontal, objective, and detailed: overall assessment → environment/service → recommended items + reasons → value for money → who it suits. Help others make a decision; avoid sentimental language.',
        style_prefix=(
            'Clean explainer still: light-colored tabletop or store information sections, product/space/price-list atmosphere (no readable text), clear information hierarchy, even lighting, restrained documentary style, neither cartoon nor neon'
        ),
        negative_prompt=(
            'Cartoon, anime, exaggerated reaction memes, neon cyberpunk, fake certificates or trophies, garbled text in the image, explosive promotional stickers'
        ),
        default_ratio="16:9",
        shot_duration_min=5,
        shot_duration_max=10,
        structure_addon=(
            'This is a word-of-mouth/review-style customer-acquisition explainer. [Shot Count] Divide it into 3–5 shots, ignoring any longer default range; skip sections that are not mentioned and do not invent facts to fill shots. Beats: ① One-sentence overall assessment (from the user\'s copy; do not assign your own rating); ② Environment or service (write only what is mentioned); ③ Recommended item + specific reason (the reason must come from the original text); ④ Per-person cost and value for money (if the user did not mention a price, do not guess; instead explain "how to choose"); ⑤ Suitable scenarios and conclusion (who should come, who it may not suit, without promising results). The narration should sound like a careful review, with high information density and few adjectives. In each shot, segments alternate between visual and narration; title = section name, subtitle = verifiable short sentence.'
        ),
        seedream_config={
            "ref_images": [],
            "strength": 0.7,
            "consistency_mode": "style",
            "extra_prompt": 'Horizontal explainer composition, negative space on the sides or top and bottom for text overlays, no text in the image, clearly different composition in every shot',
        },
        seedance_config={
            "motion_bias": 'Slow push-in on product or space details',
            "character_consistency": False,
            "generate_audio": True,
        },
        audio_config={"voice_preset": "narrator_calm", "bgm_mood": 'Calm documentary'},
        subtitle_config={
            "font": "SourceHanSans",
            "position": "split",
            "title_scale": 1.5,
            "sub_scale": 1.35,
            "caption_scale": 1.2,
        },
        sort_order=2,
        photoreal=True,
        shot_count_min=3,
        shot_count_max=5,
    ),
    _tpl(
        tid="huoke_soft_invite",
        name='Customer Acquisition · Soft Recommendation to Acquaintances',
        description='Vertical lifestyle Short Video: one genuine impression → one specific detail → one gentle recommendation. Restrained and not ad-like, suitable for sharing with acquaintances.',
        style_prefix=(
            'Vertical everyday documentary still: window light, a street corner, part of a tabletop, or everyday store life; restrained warm tones, realistic textures and skin, like a casual snapshot, neither studio hard-sell advertising nor cartoon'
        ),
        negative_prompt=(
            'Studio glamour makeup, hard-sell posters, cartoon or anime, neon cyberpunk, fake-smiling models, garbled watermarks, explosive promotional stickers'
        ),
        default_ratio="9:16",
        shot_duration_min=4,
        shot_duration_max=8,
        structure_addon=(
            'This is a Moments/acquaintance customer-acquisition Short Video. [Shot Count] Divide it into 2–3 shots, ignoring any longer default range; shorter is better. Beats: ① One genuine impression (stay as close as possible to the user\'s original wording and tone); ② One specific detail or visual (use only the most specific point in the copy); ③ Optional gentle recommendation ("You can ask me if you want to come" / "You can go take a look yourself"); do not use a strong CTA or pile on discounts. Do not use hashtag-style phrasing; do not put emojis in the narration. In each shot, segments alternate between visual and narration; keep the title extremely short or unobtrusive.'
        ),
        seedream_config={
            "ref_images": [],
            "strength": 0.72,
            "consistency_mode": "style",
            "character_prompt": 'Everyday passerby perspective; a partial profile or only hands and the scene may be shown, casual clothing, consistent visual tone throughout',
            "extra_prompt": 'Warm window light, vertical everyday-life feel, optional negative space at the top, no text in the image',
        },
        seedance_config={
            "motion_bias": 'Slight handheld breathing motion, slow pan',
            "character_consistency": False,
            "generate_audio": True,
        },
        audio_config={"voice_preset": "warm_storyteller", "bgm_mood": 'Warm and humanistic'},
        subtitle_config={"font": "SourceHanSans", "position": "top", "caption_scale": 1.25},
        sort_order=3,
        photoreal=True,
        shot_count_min=2,
        shot_count_max=3,
    ),
]
