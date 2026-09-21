/** 资产详情操作框：预览图、上传/生图提示词编辑、生成/音色、形象历史版本 */
import { useEffect, useRef, useState } from 'react'
import { dramaApi, resolveDramaAssetPreviewUrl, type DramaAsset } from '../../api/drama'
import Modal from '../../components/ui/Modal'
import { readVisualPrompt } from '../../lib/dramaVisualPrompt'
import { dramaAssetHasImage } from '../../lib/dramaAssetImage'
import {
  formatAssetImageVersionLabel,
  readAssetImageVersions,
  resolveAssetImageVersionUrl,
} from '../../lib/dramaAssetImageVersions'
import { readAssetVoiceBinding } from './CharacterVoiceBindModal'
import { DramaImageLightbox } from './DramaImageLightbox'

type Props = {
  asset: DramaAsset
  open: boolean
  busy?: boolean
  genLabel?: string
  onClose: () => void
  onUpdated: (asset: DramaAsset) => void
  onGenerate: (asset: DramaAsset) => void
  onBindVoice?: (asset: DramaAsset) => void
  onDelete?: (asset: DramaAsset) => void
  onError: (message: string) => void
}

// 将编辑后的提示词写回 params.visualPrompt
function buildPromptParams(asset: DramaAsset, prompt: string): Record<string, unknown> {
  const prev = (asset.params || {}) as Record<string, unknown>
  const kind = (asset.type || '').toLowerCase()
  const next: Record<string, unknown> = {
    ...prev,
    visualPrompt: prompt.trim(),
  }
  if (kind === 'character' || kind === 'scene') {
    next.visualImage = prompt.trim()
  }
  return next
}

