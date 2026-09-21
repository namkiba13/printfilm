/** 分集编辑：左侧资产栏（本集/全集 + 分类卡片） */
import { resolveDramaAssetPreviewUrl, type DramaAsset } from '../../api/drama'
import { CharacterVoicePreviewButton } from '../../components/drama/CharacterVoicePreviewButton'
import { readAssetVoiceBinding } from './CharacterVoiceBindModal'
import { DRAMA_VOICE_BINDING_ENABLED } from '../../lib/dramaVoiceBinding'
import {
  ASSET_TABS,
  normalizeAssetTab,
  type AssetScope,
  type AssetTab,
} from './dramaEpisodeEditUtils'

type Props = {
  scope: AssetScope
  tab: AssetTab | null
  assets: DramaAsset[]
  activeIds?: Set<number>
  imageBusyIds?: ReadonlySet<number>
  createBusy?: boolean
  onScopeChange: (scope: AssetScope) => void
  onTabChange: (tab: AssetTab | null) => void
  onOpenCanvas: () => void
  /** 打开资产详情：编辑提示词 / 重新生成 / 上传 */
  onOpenAsset: (asset: DramaAsset) => void
  /** 插入 @asset 到当前分镜脚本 */
  onMention: (asset: DramaAsset) => void
  /** 取消当前分镜对该资产的关联（不删除资产） */
  onUnlinkAsset?: (assetId: number) => void
  onGenerateVoice?: (asset: DramaAsset) => void
  voiceBusyIds?: ReadonlySet<number>
  onVoiceError?: (message: string) => void
  /** 自定义新建当前分类资产 */
  onCreateAsset?: () => void
  /** 从全局资产库导入 */
  onImportAsset?: () => void
}

// 当前分类新建按钮文案
function createLabel(tab: AssetTab | null): string {
  if (tab === 'scene') return "Create Scene"
  if (tab === 'prop') return "Create Prop"
  return "Create Character"
}

// 渲染分集编辑左侧资产栏
export function EpisodeEditAssetPanel({
  scope,
  tab,
  assets,
  activeIds,
  imageBusyIds,
  createBusy,
  onScopeChange,
  onTabChange,
  onOpenCanvas,
  onOpenAsset,
  onMention,
  onUnlinkAsset,
  onGenerateVoice,
  voiceBusyIds,
  onVoiceError,
  onCreateAsset,
  onImportAsset,
}: Props) {
  return (
    <aside className="drama-ep-assets">
      <div className="drama-ep-assets-top">
        <div className="drama-ep-scope">
          <button
            type="button"
            className={scope === 'episode' ? 'active' : ''}
            onClick={() => onScopeChange('episode')}
          >
            {"This Episode"}</button>
          <button
            type="button"
            className={scope === 'series' ? 'active' : ''}
            onClick={() => onScopeChange('series')}
          >
            {"Entire Series"}</button>
        </div>
        <button
          type="button"
          className="drama-ep-icon-btn solid"
          aria-label={"Open Storyboard Canvas"}
          onClick={onOpenCanvas}
        >
          +
        </button>
      </div>
      <div className="drama-ep-asset-tabs">
        {ASSET_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? 'active' : ''}
            onClick={() => onTabChange(tab === item.key ? null : item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {onCreateAsset || onImportAsset ? (
        <div className="drama-ep-asset-actions">
          {onCreateAsset ? (
            <button
              type="button"
              className="drama-ep-asset-action-btn"
              disabled={createBusy}
              onClick={onCreateAsset}
            >
              {createBusy ? "Creating…" : createLabel(tab)}
            </button>
          ) : null}
          {onImportAsset ? (
            <button
              type="button"
              className="drama-ep-asset-action-btn is-ghost"
              disabled={createBusy}
              onClick={onImportAsset}
            >
              {"Import"}</button>
          ) : null}
        </div>
      ) : null}
      <div className="drama-ep-asset-grid">
        {assets.length === 0 ? (
          <p className="drama-ep-empty">
            {scope === 'episode'
              ? "No referenced assets in this episode. Click “Create” above to add one, or switch to “Entire Series” to view project assets."
              : "No assets yet. Click “Create / Import” above to add one."}
          </p>
        ) : (
          assets.map((asset) => {
            const cover = resolveDramaAssetPreviewUrl(asset)
            const isScene = normalizeAssetTab(asset.type) === 'scene'
            const isCharacter = normalizeAssetTab(asset.type) === 'character'
            const voice = isCharacter ? readAssetVoiceBinding(asset) : null
            const isActive = activeIds?.has(asset.id)
            const voiceGenerating = voiceBusyIds?.has(asset.id) ?? false
            const imageBusy = imageBusyIds?.has(asset.id) ?? false
            return (
              <div key={asset.id} className="drama-ep-asset-card-wrap">
                <button
                  type="button"
                  className={`drama-ep-asset-card ${isScene ? 'scene' : ''}${isActive ? ' is-linked' : ''}${
                    imageBusy ? ' is-gen' : ''
                  }`}
                  onClick={() => onOpenAsset(asset)}
                  title={"Click to configure: edit the prompt, regenerate, or upload an image"}
                >
                  <div className="drama-ep-asset-thumb">
                    {cover ? (
                      <img key={cover} src={cover} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span>{(asset.name || '?')[0]}</span>
                    )}
                    {imageBusy ? <em className="drama-ep-asset-gen-badge">{"Generating"}</em> : null}
                  </div>
                  <span className="drama-ep-asset-name">{asset.name || `Asset ${asset.id}`}</span>
                  {isActive ? <span className="drama-ep-asset-linked">{"Linked"}</span> : null}
                  {DRAMA_VOICE_BINDING_ENABLED && voice ? (
                    <span className="drama-ep-asset-voice">{"Voice"}</span>
                  ) : null}
                  <span className="drama-ep-asset-settings">{"Settings"}</span>
                </button>
                <div className="drama-ep-asset-ops">
                  {isActive && onUnlinkAsset ? (
                    <button
                      type="button"
                      className="drama-ep-asset-op-btn"
                      onClick={() => onUnlinkAsset(asset.id)}
                      title={"Only unlink from the current shot; the asset will not be deleted"}
                    >
                      {"Unlink"}</button>
                  ) : (
                    <button
                      type="button"
                      className="drama-ep-asset-op-btn"
                      onClick={() => onMention(asset)}
                      title={"Insert into the current shot script"}
                    >
                      {"Insert"}</button>
                  )}
                  {isCharacter && onGenerateVoice ? (
                    voice ? (
                      <CharacterVoicePreviewButton
                        url={voice.url}
                        label={voice.label}
                        variant="inline"
                        className="drama-ep-asset-voice-btn is-bound"
                        onError={onVoiceError}
                      />
                    ) : (
                      <button
                        type="button"
                        className="drama-ep-asset-voice-btn"
                        disabled={voiceGenerating}
                        onClick={() => onGenerateVoice(asset)}
                      >
                        {voiceGenerating ? "Generating…" : "Generate voice"}
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
