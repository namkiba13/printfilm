/** Drama image style options (aligned with manju imageStyles). */

export const IMAGE_STYLE_IDS = [
  'retro-sci-fi-atompunk',
  'palace-intrigue-cold',
  'domestic-suspense-cold',
  'ancient-romance-soft',
  'ancient-chinese-mythology',
  'japanese-youth-film',
  'japanese-daily-natural',
  'korean-urban-soft',
  'chinese-urban-realistic',
  'wuxia-realistic-photo',
  '90s-realistic-film',
  'retro-narrative-film',
  'american-retro-hollywood',
  'neon-cyberpunk-film',
  '90s-rural-china-film',
  'cgi-3d-animation',
  'ghibli-handdrawn-anime',
  'tezuka-era-cartoon',
  'shanghai-animation',
  'pixel-art',
  'shadow-puppet-illustration',
] as const

export type ImageStyleId = (typeof IMAGE_STYLE_IDS)[number]

export const IMAGE_STYLE_OPTIONS: Array<{ id: ImageStyleId; label: string }> = [
  { id: 'retro-sci-fi-atompunk', label: "Retro sci-fi atomic punk" },
  { id: 'palace-intrigue-cold', label: "Palace intrigue, cold and austere" },
  { id: 'domestic-suspense-cold', label: "Chinese suspense, cool tones" },
  { id: 'ancient-romance-soft', label: "Chinese historical romance, soft light" },
  { id: 'ancient-chinese-mythology', label: "Epic ancient Chinese mythology" },
  { id: 'japanese-youth-film', label: "Japanese youth film" },
  { id: 'japanese-daily-natural', label: "Japanese slice-of-life, natural" },
  { id: 'korean-urban-soft', label: "K-drama urban soft light" },
  { id: 'chinese-urban-realistic', label: "Chinese urban realism" },
  { id: 'wuxia-realistic-photo', label: "Wuxia jianghu realistic cinematography" },
  { id: '90s-realistic-film', label: "1990s realist cinema" },
  { id: 'retro-narrative-film', label: "Retro narrative cinema" },
  { id: 'american-retro-hollywood', label: "American retro Hollywood" },
  { id: 'neon-cyberpunk-film', label: "Neon cyberpunk cinema" },
  { id: '90s-rural-china-film', label: "1990s Chinese rural cinema" },
  { id: 'cgi-3d-animation', label: "3D animation" },
  { id: 'ghibli-handdrawn-anime', label: "Hand-drawn in the style of Hayao Miyazaki" },
  { id: 'tezuka-era-cartoon', label: "Cartoon style of the Osamu Tezuka era" },
  { id: 'shanghai-animation', label: "Shanghai Animation Film Studio style" },
  { id: 'pixel-art', label: "Pixel art" },
  { id: 'shadow-puppet-illustration', label: "Shadow puppetry illustration" },
]

export const EPISODE_COUNT_PRESETS = [1, 12, 24, 36, 48] as const

export function getImageStyleLabel(styleId: string | undefined | null): string | null {
  if (!styleId) return null
  return IMAGE_STYLE_OPTIONS.find((o) => o.id === styleId)?.label ?? null
}
