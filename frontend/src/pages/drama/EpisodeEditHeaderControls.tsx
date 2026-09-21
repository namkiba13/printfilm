/** 分集编辑顶栏：画幅/清晰度 / 视频风格 / 字幕 / 人物介绍 / 模型 / 镜间衔接 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'

import { createPortal } from 'react-dom'

import { BarChart3, ChevronDown, CircleHelp, Link2, Smile, Type, Users } from 'lucide-react'

import { DramaImageStylePreviewImg } from '../../components/drama/DramaImageStylePreviewImg'

import { SeedanceRulesModal } from '../../components/drama/SeedanceRulesModal'

import {
  getImageStyleLabel,
  IMAGE_STYLE_OPTIONS,
  type ImageStyleId,
} from '../../lib/dramaImageStyles'

import { subtitleModeUsesModelOutput, type DramaSubtitleMode } from '../../lib/dramaSubtitleBoard'
import {
  characterIntroModeEnabled,
  type DramaCharacterIntroMode,
} from '../../lib/dramaCharacterIntro'

import {
  catalogModelLabel,
  catalogVideoModels,
  useMediaModelsCatalog,
} from '../../hooks/useMediaModelsCatalog'

import { DramaProjectOutputSettings } from './DramaProjectOutputSettings'

import './canvas/nodes/dramaImageGenOptions.css'
type Props = {
  styleId: ImageStyleId | ''
  modelId: string
  episodeParams: Record<string, unknown>
  projectParams: Record<string, unknown>
  linkLastFrame: boolean
  subtitleMode: DramaSubtitleMode
  characterIntroMode: DramaCharacterIntroMode
  onStyleChange: (id: ImageStyleId | '') => void
  onModelChange: (id: string) => void
  onEpisodeOutputChange: (nextParams: Record<string, unknown>) => void | Promise<void>
  onLinkLastFrameChange: (enabled: boolean) => void
  onSubtitleModeChange: (mode: DramaSubtitleMode) => void
  onCharacterIntroModeChange: (mode: DramaCharacterIntroMode) => void
  disabled?: boolean
  /** 画幅/风格/字幕/介绍/衔接为项目全局，分镜页只展示不可改 */
  globalSettingsReadOnly?: boolean
}

type OpenPanel = 'style' | 'model' | 'link' | 'subtitle' | 'intro' | null

const STYLE_PANEL_WIDTH = 420

