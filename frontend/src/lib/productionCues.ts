/** English editor notation; readers also accept stored legacy production markers. */
export const SUBTITLE_CUE = "【Subtitles: post-production captions in the narration's language, synchronized sentence by sentence】"
export const DRAMA_SUBTITLE_CUE = "【Subtitles: bottom-center captions in the dialogue's language, synchronized sentence by sentence】"
export const NARRATION_PREFIX = '【Narration·natural pace·synced captions】'
export const DRAMA_NARRATION_PREFIX = '【Narration·slow and clear·synced captions】'
export const DIALOGUE_PREFIX = '【Dialogue·slow and clear·synced captions】'
export const VISUAL_PREFIX = '【Visual·ambient sound only, no voiceover】'

export const VOICE_CUE_PREFIX_RE = /^【(?:Narration|Dialogue|Inner monologue|旁白|对白|内心独白)[^】]*】\s*/i
export const VISUAL_CUE_PREFIX_RE = /^【(?:Visual|Establishing shot|画面|空镜)[^】]*】\s*/i
export const NARRATION_LINE_PREFIX = /^【(?:Narration|旁白)[^】]*】\s*/i
export const SUBTITLE_CUE_PREFIX_RE = /^【(?:Subtitles|字幕)(?:[·:：]|】)/i
export const CHARACTER_INTRO_CUE_RE = /^【(?:Character intro|人物介绍)(?:[·:：]|】)/i
export const PRODUCTION_META_RE = /^【(?:Subtitles|BGM|Music|Character intro|Opening|Background|Production rules|字幕|配乐|人物介绍|片头|背景介绍|强制约束)(?:[·:：]|】)/i
export const VISUAL_SHOT_LABEL_RE = /^(?:空镜|画面|远景|近景|中景|全景|特写|大特写|跟拍|俯拍|仰拍|航拍|推镜|拉镜|摇镜|环境|镜头|动作|转场|闪回|建立镜头|气氛镜头|Establishing Shot|Long Shot|Wide Shot|Medium Shot|Close Shot|Close-up|Extreme Close-up|Atmospheric Shot|Push-in|Pull-out|Pan|Tracking Shot|Follow Shot|High-angle Shot|Low-angle Shot|Aerial Shot|Visual|Action|Toàn cảnh|Cận cảnh|Trung cảnh|Đặc tả|Hành động|Góc rộng)\s*[：:]/i
