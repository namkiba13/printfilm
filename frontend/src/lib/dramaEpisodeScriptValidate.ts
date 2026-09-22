/**
 * 漫剧分镜脚本校验（对齐 docs/EPISODE_RULES.md §3 / §9）
 * 用于生成前告警：时长、空镜误标对白、资产缺图/缺音色
 */
import type { DramaAsset, DramaFragment } from '../api/drama'
import {
  DRAMA_SEGMENT_DURATION_HARD_MAX,
  DRAMA_SEGMENT_DURATION_MAX,
  DRAMA_SEGMENT_DURATION_MIN,
  DRAMA_SHOT_DURATION_HARD_MAX,
  FRAGMENT_CONTENT_DURATION_MAX,
} from './dramaEpisodePromptEditor'
import { extractDurations, sumDuration } from './segmentDuration'
import { DRAMA_VOICE_BINDING_ENABLED } from './dramaVoiceBinding'
import {
  DIALOGUE_PREFIX, DRAMA_NARRATION_PREFIX, DRAMA_SUBTITLE_CUE, VISUAL_PREFIX,
  PRODUCTION_META_RE, VISUAL_CUE_PREFIX_RE, VISUAL_SHOT_LABEL_RE, VOICE_CUE_PREFIX_RE,
} from './productionCues'
export { DIALOGUE_PREFIX, DRAMA_NARRATION_PREFIX, DRAMA_SUBTITLE_CUE, VISUAL_PREFIX }

export type DramaScriptIssue = {
  level: 'error' | 'warn'
  message: string
}

// 去掉对白/旁白生产前缀
function stripVoiceCuePrefix(line: string): string {
  return (line || '').replace(VOICE_CUE_PREFIX_RE, '').trim()
}

// 角色是否已绑定可提交的参考音频
function assetHasVoiceBinding(asset: DramaAsset): boolean {
  const params = (asset.params || {}) as Record<string, unknown>
  const raw = params.voiceAudio
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>
    const url =
      typeof data.url === 'string'
        ? data.url
        : typeof data.previewUrl === 'string'
          ? data.previewUrl
          : ''
    if (url.trim()) return true
  }
  const canvas = params.canvas
  if (canvas && typeof canvas === 'object') {
    const voiceAudio = (canvas as Record<string, unknown>).voiceAudio
    if (voiceAudio && typeof voiceAudio === 'object') {
      const url = (voiceAudio as Record<string, unknown>).url
      if (typeof url === 'string' && url.trim()) return true
    }
  }
  return false
}

