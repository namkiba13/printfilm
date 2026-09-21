/** 分集编辑右侧：分段视频预览 + 入口打开全屏分镜画布 */
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { DramaFragment } from '../../api/drama'
import { DramaSubtitleBoard } from '../../components/drama/DramaSubtitleBoard'
import { DramaFragmentSegmentedVideoPlayer } from '../../components/drama/DramaFragmentSegmentedVideoPlayer'
import { triggerBlobDownload } from '../../lib/clientDownload'
import {
  composeEpisodeVideoClient,
  episodeComposeFilename,
  listEpisodeComposeClips,
  type EpisodeComposeProgress,
} from '../../lib/composeEpisodeVideoClient'
import { dialog } from '../../lib/dialog'
import type { DramaSubtitleMode } from '../../lib/dramaSubtitleBoard'

type Props = {
  fragments: DramaFragment[]
  playingFragmentId: number | null
  onPlayingFragmentChange: (fragmentId: number) => void
  aspectRatio: string
  episodeId?: number
  episodeName?: string
  subtitleMode: DramaSubtitleMode
  onOpenStoryboard: () => void
  /** 预览历史版本时覆盖当前镜 video src */
  previewVideoUrl?: string | null
  previewPosterUrl?: string | null
  previewLabel?: string
  onClearPreview?: () => void
  onActivatePreview?: () => void
}

/** 把合成进度转成按钮文案 */
function composeProgressLabel(progress: EpisodeComposeProgress | null, busy: boolean) {
  if (!busy) return "Download full video"
  if (!progress) return "Compositing full video…"
  if (progress.phase === 'download') return `Fetch shots ${progress.done}/${progress.total}`
  if (progress.phase === 'server') return "Server-side unified re-encoding and stitching…"
  return "Stitching…"
}

// 渲染分集右侧预览与画布入口
export function EpisodeEditSidePane({
  fragments,
  playingFragmentId,
  onPlayingFragmentChange,
  aspectRatio,
  episodeId,
  episodeName = "This Episode",
  subtitleMode,
  onOpenStoryboard,
  previewVideoUrl = null,
  previewPosterUrl = null,
  previewLabel = '',
  onClearPreview,
  onActivatePreview,
}: Props) {
  const hasSelection = playingFragmentId !== null
  /*
   * composeBusy 本地拼接中
   * composeProgress 拉取/拼接进度
   * composeError 失败原因
   */
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeProgress, setComposeProgress] = useState<EpisodeComposeProgress | null>(null)
  const [composeError, setComposeError] = useState('')
  const composeClips = listEpisodeComposeClips(fragments)
  const missingCount = fragments.length - composeClips.length

  // 浏览器内拼接已生成镜头并下载成片
  async function handleComposeDownload() {
    if (composeBusy || composeClips.length === 0) return
    if (missingCount > 0) {
      const ok = await dialog.confirm({
        title: "Some shots have not been generated",
        message: `${missingCount} shots have no video yet. Only the ${composeClips.length} generated shots will be stitched. Continue?`,
        confirmText: "Continue compositing",
      })
      if (!ok) return
    }
    setComposeError('')
    setComposeBusy(true)
    setComposeProgress({ phase: 'download', done: 0, total: composeClips.length })
    try {
      const blob = await composeEpisodeVideoClient(composeClips, setComposeProgress, {
        episodeId,
      })
      triggerBlobDownload(blob, episodeComposeFilename(episodeName))
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Full video composition failed")
    } finally {
      setComposeBusy(false)
      setComposeProgress(null)
    }
  }

  return (
    <aside className="drama-ep-preview">
      <div className="drama-ep-side-header">
        <div className="drama-ep-side-tabs" role="tablist" aria-label={"Right panel"}>
          <button type="button" role="tab" aria-selected className="active">
            {"Preview"}</button>
          <button type="button" role="tab" onClick={onOpenStoryboard}>
            {"Canvas"}</button>
        </div>
        <button
          type="button"
          className="drama-ep-compose-btn drama-ep-compose-btn--header"
          disabled={composeBusy || composeClips.length === 0}
          title={
            composeClips.length === 0
              ? "Please generate storyboard videos first"
              : "Stitch the generated shots from this episode into one video in the browser and download it"
          }
          onClick={() => void handleComposeDownload()}
        >
          {composeBusy ? (
            <Loader2 size={14} className="drama-ep-compose-spin" />
          ) : (
            <Download size={14} strokeWidth={1.8} />
          )}
          {composeProgressLabel(composeProgress, composeBusy)}
        </button>
      </div>
      {composeError ? <p className="drama-ep-compose-error drama-ep-compose-error--header">{composeError}</p> : null}

      {previewVideoUrl ? (
        <div className="drama-ep-preview-banner">
          <span>{"Preview historical version"}{previewLabel ? ` · ${previewLabel}` : ''}</span>
          <div className="drama-ep-preview-banner-actions">
            {onActivatePreview ? (
              <button type="button" className="drama-ep-preview-banner-btn" onClick={onActivatePreview}>
                {"Set as current"}</button>
            ) : null}
            {onClearPreview ? (
              <button type="button" className="drama-ep-preview-banner-btn is-ghost" onClick={onClearPreview}>
                {"Exit preview"}</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hasSelection || fragments.length === 0 ? (
        <p className="drama-ep-empty">{"Please select a shot from the bottom section"}</p>
      ) : (
        <>
          <div className="drama-ep-preview-inner">
            <DramaFragmentSegmentedVideoPlayer
              fragments={fragments}
              playingFragmentId={playingFragmentId}
              onPlayingFragmentChange={onPlayingFragmentChange}
              aspectRatio={aspectRatio}
              overrideVideoUrl={previewVideoUrl}
              overridePosterUrl={previewPosterUrl}
            />
            {!fragments.some((f) => f.video) && (
              <button type="button" className="drama-ep-open-canvas" onClick={onOpenStoryboard}>
                {"Open storyboard canvas"}</button>
            )}
          </div>
          <DramaSubtitleBoard
            fragments={fragments}
            episodeName={episodeName}
            subtitleMode={subtitleMode}
          />
        </>
      )}
    </aside>
  )
}
