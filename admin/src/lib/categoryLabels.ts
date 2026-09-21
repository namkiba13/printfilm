// Presentation labels are English; existing category identifiers remain unchanged in API requests.
const labels: Record<string, string> = {
  开源: 'Open Source', 科普: 'Short Video', 获客: 'Lead Generation', 纪录片: 'Documentary',
  写实感: 'Photorealistic', 真人感: 'Live Action', 电影感: 'Cinematic', 儿童: 'Children',
  动漫: 'Anime', 国风: 'Chinese Style', 科幻: 'Sci-Fi', 奇幻: 'Fantasy', 悬疑: 'Suspense',
  商业: 'Commercial', 复古: 'Retro', 图文: 'Image & Text', 绘本: 'Picture Book',
  故事: 'Story', 摄影: 'Photography', 胶片: 'Film', 剪纸: 'Paper Cut', 手绘: 'Hand-Drawn',
  赛博: 'Cyberpunk', 拼贴: 'Collage', 极简: 'Minimalist', 像素: 'Pixel Art', 水墨: 'Ink Painting',
}

export function categoryLabel(value: string): string {
  return labels[value] || value
}

export function categoryCode(value: string): string {
  return Object.keys(labels).find(key => labels[key].toLowerCase() === value.trim().toLowerCase()) || value.trim()
}
