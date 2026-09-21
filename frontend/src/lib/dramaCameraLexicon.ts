/**
 * 漫剧运镜 / 景别词库（对齐 docs/EPISODE_RULES.md §5）
 * 供分集编辑 @ 菜单插入画面行前缀或运镜短语
 */

export type DramaCameraLexiconGroup = 'shot' | 'move'

export type DramaCameraLexiconItem = {
  id: string
  group: DramaCameraLexiconGroup
  /** 列表展示名 */
  label: string
  /** 插入到脚本的文本（用户可继续补描写） */
  insert: string
  /** 一行说明 */
  hint: string
}

/** 景别标签：写入画面行，勿标成对白 */
export const DRAMA_SHOT_SIZE_LEXICON: DramaCameraLexiconItem[] = [
  { id: 'empty', group: 'shot', label: "Establishing Shot", insert: "Establishing Shot:", hint: "Establish the setting, with no dialogue or narration" },
  { id: 'wide', group: 'shot', label: "Long Shot", insert: "Long Shot:", hint: "Establish the spatial relationships" },
  { id: 'full', group: 'shot', label: "Wide Shot", insert: "Wide Shot:", hint: "Full body with the environment in frame" },
  { id: 'medium', group: 'shot', label: "Medium Shot", insert: "Medium Shot:", hint: "Above the waist; commonly used for dialogue" },
  { id: 'close', group: 'shot', label: "Close Shot", insert: "Close Shot:", hint: "Above the chest; emphasizes emotion" },
  { id: 'closeup', group: 'shot', label: "Close-up", insert: "Close-up:", hint: "Face or key prop" },
  { id: 'ecu', group: 'shot', label: "Extreme Close-up", insert: "Extreme Close-up:", hint: "Eyes, hands, or details" },
  { id: 'establish', group: 'shot', label: "Establishing Shot", insert: "Establishing Shot:", hint: "Sets the scene and atmosphere at the opening" },
  { id: 'atmosphere', group: 'shot', label: "Atmospheric Shot", insert: "Atmospheric Shot:", hint: "Light and shadow, weather, or objects enhance the mood" },
]

/** 运镜短语：单段运动轴建议 ≤ 2 */
export const DRAMA_CAMERA_MOVE_LEXICON: DramaCameraLexiconItem[] = [
  { id: 'push', group: 'move', label: "Push-in", insert: "Push-in:", hint: "Camera moves forward toward the subject" },
  { id: 'pull', group: 'move', label: "Pull-out", insert: "Pull-out:", hint: "Camera moves backward to reveal the space" },
  { id: 'pan', group: 'move', label: "Pan", insert: "Pan:", hint: "Camera position stays fixed while scanning horizontally or vertically" },
  { id: 'truck', group: 'move', label: "Tracking Shot", insert: "Tracking Shot:", hint: "Camera moves laterally to follow the subject" },
  { id: 'follow', group: 'move', label: "Follow Shot", insert: "Follow Shot:", hint: "Follows the character's movement" },
  { id: 'high', group: 'move', label: "High-angle Shot", insert: "High-angle Shot:", hint: "High angle looking downward" },
  { id: 'low', group: 'move', label: "Low-angle Shot", insert: "Low-angle Shot:", hint: "Low angle looking upward" },
  { id: 'aerial', group: 'move', label: "Aerial Shot", insert: "Aerial Shot:", hint: "Extreme wide overhead view" },
]

/** 合并词库（插入列表用） */
export const DRAMA_CAMERA_LEXICON: DramaCameraLexiconItem[] = [
  ...DRAMA_SHOT_SIZE_LEXICON,
  ...DRAMA_CAMERA_MOVE_LEXICON,
]

/** 运镜使用提示（只展示，不插入） */
export const DRAMA_CAMERA_USAGE_TIPS = [
  "Formula: Subject + Action + Setting + (Shot Size/Camera Movement) + (Lighting)",
  "Each segment: ≤ 2 motion axes (push + pan is fine; push + pan + rise is prone to losing control)",
  "Large rotations in close-ups can distort faces; reserve orbit shots for medium shots and wider",
  "Empty shots/shot sizes must be written as visuals; do not label them as dialogue or voiceover",
] as const

// 按关键字过滤词库（匹配 label / insert / hint）
export function filterDramaCameraLexicon(
  items: DramaCameraLexiconItem[],
  query: string,
): DramaCameraLexiconItem[] {
  const q = (query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.insert.toLowerCase().includes(q) ||
      item.hint.toLowerCase().includes(q),
  )
}
