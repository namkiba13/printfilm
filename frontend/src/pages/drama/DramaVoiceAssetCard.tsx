/** 资产库「音色」Tab 单卡：描述编辑、试听与合成 */
import { AudioLines, Trash2, Volume2 } from 'lucide-react'
import { resolveDramaMediaUrl, type DramaAsset } from '../../api/drama'
import { CharacterVoicePreviewButton } from '../../components/drama/CharacterVoicePreviewButton'

type Props = {
  asset: DramaAsset
  promptValue: string
  synthBusy: boolean
  onPromptChange: (value: string) => void
  onPromptBlur: () => void
  onSynth: () => void
  onDelete: () => void
  onError: (message: string) => void
}

// 渲染音色资产卡片
export function DramaVoiceAssetCard({
  asset,
  promptValue,
  synthBusy,
  onPromptChange,
  onPromptBlur,
  onSynth,
  onDelete,
  onError,
}: Props) {
  const audioSrc = resolveDramaMediaUrl(asset.url)
  const hasAudio = Boolean(audioSrc)

  return (
    <article className="drama-voice-card">
      <header className="drama-voice-card-head">
        <div className="drama-voice-card-badge" aria-hidden>
          <AudioLines size={18} strokeWidth={1.75} />
        </div>
        <div className="drama-voice-card-title">
          <h3>{asset.name || "Untitled Voice"}</h3>
          <span className={`drama-voice-card-status${hasAudio ? ' is-ready' : ' is-pending'}`}>
            {hasAudio ? "Synthesized" : "Pending Synthesis"}
          </span>
        </div>
        <button
          type="button"
          className="drama-voice-card-delete"
          aria-label={`Delete ${asset.name || "Voice"}`}
          disabled={synthBusy}
          onClick={onDelete}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </header>

      <div className="drama-voice-card-body">
        <label className="drama-voice-card-field">
          <span>{"Voice Description"}</span>
          <textarea
            rows={3}
            value={promptValue}
            disabled={synthBusy}
            onChange={(e) => onPromptChange(e.target.value)}
            onBlur={onPromptBlur}
            placeholder={"Describe the voice: age, gender, tone, speaking rate…"}
          />
        </label>

        <div className={`drama-voice-card-player${hasAudio ? '' : ' is-empty'}`}>
          {hasAudio ? (
            <>
              <CharacterVoicePreviewButton
                url={asset.url || ''}
                label={asset.name || undefined}
                variant="button"
                size="sm"
                onError={onError}
              />
              <audio className="drama-voice-card-audio" controls preload="none" src={audioSrc} />
            </>
          ) : (
            <>
              <Volume2 size={16} strokeWidth={1.75} aria-hidden />
              <span>{"Enter a description to synthesize a preview"}</span>
            </>
          )}
        </div>
      </div>

      <footer className="drama-voice-card-foot">
        <button
          type="button"
          className="pf-btn pf-btn-lime pf-btn-sm drama-voice-card-synth"
          disabled={synthBusy || !promptValue.trim()}
          onClick={onSynth}
        >
          {synthBusy ? "Synthesizing…" : hasAudio ? "Re-synthesize" : "Synthesize from Prompt"}
        </button>
      </footer>
    </article>
  )
}
