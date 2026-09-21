/** 分镜顶部：已关联资产缩略图条 */
import type { FragmentRefStripItem } from './dramaEpisodeEditUtils'
import { DRAMA_VOICE_BINDING_ENABLED } from '../../lib/dramaVoiceBinding'

type Props = {
  items: FragmentRefStripItem[]
  onSelect?: (assetId: number) => void
}

// 渲染当前分镜关联资产条
export function EpisodeEditReferenceStrip({ items, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="drama-ep-ref-strip is-empty">
        <span className="drama-ep-ref-strip-hint">{"No linked assets · Click a card on the left or type @asset:id"}</span>
      </div>
    )
  }

  return (
    <div className="drama-ep-ref-strip" aria-label={"Assets linked to this shot"}>
      {items.map((item) => (
        <button
          key={item.assetId}
          type="button"
          className={`drama-ep-ref-chip${item.isCharacter ? ' is-character' : ''}${
            item.voiceUrl ? ' has-voice' : item.isCharacter ? ' no-voice' : ''
          }`}
          title={`${item.name}${item.type ? ` · ${item.type}` : ''}${
            DRAMA_VOICE_BINDING_ENABLED && item.isCharacter
              ? item.voiceLabel
                ? ` · Voice: ${item.voiceLabel}`
                : " · No voice linked"
              : ''
          }`}
          onClick={() => onSelect?.(item.assetId)}
        >
          {item.previewUrl ? (
            <img src={item.previewUrl} alt="" draggable={false} />
          ) : (
            <span className="drama-ep-ref-chip-fallback">{(item.name || '?')[0]}</span>
          )}
          {DRAMA_VOICE_BINDING_ENABLED && item.isCharacter ? (
            <span className={`drama-ep-ref-voice-badge${item.voiceUrl ? ' bound' : ''}`}>
              {item.voiceUrl ? "Audio" : "No audio"}
            </span>
          ) : null}
          <em>{item.name}</em>
        </button>
      ))}
    </div>
  )
}