// 渲染顶栏生成参数控件
export function EpisodeEditHeaderControls({
  styleId,
  modelId,
  episodeParams,
  projectParams,
  linkLastFrame,
  subtitleMode,
  characterIntroMode,
  onStyleChange,
  onModelChange,
  onEpisodeOutputChange,
  onLinkLastFrameChange,
  onSubtitleModeChange,
  onCharacterIntroModeChange,
  disabled = false,
  globalSettingsReadOnly = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<OpenPanel>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null)
  const catalog = useMediaModelsCatalog()
  const videoModels = catalogVideoModels(catalog)
  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPanelStyle(null)
      return
    }
    // 固定定位下拉面板，避免与 top/bottom 冲突导致高度被压扁
    function updatePanelPosition() {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const width =
        open === 'style'
          ? Math.min(STYLE_PANEL_WIDTH, window.innerWidth - 24)
          : Math.min(360, window.innerWidth - 24)
      let left = rect.right - width
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
      const top = Math.min(rect.bottom + 8, window.innerHeight - 24)
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width,
        bottom: 'auto',
        right: 'auto',
        zIndex: 320,
      })
    }
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    function onDoc(e: Event) {
      const target = e.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.fc-gen-opt-panel--portal')) return
      setOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }
  const styleLabel = getImageStyleLabel(styleId) || "Video Style"
  const modelLabel = catalogModelLabel(modelId, videoModels, "Video model")
  const subtitleLabel = subtitleMode === 'model' ? "Model Subtitles" : "Post-Production Subtitles"
  const subtitleUsesModel = subtitleModeUsesModelOutput(subtitleMode)
  const introLabel = characterIntroMode === 'model' ? "Character Introduction" : "No Character Intro Overlay"
  const introEnabled = characterIntroModeEnabled(characterIntroMode)
  const globalLocked = disabled || globalSettingsReadOnly
  return (
    <div
      ref={rootRef}
      className="fc-gen-opts drama-ep-header-gen-opts"
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <div className="fc-gen-opts-triggers">
        <DramaProjectOutputSettings
          scope={globalSettingsReadOnly ? 'project' : 'episode'}
          params={globalSettingsReadOnly ? projectParams : episodeParams}
          fallbackParams={projectParams}
          disabled={globalLocked}
          compact
          onChange={onEpisodeOutputChange}
        />
        <button
          type="button"
          className={`fc-gen-opt-btn${open === 'style' || styleId ? ' active' : ''}${globalSettingsReadOnly ? ' is-readonly' : ''}`}
          disabled={globalLocked}
          onClick={() => {
            if (globalSettingsReadOnly) return
            setOpen((c) => (c === 'style' ? null : 'style'))
          }}
          title={globalSettingsReadOnly ? `${styleLabel} (Project Settings, Storyboard read-only)` : styleLabel}
        >
          <Smile size={14} strokeWidth={1.8} />
          <span className="fc-gen-opt-label">{styleLabel}</span>
          {!globalSettingsReadOnly ? <ChevronDown size={12} strokeWidth={2} /> : null}
        </button>
        <button
          type="button"
          className={`fc-gen-opt-btn${open === 'subtitle' || !subtitleUsesModel ? ' active' : ''}${globalSettingsReadOnly ? ' is-readonly' : ''}`}
          disabled={globalLocked}
          onClick={() => {
            if (globalSettingsReadOnly) return
            setOpen((c) => (c === 'subtitle' ? null : 'subtitle'))
          }}
          title={globalSettingsReadOnly ? `${subtitleLabel} (Project Settings, Storyboard read-only)` : "Subtitle Settings"}
        >
          <Type size={14} strokeWidth={1.8} />
          <span className="fc-gen-opt-label">{subtitleLabel}</span>
          {!globalSettingsReadOnly ? <ChevronDown size={12} strokeWidth={2} /> : null}
        </button>
        <button
          type="button"
          className={`fc-gen-opt-btn${open === 'intro' || !introEnabled ? ' active' : ''}${globalSettingsReadOnly ? ' is-readonly' : ''}`}
          disabled={globalLocked}
          onClick={() => {
            if (globalSettingsReadOnly) return
            setOpen((c) => (c === 'intro' ? null : 'intro'))
          }}
          title={globalSettingsReadOnly ? `${introLabel} (Project Settings, Storyboard read-only)` : "Character Intro Overlay"}
        >
          <Users size={14} strokeWidth={1.8} />
          <span className="fc-gen-opt-label">{introLabel}</span>
          {!globalSettingsReadOnly ? <ChevronDown size={12} strokeWidth={2} /> : null}
        </button>
        <button
          type="button"
          className={`fc-gen-opt-btn${open === 'model' ? ' active' : ''}`}
          disabled={disabled}
          onClick={() => setOpen((c) => (c === 'model' ? null : 'model'))}
        >
          <BarChart3 size={14} strokeWidth={1.8} />
          <span className="fc-gen-opt-label">{modelLabel}</span>
          <ChevronDown size={12} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={`fc-gen-opt-btn${open === 'link' || linkLastFrame ? ' active' : ''}${globalSettingsReadOnly ? ' is-readonly' : ''}`}
          disabled={globalLocked}
          onClick={() => {
            if (globalSettingsReadOnly) return
            setOpen((c) => (c === 'link' ? null : 'link'))
          }}
          title={globalSettingsReadOnly ? `${linkLastFrame ? "Last-Frame Transition" : "Generate Concurrently"} (Project Settings, Storyboard read-only)` : "Inter-Shot Last-Frame Continuity"}
        >
          <Link2 size={14} strokeWidth={1.8} />
          <span className="fc-gen-opt-label">{linkLastFrame ? "Last-Frame Transition" : "Generate Concurrently"}</span>
          {!globalSettingsReadOnly ? <ChevronDown size={12} strokeWidth={2} /> : null}
        </button>
        <button
          type="button"
          className="fc-gen-opt-btn drama-seedance-help-btn"
          disabled={disabled}
          title={"Seedance Parameters and Usage Rules"}
          aria-label={"Seedance Parameters and Usage Rules"}
          onClick={() => setRulesOpen(true)}
        >
          <CircleHelp size={14} strokeWidth={1.8} />
        </button>
      </div>
      <SeedanceRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {open && panelStyle
        ? createPortal(
            <>
              {open === 'style' ? (
                <div
                  className="fc-gen-opt-panel fc-gen-style-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
                  style={panelStyle}
                  role="dialog"
                  aria-label={"Video Style"}
                >
                  <div className="fc-gen-opt-panel-title">{"Video Style"}</div>
                  <div className="fc-gen-style-grid">
                    {IMAGE_STYLE_OPTIONS.map((opt) => {
                      const selected = styleId === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`fc-gen-style-card${selected ? ' selected' : ''}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onStyleChange(opt.id)
                            setOpen(null)
                          }}
                        >
                          <DramaImageStylePreviewImg styleId={opt.id} alt={opt.label} />
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {open === 'model' ? (
                <div
                  className="fc-gen-opt-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
                  style={panelStyle}
                  role="dialog"
                  aria-label={"Video model"}
                >
                  <div className="fc-gen-opt-panel-title">{"Video model"}</div>
                  <div className="fc-gen-model-list">
                    {videoModels.length === 0 ? (
                      <p className="fc-gen-model-empty">{"Please select a video model under “Models” in the admin console first"}</p>
                    ) : null}
                    {videoModels.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`fc-gen-model-item${modelId === opt.id ? ' selected' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onModelChange(opt.id)
                          setOpen(null)
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {open === 'link' ? (
                <div
                  className="fc-gen-opt-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
                  style={panelStyle}
                  role="dialog"
                  aria-label={"Shot Transitions"}
                >
                  <div className="fc-gen-opt-panel-title">{"Shot Transitions"}</div>
                  <label className="drama-ep-link-last-frame">
                    <input
                      type="checkbox"
                      checked={linkLastFrame}
                      disabled={disabled}
                      onChange={(e) => onLinkLastFrameChange(e.target.checked)}
                    />
                    <span>
                      {"Connect with the previous shot's last frame"}<em>
                        {"Enabled by default. Shots are generated in order: you can submit the next shot early and wait in the queue for the previous shot to finish. When disabled, shots are generated concurrently by default. Switching takes effect immediately and reorders tasks that have not started. When character or scene references are present, the last frame is attached to the reference image (cannot be used with first_frame)"}</em>
                    </span>
                  </label>
                </div>
              ) : null}
              {open === 'subtitle' ? (
                <div
                  className="fc-gen-opt-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
                  style={panelStyle}
                  role="dialog"
                  aria-label={"Subtitle Settings"}
                >
                  <div className="fc-gen-opt-panel-title">{"Subtitle Settings"}</div>
                  <label className="drama-ep-link-last-frame">
                    <input
                      type="radio"
                      name="episode-subtitle-mode"
                      checked={subtitleMode === 'model'}
                      disabled={disabled}
                      onChange={() => onSubtitleModeChange('model')}
                    />
                    <span>
                      {"Model-Generated Subtitles"}<em>
                        {"After switching, the “sync subtitles / subtitle cue” prompt is immediately restored to the current shot body, and the model generates subtitles directly."}</em>
                    </span>
                  </label>
                  <label className="drama-ep-link-last-frame">
                    <input
                      type="radio"
                      name="episode-subtitle-mode"
                      checked={subtitleMode === 'post'}
                      disabled={disabled}
                      onChange={() => onSubtitleModeChange('post')}
                    />
                    <span>
                      {"Post-Production Subtitles"}<em>
                        {"After switching, the subtitle prompt is immediately removed from the current shot. The subtitle panel on the right can still be previewed and exported for adding text in post-production."}</em>
                    </span>
                  </label>
                </div>
              ) : null}
              {open === 'intro' ? (
                <div
                  className="fc-gen-opt-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
                  style={panelStyle}
                  role="dialog"
                  aria-label={"Character Introduction"}
                >
                  <div className="fc-gen-opt-panel-title">{"Character Intro Overlay"}</div>
                  <label className="drama-ep-link-last-frame">
                    <input
                      type="radio"
                      name="episode-character-intro-mode"
                      checked={characterIntroMode === 'model'}
                      disabled={disabled}
                      onChange={() => onCharacterIntroModeChange('model')}
                    />
                    <span>
                      {"Model-Generated Character Introductions"}<em>
                        {"When enabled, replanning shots adds “Character Introduction · On-Screen Text · Beside Character” for important characters appearing for the first time. During generation, the model places the introduction beside the character."}</em>
                    </span>
                  </label>
                  <label className="drama-ep-link-last-frame">
                    <input
                      type="radio"
                      name="episode-character-intro-mode"
                      checked={characterIntroMode === 'off'}
                      disabled={disabled}
                      onChange={() => onCharacterIntroModeChange('off')}
                    />
                    <span>
                      {"Disable Character Introductions"}<em>
                        {"After switching, the character-introduction on-screen text line is immediately removed from the current shot. Generation will prohibit character introduction cards in the frame. Removed introductions will return only after replanning the shots."}</em>
                    </span>
                  </label>
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
