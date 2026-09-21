/** 分集 / 项目画幅与清晰度设置（写入 episode.params 或 project.params） */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, RectangleVertical } from 'lucide-react'
import {
  DRAMA_RATIO_OPTIONS,
  DRAMA_RES_OPTIONS,
  formatProjectOutputLabel,
  readEpisodeAspectRatio,
  readEpisodeResolution,
  readProjectAspectRatio,
  readProjectResolution,
  type DramaResolution,
} from '../../lib/dramaProjectOutputSettings'
import './drama.css'

type Props = {
  params: Record<string, unknown>
  /** 分集模式下用于展示继承的项目默认 */
  fallbackParams?: Record<string, unknown>
  scope?: 'episode' | 'project'
  disabled?: boolean
  compact?: boolean
  onChange: (nextParams: Record<string, unknown>) => void | Promise<void>
}

// 渲染输出规格控件
export function DramaProjectOutputSettings({
  params,
  fallbackParams = {},
  scope = 'episode',
  disabled = false,
  compact = false,
  onChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null)
  const [saving, setSaving] = useState(false)

  const aspectRatio =
    scope === 'episode'
      ? readEpisodeAspectRatio(params, fallbackParams)
      : readProjectAspectRatio(params)
  const resolution =
    scope === 'episode'
      ? readEpisodeResolution(params, fallbackParams)
      : readProjectResolution(params)
  const outputLabel = formatProjectOutputLabel(aspectRatio, resolution)
  const scopeHint = scope === 'episode' ? "This Episode" : "Project-wide"
  const panelTitle = scope === 'episode' ? "Episode Aspect Ratio" : "Project Aspect Ratio"
  const panelNote =
    scope === 'episode'
      ? "Used only for this episode's Storyboard; inherits the project default when not set. Please regenerate each shot's video after making changes."
      : "All episodes share the same specifications to prevent stitching failures caused by inconsistent aspect ratios or resolutions between shots."

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPanelStyle(null)
      return
    }

    function updatePanelPosition() {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const width = Math.min(360, window.innerWidth - 24)
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
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const stop = (e: MouseEvent) => {
    e.stopPropagation()
  }

  // 合并写回 params
  async function applyPatch(patch: Partial<{ aspect_ratio: string; resolution: string }>) {
    if (disabled || saving) return
    const nextParams = { ...params, ...patch }
    setSaving(true)
    try {
      await onChange(nextParams)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`fc-gen-opts drama-project-output-settings${compact ? ' drama-project-output-settings--compact' : ''}`}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <button
        type="button"
        className={`fc-gen-opt-btn drama-project-output-btn${open ? ' active' : ''}`}
        disabled={disabled || saving}
        title={
          scope === 'episode'
            ? "Episode aspect ratio and resolution; shots can be stitched directly after generation"
            : "Consistent aspect ratio and resolution across the project; all Storyboard shots can be stitched directly after generation"
        }
        onClick={() => setOpen((c) => !c)}
      >
        <RectangleVertical size={14} strokeWidth={1.8} />
        <span className="fc-gen-opt-label">{outputLabel}</span>
        {!compact ? <span className="drama-project-output-hint">{scopeHint}</span> : null}
        {!disabled ? <ChevronDown size={12} strokeWidth={2} /> : null}
      </button>

      {open && panelStyle
        ? createPortal(
            <div
              className="fc-gen-opt-panel drama-ep-opt-panel fc-gen-opt-panel--portal"
              style={panelStyle}
              role="dialog"
              aria-label={scope === 'episode' ? "Episode aspect ratio and resolution" : "Project aspect ratio and resolution"}
            >
              <div className="fc-gen-opt-panel-title">{panelTitle}</div>
              <p className="drama-project-output-note">{panelNote}</p>
              <div className="fc-gen-chip-row">
                {DRAMA_RATIO_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`fc-gen-chip${aspectRatio === r ? ' selected' : ''}`}
                    disabled={disabled || saving}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void applyPatch({ aspect_ratio: r })}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="fc-gen-opt-panel-title" style={{ marginTop: 12 }}>
                {"Resolution"}</div>
              <div className="fc-gen-chip-row">
                {DRAMA_RES_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`fc-gen-chip${resolution === r ? ' selected' : ''}`}
                    disabled={disabled || saving}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void applyPatch({ resolution: r as DramaResolution })}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
