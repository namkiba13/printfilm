"""内置风格模板 — 提示词与风格描述统一中文。

分类约定（category[0] 为主分类，用于首页筛选）：
电影感 / 真人感 / 写实感 / 科普 / 儿童 / 国风 / 科幻 / 动漫 / 3D / 商业 / 复古 / 纪录片 / 奇幻 / 图文 / 悬疑 / 开源 / 获客
获客短视频四条在 templates_seed_huoke.py，并入 TEMPLATES 末尾；category[0] 仍为科普。
真人感、写实感模板须在 seedream_config 设 photoreal: true。

一致性（seedream_config.consistency_mode）：
- character：人物+画风锁定，镜间图生图链式参考（叙事默认）
- style：仅画风气质，不锁人物、不链式参考
- diverse：按内容动态规划独立场景（开源/产品演示），禁止镜间雷同
未设置时回退 seedance/seedream 的 character_consistency。

成片方式（是否生成 AI 视频）由用户在风格配置页选择，不再由模板锁定。
模板 default_ratio 仅作画幅默认建议。
"""

from app.services.templates_seed_huoke import HUOKE_TEMPLATES

TEMPLATES: list[dict] = [
    {
        "id": "opensource_showcase",
        "name": 'Open Source Project Showcase',
        "description": 'Dynamically planned based on project content: people operating system interfaces in real-world usage scenarios, suitable for introducing open-source tools and platforms.',
        "category": ["开源", "图文", "商业"],
        "preview_cover": "/static/templates/covers/opensource_showcase.png",
        "style_prefix": (
            'High-quality product demonstration still: a person operates software, documentation sites, or workbenches at a real workstation, with clear hand interactions and screen interfaces, restrained layout, clear information hierarchy, and materials and colors determined by the content (light SaaS, paper-like documents, dark IDE, or terminal); cinematic product-demo quality, clean negative space for overlaid text, not a task-list interface'
        ),
        "negative_prompt": (
            'Task lists, todo lists, checkboxes, stacked kanban cards, neon blue, cyberpunk blue glow, full-screen blue-purple gradients, glowing grid floors, layered sci-fi HUDs, exaggerated cartoon style, anime girls, sloppy hand-drawn style, garbled text in the image, subtitles or watermarks, garbled logos, blurry, empty interface with no operator, pure abstract color blocks'
        ),
        "default_ratio": "9:16",
        "shot_duration_min": 5,
        "shot_duration_max": 12,
        "llm_system_addon": (
            "This is an open-source/product showcase video. First analyze the user copy: project type, core capabilities, typical users, and usage path; then plan the storyboard and visuals instead of applying a fixed blue-glowing dashboard style. [Mandatory visual requirements] Every shot must show a person operating a system: an operator seated at a workstation using a computer, laptop, or tablet, clicking interfaces, entering configuration, viewing dashboards, demonstrating core processes, deploying or releasing, or reading documentation; screen close-ups may supplement this, but the entire video must not consist only of empty UI without people. [Per segment] Each shot must output segments with alternating visual and narration; each segment lasts 3–12 seconds, and the total shot duration must match the voiceover. [Visuals] Let the color palette and interface character follow the content (light back office, IDE, documentation site, terminal, etc.); do not default to neon blue. [Storyboard] Each shot should represent a different capability or operating scenario, with clearly distinct compositions; task lists and character-driven plots are prohibited. title = short module name (2–8 characters), subtitle = capability benefit (10–22 characters), text = voiceover; img_prompt must clearly specify the person's posture, the interface type in front of them, the operating action, and the primary color."
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "consistency_mode": "diverse",
            "character_prompt": (
                'Product demonstration operator: profile or over-the-shoulder view, seated at a workstation operating a laptop or dual monitors, wearing business-casual attire. Hands and screens are the visual focus; facial features need not draw attention. Maintain a consistent tone throughout.'
            ),
            "extra_prompt": (
                'The subject is a person operating a system interface, with clearly readable hand clicks. No neon-blue cyberpunk screens; leave blank space at the top and bottom for large text overlays; do not include any text in the image; the layout and operating action in this shot must be clearly different from those in other shots.'
            ),
        },
        "seedance_config": {
            "motion_bias": 'Slight hand movement and screen content changes, with a slow push toward the workstation',
            "character_consistency": False,
            "generate_audio": True,
        },
        "audio_config": {"voice_preset": "urban_editorial", "bgm_mood": 'Upbeat professional'},
        "subtitle_config": {
            "font": "SourceHanSans",
            "position": "split",
            "title_scale": 1.7,
            "sub_scale": 1.55,
            "caption_scale": 1.3,
        },
        "sort_order": 1,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "opensource_live_work",
        "name": 'Real Work Setting',
        "description": 'Realistic workstation operation by a person: profile or over-the-shoulder view of system operation, suitable for Short Video content about open-source tools and product workflows.',
        "category": ["开源", "真人感", "写实感"],
        "preview_cover": "/static/templates/covers/opensource_live_work.png",
        "style_prefix": (
            'Realistic photography of a person working at an actual office workstation, using a laptop or dual monitors from a profile or over-the-shoulder angle, with clear hand interactions and screen interfaces, natural window light supplemented by monitor light, business-casual clothing, realistic skin and materials, non-cartoon, non-anime, clean negative space for overlaid text'
        ),
        "negative_prompt": (
            'Cartoon, anime, cel shading, 2D anime style, over-smoothed beauty retouching, CGI mannequin, neon-blue cyberpunk dashboard, piles of task lists, empty interface with no operator, text or watermarks in the image, blurry'
        ),
        "default_ratio": "16:9",
        "shot_duration_min": 6,
        "shot_duration_max": 12,
        "llm_system_addon": (
            "This is an open-source Real Work Setting video. First analyze the project's capabilities and usage path, then break it into multiple short shots based on the content. [Mandatory] Every shot must show a real person operating a system at a workstation (profile, over-the-shoulder, or hand-focused view; minimize extreme front-facing close-ups). [Per segment] Each shot must output a segments array alternating visual (shot size + action + interface type) and narration (voiceover); each segment lasts 3–12 seconds, and the total duration within a shot must not exceed 12 seconds; estimate voiceover duration at approximately 5 characters per second, with no drawn-out or padded delivery. [Pacing] Pain point at workstation → integration and configuration → core workbench → process result → collaboration or deployment; do not repeat compositions or operating actions. title = short module name, subtitle = selling point sentence, bgm = consistent light and professional music throughout."
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "photoreal": True,
            "consistency_mode": "diverse",
            "character_prompt": (
                'Photorealistic product demonstration operator: profile or over-the-shoulder view, seated at a workstation operating a laptop or dual monitors, wearing business-casual attire. Hands and screens are the visual focus; facial features should not draw attention. Maintain a consistent tone throughout.'
            ),
            "extra_prompt": (
                'Photorealistic workstation with clearly readable hand clicks; the interface type changes according to the content. No frontal close-ups or neon cyberpunk screens; do not include text in the image.'
            ),
        },
        "seedance_config": {
            "motion_bias": 'Slight hand movement and screen content changes, with a slow push toward the workstation',
            "character_consistency": False,
            "generate_audio": True,
        },
        "audio_config": {"voice_preset": "urban_editorial", "bgm_mood": 'Upbeat professional'},
        "subtitle_config": {
            "font": "SourceHanSans",
            "position": "split",
            "title_scale": 1.6,
            "sub_scale": 1.45,
            "caption_scale": 1.25,
        },
        "sort_order": 2,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "live_street_interview",
        "name": 'Live Street Interview Voiceover',
        "description": 'A real-person on-camera voiceover style in street or commuting settings, suitable for Short Video content featuring opinions, experiences, and light interviews.',
        "category": ["真人感", "纪录片"],
        "preview_cover": "/static/templates/covers/live_street_interview.png",
        "style_prefix": (
            'Documentary-style street interview photography with natural light and a slight handheld feel, set on city streets or in commuting environments, with realistic skin and restrained ambient-noise character, no studio-heavy makeup, non-cartoon, non-anime'
        ),
        "negative_prompt": 'Cartoon, anime, cel shading, 2D anime style, heavy studio makeup, CGI mannequin, neon cyberpunk, text or watermarks in the image',
        "default_ratio": "9:16",
        "shot_duration_min": 5,
        "shot_duration_max": 12,
        "llm_system_addon": (
            "Real-person street interview and voiceover pacing. Each shot outputs segments: establishing environment visual → narration voiceover → reaction or detail visual. Keep the person's appearance consistent throughout; minimize extreme front-facing close-ups. title should be short, and subtitle should be an opinion statement."
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "photoreal": True,
            "character_prompt": 'Real-person street interview subject: keep the age, demeanor, hairstyle, clothing, and everyday appearance consistent, with natural expressions. The same person throughout.',
            "extra_prompt": 'Natural-light street or commuting scene, with a clear vertical subject and blank space at the top for text overlays',
        },
        "seedance_config": {
            "motion_bias": 'Slight handheld feel, with a slow push-in',
            "character_consistency": True,
            "generate_audio": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Warm and humanistic'},
        "subtitle_config": {"font": "SourceHanSans", "position": "top", "caption_scale": 1.3},
        "sort_order": 3,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "live_product_desk",
        "name": 'Live-Action Desktop Demonstration',
        "description": 'Realistic top-down/angled top-down view: real hands demonstrate a product or laptop workflow, suitable for tool reviews and tutorials.',
        "category": ["真人感", "写实感", "商业"],
        "preview_cover": "/static/templates/covers/live_product_desk.png",
        "style_prefix": (
            'Live-action desktop product demonstration photography, angled top-down or over-the-shoulder view, wooden/light-colored desk, laptop and hands clearly visible, soft studio lighting or window light, realistic materials, non-cartoon, non-illustration'
        ),
        "negative_prompt": 'Cartoon, anime, cel shading, 2D anime style, empty desk with no hands, neon cyberpunk, garbled text, watermark',
        "default_ratio": "16:9",
        "shot_duration_min": 5,
        "shot_duration_max": 12,
        "llm_system_addon": (
            'Desktop demonstration video. Each segment must include hand-operation visual + narration; switch between wide desk establishing shots, hand close-ups, and screen content. Do not repeat the same framing across shots.'
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "photoreal": True,
            "consistency_mode": "diverse",
            "character_prompt": 'Realistic hands and forearms as the main focus; a partial side profile may be visible; simple clothing with a consistent tone throughout',
            "extra_prompt": 'Oblique overhead desktop view, with hands and the product/screen clearly visible; no text in the frame',
        },
        "seedance_config": {
            "motion_bias": 'Hands tapping and swiping, with a slight push-in toward the screen',
            "character_consistency": False,
            "generate_audio": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Calm documentary'},
        "subtitle_config": {
            "font": "SourceHanSans",
            "position": "split",
            "title_scale": 1.5,
            "sub_scale": 1.4,
            "caption_scale": 1.25,
        },
        "sort_order": 4,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "portrait_story",
        "name": 'Portrait Illustrated Story',
        "description": 'Portrait illustration narrative with cinematic composition, suitable for historical and cultural short videos.',
        "category": ["图文", "电影感", "故事"],
        "preview_cover": "/static/templates/covers/portrait_story.png",
        "style_prefix": 'Consistent 2D concept illustration, delicate lighting and cinematic composition, non-photorealistic, non-Japanese cel-shaded anime, portrait-oriented subject positioned slightly below center, leave blank space at the top for overlaid text, clean image with no text',
        "negative_prompt": 'Realistic photo, real person, realistic face,',
        "default_ratio": "9:16",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Break the story into shots according to its beats: beginning, development, twist, and resolution. Each shot should have a short title, an overlaid subtitle, and text serving as readable narration. The illustration style and character appearance must remain consistent throughout; do not suddenly change any shot into a live-action photo or a different anime style.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": "Fixed appearance for the story's main character: age impression, hairstyle and hair color, clothing palette, and distinctive features remain consistent throughout; delicate illustrated facial features, not a real-person photo",
            "extra_prompt": 'Vertical composition, with the subject slightly below center, approximately 1/4 of the top left blank; cinematic lighting, no text in the frame',
        },
        "seedance_config": {
            "motion_bias": 'Slow push-in or slight pull-out',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Narrative atmosphere'},
        "subtitle_config": {
            "font": "SourceHanSans",
            "position": "top",
            "title_scale": 1.4,
            "sub_scale": 1.35,
            "caption_scale": 1.3,
        },
        "sort_order": 5,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "anim_3d",
        "name": '3D animation',
        "description": 'Cinematic 3D animation quality, rounded forms and soft volumetric lighting, suitable for Short Video explainers and story shorts.',
        "category": ["3D", "动漫", "科普"],
        "preview_cover": "/static/templates/covers/anim_3d.png",
        "style_prefix": (
            'Cinematic 3D animation rendering, Pixar/DreamWorks-inspired aesthetic, rounded forms and clear contours, soft volumetric lighting and subsurface scattering, clean materials and saturated colors, shallow depth of field, non-photorealistic, non-Japanese cel-shaded flat style, non-flat paper-cutout style'
        ),
        "negative_prompt": (
            'Realistic photo, real human skin pores, live-action studio photography, Japanese cel shading, 2D anime flat coloring, flat paper-cutout style, pixel art, rough hand-drawn style, gore and horror, watermark, text in the image, subtitles, garbled text'
        ),
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": (
            '3D animation narrative rhythm: establish the scene → character action → key demonstration/knowledge point. [Art style] The entire video must maintain a consistent 3D CGI animation style and the same character designs; do not change any shot into a live-action photo or 2D cel-shaded animation. When software, systems, or Short Video content is involved, prioritize 3D characters operating interfaces and demonstrating workflows at a workstation or in the scene. Each shot should have a short title and a selling-point subtitle; img_prompt should clearly describe 3D materials, lighting, and character poses.'
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "consistency_mode": "character",
            "character_prompt": (
                'Fixed 3D animated character: rounded proportions, simple facial features, distinctive hairstyle and hair color, and clothing palette; soft, plastic-like skin and fabric materials; the same character design throughout'
            ),
            "extra_prompt": (
                'Three-dimensional volumetric lighting, clean materials, saturated but not harsh, clear subject, no text in the frame; leave blank space for overlay text'
            ),
        },
        "seedance_config": {
            "motion_bias": 'Slight movement in the fabric and hair, slow push-in, smooth animation-style camera movement',
            "character_consistency": True,
            "generate_audio": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Upbeat professional'},
        "subtitle_config": {
            "font": "SourceHanSans",
            "position": "bottom",
            "title_scale": 1.5,
            "sub_scale": 1.4,
            "caption_scale": 1.25,
        },
        "sort_order": 5,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "live_cinematic",
        "name": 'Live-Action Cinematic',
        "description": 'Live-action cinematic quality, dramatic lighting and shallow depth of field, suitable for narrative short videos.',
        "category": ["电影感", "真人感"],
        "preview_cover": "/static/templates/covers/live_cinematic.png",
        "style_prefix": 'Live-action cinematic photography, cinematic lighting and shallow depth of field, film texture with subtle grain, teal-and-orange color grading, realistic skin and materials, widescreen composition, non-cartoon, non-anime',
        "negative_prompt": 'Cartoon, anime, cel shading, anime-style, flat illustration, paper cutout, pixel art, exaggerated facial features, plastic-looking skin, watermark, text in the image',
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Follow live-action film Storyboard language: establish the scene → medium shot → close-up. The entire film must maintain the same realistic live-action style and actor appearance; no Shot may become cartoon-like.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.75,
            "photoreal": True,
            "character_prompt": 'Fixed real-person actor appearance: age, hairstyle and hair color, facial features, and clothing remain consistent throughout; realistic skin texture',
            "extra_prompt": 'Cinematic lighting, shallow depth of field, film grain, realistic scene materials',
        },
        "seedance_config": {
            "motion_bias": 'Cinematic tracking shot or slight lateral movement, with natural motion blur',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Cinematic atmosphere'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom", "caption_scale": 1.3},
        "sort_order": 6,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "live_person",
        "name": 'Live-Action Narrative',
        "description": 'A lifelike live-action presence suited to character stories, talking-head videos, and documentary Short Videos.',
        "category": ["真人感", "故事"],
        "preview_cover": "/static/templates/covers/live_person.png",
        "style_prefix": 'Lifestyle live-action photography, natural light and soft ambient light, realistic facial features and skin texture, documentary composition, no studio makeup, not cartoon or anime',
        "negative_prompt": 'Cartoon, anime, cel shading, anime-style, excessive beauty retouching, over-smoothed skin, CGI mannequin, flat illustration, watermark, text in the image',
        "default_ratio": "9:16",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Character-driven narrative pacing with conversational voice-over. Maintain a consistent realistic live-action style and the same character appearance throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "photoreal": True,
            "character_prompt": 'Real-person protagonist on camera: age impression, demeanor, hairstyle and hair color, and everyday clothing style remain consistent; natural expressions; the same person throughout',
            "extra_prompt": 'Natural light, everyday setting, clear vertical subject, with blank space at the top for overlay text',
        },
        "seedance_config": {
            "motion_bias": 'Slight handheld feel, with a slow push-in',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Warm and humanistic'},
        "subtitle_config": {"font": "SourceHanSans", "position": "top"},
        "sort_order": 7,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "photo_realism",
        "name": 'Realistic Photography',
        "description": 'Photo-realistic quality suited to products, landscapes, and documentary Short Videos.',
        "category": ["写实感", "摄影"],
        "preview_cover": "/static/templates/covers/photo_realism.png",
        "style_prefix": 'Photo-realistic photography, clear details and realistic materials, natural colors, high dynamic range, suitable for macro or landscape shots, not cartoon, illustration, or anime',
        "negative_prompt": 'Cartoon, anime, cel shading, flat illustration, painterly brushstrokes, paper cutout, pixel art, excessive HDR false colors, watermark, text in the image',
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Realistic camera language: wide establishing shot → detailed close-up. If people appear, their appearance must remain consistent throughout; scenes may contain no people. No cartoon styling.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "photoreal": True,
            "character_prompt": 'If people appear: keep realistic facial features, hairstyle, and clothing consistent; if no people appear, focus on realistic scenes and materials',
            "extra_prompt": 'Photographic detail, realistic materials, natural colors, clear subject',
        },
        "seedance_config": {
            "motion_bias": 'Slow push-in or slight lateral movement, with a realistic sense of space',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Calm documentary'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 7,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "film_cinematic",
        "name": 'Cinematic Film',
        "description": 'Widescreen film texture and dramatic lighting, suited to narrative Short Videos and atmospheric stories.',
        "category": ["电影感", "胶片"],
        "preview_cover": "/static/templates/covers/film_cinematic.png",
        "style_prefix": 'Cinematic concept illustration, widescreen composition, film grain and subtle vignetting, dramatic lighting (side light/backlight), a teal-and-orange color grading tendency, shallow-depth-of-field atmosphere, not realistic photography or cel-shaded anime',
        "negative_prompt": 'Realistic photos, live-action people, real faces, Japanese-style anime, cel shading, flat sticker style, overexposure, watermark, text in the image, cartoon line drawings',
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Follow cinematic Storyboard pacing: establishing shot → close-up → reaction shot. Keep dialogue restrained and leave space for the visuals. Maintain a consistent film illustration style and character appearance throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "character_prompt": 'Cinematic illustrated protagonist, with clearly defined age, hairstyle, and hair color; clothing silhouette and distinctive features remain consistent; moderately detailed facial features, not a photo; the same character design throughout',
            "extra_prompt": 'Film grain, vignette, dramatic lighting, teal-and-orange atmosphere, clearly defined widescreen subject',
        },
        "seedance_config": {
            "motion_bias": 'Slow tracking shot or slight lateral movement, cinematic camera motion, avoid shaking',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Cinematic atmosphere'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 8,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "noir_thriller",
        "name": 'Noir Thriller',
        "description": 'High-contrast lighting and a cool-toned atmosphere, suitable for suspense, crime cases, and nighttime storytelling.',
        "category": ["悬疑", "电影感"],
        "preview_cover": "/static/templates/covers/noir_thriller.png",
        "style_prefix": 'Film noir concept illustration with high-contrast light and shadow, cool cyan-gray tones with subtle warm highlights, rainy-night or indoor-lamp atmosphere, silhouettes and profiles, non-photorealistic.',
        "negative_prompt": "Bright pastels, children's picture-book style, Japanese anime girls, realistic photos, real people, gory close-ups, watermarks, text in the image.",
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Suspenseful pacing: clues → twists → pressure. Use short dialogue lines, with shadows and compositional tension throughout. Maintain a consistent film noir illustration style across the entire film.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "character_prompt": 'Noir-style illustrated character, clear silhouette, trench coat or distinctive silhouette, face mostly in shadow, consistent appearance throughout',
            "extra_prompt": 'High-contrast shadows, cool tones, rainy night or lamplight, strong compositional tension',
        },
        "seedance_config": {
            "motion_bias": 'Extremely slow push-in, with smoke or rain streaks drifting slightly',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Dark suspense'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 9,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "vox_papercut",
        "name": 'Vox Papercut Short Video',
        "description": 'Low-saturation flat papercut style, with people operating computers or system interfaces as the main subject, suitable for in-depth Short Video content and product tutorials.',
        "category": ["科普", "剪纸"],
        "preview_cover": "/static/templates/covers/vox_papercut.png",
        "style_prefix": (
            'Vox flat papercut illustration, layered papercut edges, low saturation, clean silhouettes, an educational explainer-video feel; scenes focus on people operating computers or business systems: working at desks, clicking interfaces, multi-screen monitoring, configuring parameters, demonstrating workflows, with screens and hand movements clearly visible and infographics as supporting elements.'
        ),
        "negative_prompt": (
            'Realistic photos, photorealistic human skin, 3D photorealistic rendering, Japanese anime, blur, noise, watermarks, garbled text in the image, empty landscape shots with no people or interfaces, purely abstract color blocks with no operational scene.'
        ),
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 15,
        "llm_system_addon": (
            'Break shots according to the Short Video explanation rhythm, with conversational dialogue and moderate information density. [Mandatory visual requirements] Every shot must show "a person operating a system": a papercut character seated at a workstation or control console, operating a computer or tablet, clicking a mouse or keyboard, switching menus, checking dashboards, filling out forms, comparing before-and-after states, demonstrating key workflows, and so on. Screen close-ups or architecture diagrams may be added, but the entire film must not consist only of empty conceptual images without an operator. title/subtitle should summarize the key knowledge point of the shot; img_prompt must clearly specify the person\'s posture, the type of content on the screen in front of them, and the operating action. Maintain the same papercut style and the same operator appearance throughout the film.'
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": (
                'Fixed paper-cutout operator: simple human silhouette, low-detail face, consistent workwear or casual color-block clothing; usually seated at a workstation operating a laptop or dual-screen console; hairstyle and color palette remain consistent throughout'
            ),
            "extra_prompt": (
                'The subject is operating a computer/system interface; screen sections and clicking gestures should be readable, layered paper edges clearly defined, low saturation, one visual focal point per shot, avoid realistic skin'
            ),
        },
        "seedance_config": {
            "motion_bias": 'Slight hand clicks and cursor movement, subtle screen content transitions, slow push-in toward the workstation',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Curious documentary'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 10,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "docu_warm",
        "name": 'Warm Documentary',
        "description": 'Documentary-style illustration with warm colors, ideal for personal stories and human-interest shorts.',
        "category": ["纪录片", "电影感"],
        "preview_cover": "/static/templates/covers/docu_warm.png",
        "style_prefix": 'Warm documentary concept illustration, natural lighting, soft warm browns and off-white, everyday details, documentary composition; not photorealistic or anime cel shading',
        "negative_prompt": 'Cyber neon, anime girls, gore, exaggerated cartoons, photorealistic images, live action, watermarks, text in the image',
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 14,
        "llm_system_addon": 'Human-interest documentary pacing: observation, details, then an emotional conclusion. Use calm, sincere narration. Keep the warm documentary illustration style and character appearance consistent throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.68,
            "character_prompt": 'Documentary-style illustrated character, everyday hairstyle and clothing, approachable facial features, clearly defined age impression, the same character design throughout',
            "extra_prompt": 'Warm natural light, everyday setting, documentary-style composition, soft grain',
        },
        "seedance_config": {
            "motion_bias": 'Very slight handheld shake or slow lateral pan, documentary-style camera movement',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Warm and humanistic'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 12,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "kids_flat",
        "name": "Flat Children's Picture Book",
        "description": "Soft colors and rounded shapes for children's educational videos and stories.",
        "category": ["儿童", "绘本"],
        "preview_cover": "/static/templates/covers/kids_flat.png",
        "style_prefix": "Flat children's picture-book illustration, soft pastels, rounded shapes, friendly characters, simple backgrounds",
        "negative_prompt": 'Horror, dark, photorealistic, complex textures, gore',
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Use short sentences children can understand, highlight one cute visual element per shot, and keep the pace lively.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.65,
            "character_prompt": 'Rounded, cute cartoon character with large eyes and simplified features, softly colored clothing, a friendly expression, and a consistent appearance throughout',
            "extra_prompt": 'Pastel soft lighting, simple background, rounded design, suitable for children',
        },
        "seedance_config": {
            "motion_bias": 'Slight bouncing feel, gentle camera drift',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Playful and upbeat'},
        "subtitle_config": {"font": "RoundedSans", "position": "bottom"},
        "sort_order": 20,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "soft_anime",
        "name": 'Soft-Light Anime',
        "description": 'Japanese soft-light cel-shading, suitable for coming-of-age stories and emotional short films.',
        "category": ["动漫", "故事"],
        "preview_cover": "/static/templates/covers/soft_anime.png",
        "style_prefix": 'Japanese soft-light cel-shaded anime, clean line art, softly gradient skies, large eyes and refined facial features, consistent character designs, non-photorealistic, non-ink-wash, non-paper-cut',
        "negative_prompt": 'Photorealistic, live-action people, real faces, ink wash, paper cutout, pixel art, bloody horror, watermark, text in the image, mixed three-head chibi proportions',
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Coming-of-age anime narrative: alternate emotional shots with dialogue shots. The entire film must maintain the same cel-shaded style and character appearances; no shot may switch to live action.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": 'Japanese anime protagonist with fixed hairstyle, hair color, and eye color; fixed color palette for school or casual clothes; cel-shaded features and a consistent character design throughout',
            "extra_prompt": 'Soft lighting, clean linework, gentle skies, consistent cel shading',
        },
        "seedance_config": {
            "motion_bias": 'Slight hair and clothing flutter, slow push-in',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "warm_storyteller", "bgm_mood": 'Youthful light music'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 22,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "chalk_whiteboard",
        "name": 'Chalk-and-Whiteboard Hand-Drawn',
        "description": 'Blackboard chalk explanation style, highlighting classroom demonstrations of people operating systems and drawing flowcharts.',
        "category": ["科普", "手绘"],
        "preview_cover": "/static/templates/covers/chalk_whiteboard.png",
        "style_prefix": (
            'Blackboard chalk and whiteboard hand-drawn explanation style, chalk strokes, diagram arrows; scenes often include simple characters operating systems in front of whiteboards or computers, drawing processes, and pointing at interfaces'
        ),
        "negative_prompt": 'Photorealistic, smooth 3D, cluttered interfaces, empty classroom with no people',
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 15,
        "llm_system_addon": (
            'Explanatory structure: definition → example → comparison. Whenever possible, show simple characters operating systems or demonstrating system processes on a whiteboard in every shot (pointing at screens, drawing module arrows, comparing before and after operations); avoid showing only abstract symbols without an operator.'
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.6,
            "character_prompt": (
                'Chalk stick-figure explainer/operator with simple, consistent features, usually standing in front of a whiteboard or sitting at a computer while pointing at the interface'
            ),
            "extra_prompt": 'Blackboard/whiteboard background, character operating a system or drawing a flowchart, clear arrows, instructional composition',
        },
        "seedance_config": {
            "motion_bias": 'Hands pointing and lines gradually appearing, camera mostly static or with a slight push-in',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "teacher_clear", "bgm_mood": 'Focused atmosphere'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 30,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "cyber_neon",
        "name": 'Cyber Neon',
        "description": 'Neon night city and a futuristic feel, suitable for technology, urban, and science-fiction topics.',
        "category": ["科幻", "赛博"],
        "preview_cover": "/static/templates/covers/cyber_neon.png",
        "style_prefix": "Cyberpunk concept illustration, neon pink-and-cyan contrast, rain-soaked reflective streets, futuristic city silhouettes, high-contrast night scenes, non-photorealistic, non-children's picture-book style",
        "negative_prompt": "Sunny beaches, pastoral watercolor, children's pastels, photorealistic, live-action people, blank-space ink wash, watermark, text in the image",
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Fast-paced technology and urban rhythm, with one strong visual symbol per shot (neon, screens, rain at night). Maintain a consistent cyberpunk illustration style throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "character_prompt": 'Cyberpunk illustration character with a fixed jacket cut and hair color, neon rim lighting, non-photorealistic face, and a consistent character design throughout',
            "extra_prompt": 'Neon pink and cyan, rainy-night reflections, futuristic city, high-contrast night scene',
        },
        "seedance_config": {
            "motion_bias": 'Flickering neon, falling rain, slow tracking camera movement',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "urban_editorial", "bgm_mood": 'Cyber electronic'},
        "subtitle_config": {"font": "DisplaySans", "position": "bottom"},
        "sort_order": 35,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "epic_fantasy",
        "name": 'Epic Fantasy',
        "description": 'Grand settings and fantastical lighting, ideal for mythological, adventure, and world-building short videos.',
        "category": ["奇幻", "电影感"],
        "preview_cover": "/static/templates/covers/epic_fantasy.png",
        "style_prefix": 'Epic fantasy concept illustration, grand wide shots and heroic medium shots, twilight and divine light rays, rocky castles and seas of clouds, dramatic composition, non-photorealistic, no modern cities',
        "negative_prompt": "Modern cities, phone interfaces, realistic photos, real people, children's simple drawings, cyberpunk neon, watermarks",
        "default_ratio": "16:9",
        "shot_duration_min": 4,
        "shot_duration_max": 14,
        "llm_system_addon": 'Epic storytelling: establish the world with a wide shot → introduce the characters → build to the conflict climax. Dialogue can be somewhat solemn. Maintain a consistent fantasy illustration style throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.72,
            "character_prompt": 'Fixed fantasy protagonist design: consistent armor or cloak silhouette, hair color, and distinctive weapon throughout; illustrated, non-photorealistic features',
            "extra_prompt": 'Grand scenery, divine twilight beams, dramatic composition, epic atmosphere',
        },
        "seedance_config": {
            "motion_bias": 'Slow camera rise and descent, drifting clouds and flags',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "narrator_calm", "bgm_mood": 'Epic orchestral'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 38,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "magazine_collage",
        "name": 'Magazine Collage',
        "description": 'Newspaper clipping collage and print textures, ideal for cultural topics and brand stories.',
        "category": ["商业", "拼贴"],
        "preview_cover": "/static/templates/covers/magazine_collage.png",
        "style_prefix": 'Magazine paper collage, torn edges, halftone print texture, layered cutouts, bold flat composition',
        "negative_prompt": 'Clean vector art, realistic skin, dirty and grayish colors',
        "default_ratio": "9:16",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Prioritize visual impact, with one strong composition per shot and short, powerful copy.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.75,
            "character_prompt": 'Magazine cutout portrait silhouette or printed halftone figure, with a consistent appearance and color palette throughout',
            "extra_prompt": 'Torn-edge paper texture, halftone printing, bold color blocks, strong vertical composition',
        },
        "seedance_config": {
            "motion_bias": 'Layers sliding and rotating slightly, paper-rustling feel',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "urban_editorial", "bgm_mood": 'Stylish light electronica'},
        "subtitle_config": {"font": "DisplaySans", "position": "center"},
        "sort_order": 40,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "brand_clean",
        "name": 'Clean Minimalist Brand',
        "description": 'Clean color blocks and generous negative space, ideal for product explainers and brand short videos.',
        "category": ["商业", "极简"],
        "preview_cover": "/static/templates/covers/brand_clean.png",
        "style_prefix": 'Minimalist brand concept illustration, expansive negative space, limited color palette (black and white + one accent color), geometric composition, clean product aesthetic, non-photorealistic, no cluttered collage',
        "negative_prompt": "Cluttered textures, cyberpunk neon, gore, piled-up children's pastels, realistic photos, real people, watermarks, chaotic text in the image",
        "default_ratio": "9:16",
        "shot_duration_min": 3,
        "shot_duration_max": 10,
        "llm_system_addon": 'Commercial copy: selling point → scenario → conclusion. One visual focal point per shot. Maintain a consistent minimalist brand illustration style throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.68,
            "character_prompt": 'Minimalist geometric figure or hand silhouette with a fixed color palette, low-detail face, and consistent appearance throughout',
            "extra_prompt": 'Ample negative space, limited color palette, geometric composition, vertical brand aesthetic',
        },
        "seedance_config": {
            "motion_bias": 'Color blocks shifting slightly, extremely slow push-in, clean and steady',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "urban_editorial", "bgm_mood": 'Minimalist electronica'},
        "subtitle_config": {"font": "DisplaySans", "position": "center"},
        "sort_order": 42,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "pixel_retro",
        "name": 'Pixel Retro Short Video',
        "description": '8-bit/16-bit pixel art, ideal for technology history and gamified explanations.',
        "category": ["复古", "像素"],
        "preview_cover": "/static/templates/covers/pixel_retro.png",
        "style_prefix": 'Retro pixel art, 16-bit limited color palette, crisp pixel blocks, simple game scenes, no anti-aliasing',
        "negative_prompt": 'Smooth gradients, realistic photos, blurry pixels',
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": (
            'Game-level pacing, with key information presented as recognizable pixel icons. When software, systems, or tools are involved, prioritize pixel characters sitting at computers, operating systems, clicking menus, and demonstrating processes like clearing game stages.'
        ),
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": '16-bit pixel operator sitting at a computer, limited color palette, with unchanged appearance and color grading throughout',
            "extra_prompt": 'Pixel character operating a system interface, crisp pixel blocks, no antialiasing, video game level-style scene',
        },
        "seedance_config": {
            "motion_bias": 'Frame-by-frame clicking and screen transitions, slight parallax scrolling',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "retro_host", "bgm_mood": '8-bit curiosity'},
        "subtitle_config": {"font": "PixelFont", "position": "bottom"},
        "sort_order": 50,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "retro_vhs",
        "name": 'Retro VHS',
        "description": 'Tape recording and scanline textures, suitable for nostalgic stories and period-themed content.',
        "category": ["复古", "电影感"],
        "preview_cover": "/static/templates/covers/retro_vhs.png",
        "style_prefix": 'Retro VHS concept illustration, with subtle color fringing and scanline effects, 1980–90s color tones, rounded TV-frame composition, nostalgic atmosphere, non-photorealistic, not a modern ultra-HD UI',
        "negative_prompt": 'Ultra-HD modern advertising, excessive cyberpunk neon, photorealistic photos, real people, children',
        "default_ratio": "16:9",
        "shot_duration_min": 3,
        "shot_duration_max": 12,
        "llm_system_addon": 'Nostalgic storytelling, with narration that may evoke the period. Maintain a consistent VHS illustration texture and character appearance throughout.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": 'Nostalgic illustration character with a fixed period hairstyle and clothing, slight chromatic aberration at the edges, non-photorealistic, and a consistent character design throughout',
            "extra_prompt": 'Scanline hints, slight chromatic aberration, 1980s/1990s color tones, nostalgic composition',
        },
        "seedance_config": {
            "motion_bias": 'Slight VHS jitter, slow push-in, subtle chromatic flicker',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "retro_host", "bgm_mood": 'Nostalgic synthesizer'},
        "subtitle_config": {"font": "SourceHanSans", "position": "bottom"},
        "sort_order": 52,
        "is_active": True,
        "is_premium": False,
    },
    {
        "id": "ink_guofeng",
        "name": 'Ink Wash Chinese Style',
        "description": 'Ink wash negative space and freehand brushstrokes, suitable for short historical and cultural stories.',
        "category": ["国风", "水墨"],
        "preview_cover": "/static/templates/covers/ink_guofeng.png",
        "style_prefix": 'Chinese ink wash freehand illustration, expressive brushstrokes, abundant negative space, poetic atmosphere, elegant ink tones, non-photorealistic',
        "negative_prompt": 'Photorealistic photos, real people, realistic faces, neon, cyberpunk, Japanese anime, Western cartoons, text in the image, subtitles, watermarks',
        "default_ratio": "9:16",
        "shot_duration_min": 4,
        "shot_duration_max": 12,
        "llm_system_addon": 'Narrative focused on atmosphere and turning points, with dialogue that may blend classical and modern vernacular Chinese styles, and a rhythm built around negative space. Suitable for vertical text-and-image content: add a short title and poetic subtitle overlay to each shot, along with readable narration.',
        "seedream_config": {
            "ref_images": [],
            "strength": 0.7,
            "character_prompt": 'Ink-wash freehand figure with simple brows and eyes, a fixed loose-robe or traditional-costume silhouette, elegant light ink tones, and a consistent character design throughout',
            "extra_prompt": 'Ample negative space, light ink washes, poetic mood, room for text overlay at the top of the vertical frame',
        },
        "seedance_config": {
            "motion_bias": 'Ink wash spreading and fading, slow camera rise and descent, drifting mist',
            "character_consistency": True,
        },
        "audio_config": {"voice_preset": "guqin_narrator", "bgm_mood": 'Guzheng ambience'},
        "subtitle_config": {"font": "KaiTi", "position": "top"},
        "sort_order": 60,
        "is_active": True,
        "is_premium": False,
    },
]

TEMPLATES.extend(HUOKE_TEMPLATES)