// 合并正文 @asset 与 asset_ids
function listFragmentAssetIds(frag: DramaFragment): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  const re = /@asset:(\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(frag.content || ''))) {
    const id = Number(m[1])
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  for (const id of frag.asset_ids || []) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

// 判断正文是否为纯画面 / 空镜描写
export function isVisualDescriptionBody(text: string): boolean {
  let body = stripVoiceCuePrefix((text || '').trim())
  body = body.replace(VISUAL_CUE_PREFIX_RE, '').trim()
  if (!body) return false
  if (VISUAL_SHOT_LABEL_RE.test(body)) return true
  if (body.startsWith('空镜') || body.startsWith('△') || body.startsWith('Δ')) return true
  return false
}

// 脚本是否含真实口播意图（排除空镜冒号）
function scriptLikelyNeedsVoice(content: string): boolean {
  for (const raw of (content || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('@duration:')) continue
    if (PRODUCTION_META_RE.test(line)) {
      continue
    }
    if (VOICE_CUE_PREFIX_RE.test(line)) {
      if (!isVisualDescriptionBody(line)) return true
      continue
    }
    if (isVisualDescriptionBody(line)) continue
    if (/^[^：:\n]{1,80}[：:]/.test(line) && !VISUAL_SHOT_LABEL_RE.test(line)) {
      return true
    }
  }
  return false
}

// 校验单镜脚本：时长 + 空镜误标
export function validateDramaFragmentScript(content: string): DramaScriptIssue[] {
  const issues: DramaScriptIssue[] = []
  const durations = extractDurations(content || '')
  const total = sumDuration(content || '')

  const badSegment = durations.find(
    (value) =>
      !Number.isFinite(value) ||
      value < DRAMA_SEGMENT_DURATION_MIN ||
      value > DRAMA_SEGMENT_DURATION_HARD_MAX,
  )
  if (badSegment != null) {
    issues.push({
      level: 'error',
      message: `A single @duration must be between ${DRAMA_SEGMENT_DURATION_MIN}–${DRAMA_SEGMENT_DURATION_HARD_MAX} seconds`,
    })
  } else if (durations.some((value) => value > DRAMA_SEGMENT_DURATION_MAX)) {
    issues.push({
      level: 'warn',
      message: `Some @duration values exceed the new Storyboard recommendation of ${DRAMA_SEGMENT_DURATION_MAX}s; legacy scripts can still be generated`,
    })
  }

  if (total > DRAMA_SHOT_DURATION_HARD_MAX) {
    issues.push({
      level: 'error',
      message: `This shot's @duration totals ${total}s, exceeding Seedance's ${DRAMA_SHOT_DURATION_HARD_MAX}s limit`,
    })
  } else if (total > FRAGMENT_CONTENT_DURATION_MAX) {
    issues.push({
      level: 'warn',
      message: `This shot's @duration totals ${total}s, exceeding the new Storyboard recommendation of ${FRAGMENT_CONTENT_DURATION_MAX}s (legacy scripts can still be generated)`,
    })
  }

  for (const raw of (content || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('@duration:')) continue
    if (PRODUCTION_META_RE.test(line)) {
      continue
    }
    if (VOICE_CUE_PREFIX_RE.test(line) && isVisualDescriptionBody(line)) {
      issues.push({
        level: 'error',
        message:
          "Detected that an \"empty shot/shot size\" is labeled as dialogue or voiceover (it will be spoken aloud and subtitles will be burned in). Change it to \"[Visuals · ambient sound only, no voiceover]\" or a visuals-only line such as \"Empty shot: ...\"",
      })
      break
    }
  }

  return issues
}

// 校验本镜关联资产：缺图 / 说话角色缺音色（警告级，可继续生成）
export function validateDramaFragmentAssets(
  frag: DramaFragment | null | undefined,
  assets: DramaAsset[],
): DramaScriptIssue[] {
  const issues: DramaScriptIssue[] = []
  if (!frag) return issues

  const byId = new Map(assets.map((a) => [a.id, a]))
  const ids = listFragmentAssetIds(frag)
  const needsVoice = scriptLikelyNeedsVoice(frag.content || '')

  const missingImage: string[] = []
  const missingVoice: string[] = []

  for (const id of ids) {
    const asset = byId.get(id)
    if (!asset) {
      missingImage.push(`#${id}`)
      continue
    }
    const kind = (asset.type || '').toLowerCase()
    const hasImage = Boolean((asset.cover || asset.url || '').trim())
    if ((kind === 'character' || kind === 'scene' || kind === 'prop') && !hasImage) {
      missingImage.push(asset.name || `#${id}`)
    }
    if (DRAMA_VOICE_BINDING_ENABLED && kind === 'character' && needsVoice && !assetHasVoiceBinding(asset)) {
      missingVoice.push(asset.name || `#${id}`)
    }
  }

  if (missingImage.length > 0) {
    issues.push({
      level: 'warn',
      message: `The following assets have no reference images and may be automatically supplemented during generation or produce unstable results: ${missingImage.slice(0, 5).join('、')}${missingImage.length > 5 ? '…' : ''}`,
    })
  }

  if (missingVoice.length > 0) {
    issues.push({
      level: 'warn',
      message: `The script contains dialogue, but the following characters have no voice assigned: ${missingVoice.slice(0, 5).join('、')}${missingVoice.length > 5 ? '…' : ''}`,
    })
  }

  return issues
}

// 合并脚本与资产问题；有 error 则不可直接生成
export function collectDramaGenerateGateIssues(
  frag: DramaFragment | null | undefined,
  assets: DramaAsset[],
): { blocking: DramaScriptIssue[]; warnings: DramaScriptIssue[] } {
  const scriptIssues = validateDramaFragmentScript(frag?.content || '')
  const assetIssues = validateDramaFragmentAssets(frag, assets)
  const all = [...scriptIssues, ...assetIssues]
  return {
    blocking: all.filter((i) => i.level === 'error'),
    warnings: all.filter((i) => i.level === 'warn'),
  }
}

// 把问题列表拼成确认框文案
export function formatDramaGateMessage(
  blocking: DramaScriptIssue[],
  warnings: DramaScriptIssue[],
  baseMessage: string,
): string {
  const parts = [baseMessage]
  if (blocking.length > 0) {
    parts.push('', "[Must fix first]", ...blocking.map((i) => `· ${i.message}`))
  }
  if (warnings.length > 0) {
    parts.push('', "[Recommended action; you can still continue]", ...warnings.map((i) => `· ${i.message}`))
  }
  return parts.join('\n')
}