// 渲染资产详情操作弹窗
export function DramaAssetDetailModal({
  asset,
  open,
  busy = false,
  genLabel = "Generate Image",
  onClose,
  onUpdated,
  onGenerate,
  onBindVoice,
  onDelete,
  onError,
}: Props) {
  /*
   * promptDraft 提示词草稿
   * saving 保存中
   * uploading 上传图片中
   * restoringVersionId 正在还原的版本
   * lightboxSrc 放大预览图 URL
   */
  const [promptDraft, setPromptDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const mediaSrc = resolveDramaAssetPreviewUrl(asset)
  const hasImage = dramaAssetHasImage(asset)
  const voice = readAssetVoiceBinding(asset)
  const isCharacter = (asset.type || '').toLowerCase() === 'character'
  const isScene = (asset.type || '').toLowerCase() === 'scene'
  const isProp =
    (asset.type || '').toLowerCase() === 'prop' ||
    (asset.type || '').toLowerCase() === 'material'
  const deleteLabel = isScene ? "Delete Scene" : isProp ? "Delete Prop" : "Delete Character"
  const canDelete = Boolean(onDelete) && (isCharacter || isScene || isProp)
  const dirty = promptDraft.trim() !== readVisualPrompt(asset).trim()
  const imageVersions = readAssetImageVersions(asset)
  const actionBusy = busy || saving || uploading || Boolean(restoringVersionId)

  useEffect(() => {
    if (!open) return
    setPromptDraft(readVisualPrompt(asset))
    setLightboxSrc(null)
    setRestoringVersionId(null)
  }, [open, asset])

  // 保存提示词到资产 params
  async function savePrompt() {
    const text = promptDraft.trim()
    if (!text) {
      onError("Prompt cannot be empty")
      return
    }
    setSaving(true)
    try {
      const updated = await dramaApi.updateAsset(asset.id, {
        params: buildPromptParams(asset, text),
      })
      onUpdated(updated)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setSaving(false)
    }
  }

  // 先保存脏提示词再触发生图
  async function handleGenerate() {
    if (dirty) {
      const text = promptDraft.trim()
      if (!text) {
        onError("Prompt cannot be empty")
        return
      }
      setSaving(true)
      try {
        const updated = await dramaApi.updateAsset(asset.id, {
          params: buildPromptParams(asset, text),
        })
        onUpdated(updated)
        onGenerate(updated)
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to save prompt")
      } finally {
        setSaving(false)
      }
      return
    }
    onGenerate(asset)
  }

  // 本地上传图片，视为已出图
  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const updated = await dramaApi.uploadAssetMedia(asset.id, file)
      onUpdated(updated)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload Failed")
    } finally {
      setUploading(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    }
  }

  // 将历史形象还原为当前
  async function handleRestoreVersion(versionId: string) {
    setRestoringVersionId(versionId)
    try {
      const updated = await dramaApi.activateAssetImageVersion(asset.id, versionId)
      onUpdated(updated)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Restore failed")
    } finally {
      setRestoringVersionId(null)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={asset.name || "Asset Details"}
        size="lg"
        className="drama-asset-detail-modal"
        dismissible={!lightboxSrc}
        footer={
          <div className="drama-modal-actions">
            <button type="button" className="pf-btn" onClick={onClose}>
              {"Close"}</button>
            <button
              type="button"
              className="pf-btn"
              disabled={saving || !dirty || actionBusy}
              onClick={() => void savePrompt()}
            >
              {saving ? "Saving…" : "Save Prompt"}
            </button>
            <button
              type="button"
              className="pf-btn drama-btn-primary"
              disabled={actionBusy || !promptDraft.trim()}
              onClick={() => void handleGenerate()}
            >
              {busy ? "Generating…" : genLabel}
            </button>
          </div>
        }
      >
        <div className="drama-asset-detail">
          <button
            type="button"
            className="drama-asset-detail-media"
            disabled={!mediaSrc}
            title={mediaSrc ? "Click to enlarge" : undefined}
            onClick={() => mediaSrc && setLightboxSrc(mediaSrc)}
          >
            {mediaSrc ? (
              <img key={mediaSrc} src={mediaSrc} alt={asset.name || ''} />
            ) : (
              <div className="drama-asset-placeholder">{asset.type || 'asset'}</div>
            )}
          </button>

          <p className="drama-muted drama-asset-detail-meta">
            {asset.type}
            {hasImage ? " · Image Generated" : " · Image Not Generated"}
            {isCharacter && voice ? ` · Voice Bound: ${voice.label}` : ''}
            {mediaSrc ? " · Click image to enlarge" : ''}
          </p>

          <div className="drama-asset-detail-extra">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={actionBusy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
            <button
              type="button"
              className="pf-btn pf-btn-sm"
              disabled={actionBusy}
              onClick={() => uploadInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : hasImage ? "Replace Image" : "Upload Image"}
            </button>
            {isCharacter && onBindVoice ? (
              <button
                type="button"
                className="pf-btn pf-btn-sm"
                onClick={() => onBindVoice(asset)}
              >
                {voice ? "Replace Voice" : "Bind voice"}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="pf-btn pf-btn-sm drama-btn-danger-text"
                disabled={actionBusy}
                onClick={() => onDelete?.(asset)}
              >
                {deleteLabel}
              </button>
            ) : null}
          </div>

          {imageVersions.length > 0 ? (
            <section className="drama-asset-image-versions" aria-label={"Character Image History"}>
              <header className="drama-asset-image-versions-head">
                <strong>{"Version History"}</strong>
                <span className="drama-muted">{imageVersions.length} {"items"}</span>
              </header>
              <ul className="drama-asset-image-versions-list">
                {imageVersions.map((version) => {
                  const thumb = resolveAssetImageVersionUrl(version)
                  const restoring = restoringVersionId === version.id
                  return (
                    <li key={version.id} className="drama-asset-image-version">
                      <button
                        type="button"
                        className="drama-asset-image-version-thumb"
                        title={"Click to enlarge"}
                        onClick={() => setLightboxSrc(thumb)}
                      >
                        <img src={thumb} alt="" />
                      </button>
                      <div className="drama-asset-image-version-meta">
                        <span>{formatAssetImageVersionLabel(version)}</span>
                        {version.createdAt ? (
                          <small className="drama-muted">
                            {version.createdAt.replace('T', ' ').slice(0, 16)}
                          </small>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="pf-btn pf-btn-sm"
                        disabled={actionBusy}
                        onClick={() => void handleRestoreVersion(version.id)}
                      >
                        {restoring ? "Restoring…" : "Restore"}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <label className="drama-field">
            <span>{"Image Generation Prompt"}</span>
            <textarea
              rows={8}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder={"Describe the appearance, composition, lighting, and style…"}
            />
          </label>
        </div>
      </Modal>

      {lightboxSrc ? (
        <DramaImageLightbox
          src={lightboxSrc}
          alt={asset.name || "Preview"}
          onClose={() => setLightboxSrc(null)}
        />
      ) : null}
    </>
  )
}
