import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, defaultsFromTemplate, resolveVoiceId } from '../../api'
import type { MediaModelOption, MediaModelsCatalog, PipelineMode, Project, Template, VoicePreset } from '../../api'
import AppShell from '../../components/layout/AppShell'
import Stepper from '../../components/ui/Stepper'
import ComingSoon from '../../components/ui/ComingSoon'
import { IconChevronLeft, IconPlay } from '../../components/ui/Icons'
import BillingErrorNotice from '../../components/billing/BillingErrorNotice'
import { handleBillingError } from '../../lib/billingError'
import { kepuStepIndex, kepuSteps } from '../../lib/status'

const OUTPUT_MODES: { id: PipelineMode; label: string; desc: string; image: string }[] = [
  { id: 'full', label: "AI Video", desc: "Image → Video → Voiceover → Composite", image: '/mode-presets/full.jpg' },
  {
    id: 'image_text',
    label: "Still Image Video",
    desc: "Still Image + Overlay Text + Voiceover; no AI video generation",
    image: '/mode-presets/image_text.jpg',
  },
]

const RATIOS: { id: string; label: string; w: number; h: number }[] = [
  { id: '16:9', label: '16:9', w: 36, h: 20 },
  { id: '9:16', label: '9:16', w: 18, h: 32 },
  { id: '1:1', label: '1:1', w: 24, h: 24 },
  { id: '4:3', label: '4:3', w: 28, h: 21 },
  { id: '21:9', label: '21:9', w: 40, h: 17 },
]

/** 画幅是否竖向（高 > 宽），用于预览卡与实时预览比例 */
/** 音色卡片与 API 试听共用的 speaker 键 */
function voiceKey(v: VoicePreset): string {
  return v.speaker || v.id
}

function isPortraitRatio(ratio: string | undefined | null): boolean {
  const raw = String(ratio || '').trim()
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/i)
  if (!m) return false
  return Number(m[2]) > Number(m[1])
}

export default function StyleConfigPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const nav = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [voices, setVoices] = useState<VoicePreset[]>([])
  const [stylePrompt, setStylePrompt] = useState('')
  const [extraPrompt, setExtraPrompt] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('full')
  const [ratio, setRatio] = useState('16:9')
  const [imageModel, setImageModel] = useState('')
  const [videoModel, setVideoModel] = useState('')
  const [mediaCatalog, setMediaCatalog] = useState<MediaModelsCatalog | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      nav('/auth')
      return
    }
    if (!projectId) {
      nav('/studio/new')
    }
    api.templates().then(setTemplates)
    api.voices().then(setVoices)
    api
      .mediaModels()
      .then((cat) => {
        setMediaCatalog(cat)
        setImageModel((prev) => prev || cat.defaults.image_model)
        setVideoModel((prev) => prev || cat.defaults.video_model)
      })
      .catch(() => setMediaCatalog(null))
    api
      .getProject(projectId)
      .then((p) => {
        setProject(p)
        setStylePrompt(p.style_prompt || '')
        setExtraPrompt(p.extra_prompt || '')
        setVoiceId(p.voice_id || '')
        setPipelineMode(p.pipeline_mode || 'full')
        setRatio(p.output_ratio || (p.pipeline_mode === 'image_text' ? '9:16' : '16:9'))
        if (p.image_model) setImageModel(p.image_model)
        if (p.video_model) setVideoModel(p.video_model)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to Load"))
  }, [nav, projectId])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!voices.length) return
    setVoiceId((prev) => {
      const next = resolveVoiceId(prev, voices)
      return next === prev ? prev : next
    })
  }, [voices])

  const currentTpl = useMemo(
    () => templates.find((t) => t.id === project?.template_id),
    [templates, project?.template_id],
  )

  const selectedVoice = voices.find((v) => voiceKey(v) === voiceId || v.id === voiceId)

  useEffect(() => {
    if (!project || !currentTpl) return
    if (!stylePrompt) {
      const d = defaultsFromTemplate(currentTpl)
      setStylePrompt((v) => v || d.style_prompt)
      setExtraPrompt((v) => v || d.extra_prompt)
      setVoiceId((v) => v || d.voice_id)
    }
  }, [project, currentTpl])

  useEffect(() => {
    if (!project || project.output_ratio || !currentTpl?.default_ratio) return
    setRatio(currentTpl.default_ratio)
  }, [project?.id, project?.output_ratio, currentTpl?.default_ratio])

  function pickRatio(r: (typeof RATIOS)[0]) {
    setRatio(r.id)
  }

  function stopPreview() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  function selectVoice(v: VoicePreset) {
    const vid = voiceKey(v)
    if (vid !== voiceId) stopPreview()
    setVoiceId(vid)
  }

  async function previewVoice(v: VoicePreset, e: MouseEvent) {
    e.stopPropagation()
    const vid = voiceKey(v)
    selectVoice(v)
    setError('')

    if (playingId === vid && audioRef.current && !audioRef.current.paused) {
      stopPreview()
      return
    }

    stopPreview()
    setPreviewBusy(vid)
    try {
      const res = await api.previewVoice(vid)
      const url = api.assetUrl(res.url)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => {
        setPlayingId(null)
        setError("Preview playback failed")
      }
      setPlayingId(vid)
      await audio.play()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed")
      setPlayingId(null)
    } finally {
      setPreviewBusy(null)
    }
  }

  async function generate() {
    if (!project) return
    stopPreview()
    setBusy(true)
    setError('')
    try {
      const d = currentTpl ? defaultsFromTemplate(currentTpl) : null
      /*
       * styleOut 风格提示词；与模板相同则留空，生成时读后台
       * extraOut 额外提示词
       */
      const styleOut = stylePrompt.trim()
      const extraOut = extraPrompt.trim()
      const sameStyle = Boolean(d) && styleOut === d!.style_prompt
      const sameExtra = Boolean(d) && extraOut === d!.extra_prompt
      await api.updateProject(project.id, {
        style_prompt: sameStyle ? '' : styleOut,
        character_prompt: '',
        extra_prompt: sameExtra ? '' : extraOut,
        voice_id: voiceId,
        pipeline_mode: pipelineMode,
        output_ratio: ratio,
        image_model: imageModel,
        video_model: videoModel,
      })
      const started = await api.generate(project.id)
      nav(`/studio/${started.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation Failed"
      if (msg.includes('合成成片')) {
        try {
          const composed = await api.compose(project.id)
          nav(`/studio/${composed.id}`)
          return
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "Synthesis failed")
          return
        }
      }
      setError(msg)
      await handleBillingError(err, nav)
    } finally {
      setBusy(false)
    }
  }

  // project 初始加载失败时不得穿透主页面（下方存在 project.xxx 非空访问，会白屏崩溃）
  if (!project) {
    return (
      <AppShell active="studio">
        {error ? <BillingErrorNotice message={error} /> : <p className="pf-muted">{"Loading…"}</p>}
      </AppShell>
    )
  }

  return (
    <AppShell active="studio" wide>
      <header className="pf-page-head">
        <div className="pf-page-head-row">
          <div>
            <button type="button" className="pf-back" onClick={() => nav('/studio/new')}>
              <IconChevronLeft size={18} />
              {"Back to Studio"}</button>
            <h1 className="pf-page-title">{project?.title || "Style Configuration"}</h1>
          </div>
          <Stepper
            steps={kepuSteps(pipelineMode)}
            current={kepuStepIndex('style', { status: 'DRAFT', pipeline_mode: pipelineMode })}
            doneThrough={0}
          />
        </div>
      </header>

      <div className="pf-style-layout">
        <aside className="pf-create-col">
          <h3>{"Project Information"}</h3>
          {currentTpl ? (
            <div>
              <div
                className={[
                  'pf-style-side-thumb',
                  isPortraitRatio(currentTpl.default_ratio) ? 'portrait' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <img src={api.assetUrl(currentTpl.preview_cover)} alt="" />
              </div>
              <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{currentTpl.name}</p>
              <div className="pf-tags">
                {currentTpl.category.map((c) => (
                  <span key={c}>{HOME_CATEGORY_LABELS[c] || c}</span>
                ))}
              </div>
            </div>
          ) : null}
          <ul className="pf-meta-list" style={{ marginTop: '0.85rem' }}>
            <li>
              <span>{"Topic"}</span>
              <span style={{ maxWidth: '55%', textAlign: 'right' }}>
                {(project?.source_text || '').slice(0, 40)}
              </span>
            </li>
            <li>
              <span>{"Duration"}</span>
              <span>{"~1–3 minutes"}</span>
            </li>
            <li>
              <span>{"Number of Storyboards"}</span>
              <span>{"AI Automatic"}</span>
            </li>
          </ul>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-block pf-btn-sm" disabled>
            {"Preview Template"}<ComingSoon />
          </button>
        </aside>

        <section className="pf-create-col">
          <div className="pf-style-block">
            <h3>{"Visual Style"}</h3>
            <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.65rem' }}>
              {"Locked by the template selected during topic setup. Image and video generation automatically use its visual style. Whether to generate characters is determined by the template rules and topic, so you don't need to choose a character profile."}</p>
            {currentTpl ? (
              <div
                className={[
                  'pf-style-opt',
                  'selected',
                  isPortraitRatio(currentTpl.default_ratio) ? 'portrait' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ maxWidth: 280, textAlign: 'left' }}
              >
                <span className="pf-style-opt-media">
                  <img src={api.assetUrl(currentTpl.preview_cover)} alt="" />
                  {currentTpl.default_ratio ? (
                    <span className="pf-style-opt-ratio">{currentTpl.default_ratio}</span>
                  ) : null}
                </span>
                <div className="cap">{currentTpl.name}</div>
                <div className="cap-sub">{"Template Style"}</div>
              </div>
            ) : null}
            <label className="pf-field" style={{ marginTop: '0.75rem' }}>
              <span className="pf-field-label">{"Style Prompt (Optional Override)"}</span>
              <textarea
                className="pf-field-input"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                rows={2}
                style={{ resize: 'vertical', minHeight: 64 }}
              />
            </label>
          </div>

          <div className="pf-style-block">
            <h3>
              {"Voiceover"}<button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" disabled>
                {"More Voices"}<ComingSoon />
              </button>
            </h3>
            <div className="pf-voice-row">
              {voices.map((v) => {
                const vid = voiceKey(v)
                const selected = voiceId === vid
                const loading = previewBusy === vid
                const playing = playingId === vid
                return (
                  <div
                    key={v.id}
                    className={selected ? 'pf-voice-card selected' : 'pf-voice-card'}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectVoice(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectVoice(v)
                      }
                    }}
                  >
                    <strong className="pf-voice-name">{v.label}</strong>
                    <span className="pf-voice-meta">
                      {v.gender === 'female' ? "Female Voice" : v.gender === 'male' ? "Male Voice" : v.gender}
                    </span>
                    <button
                      type="button"
                      className={[
                        'pf-btn',
                        'pf-btn-sm',
                        'pf-btn-icon',
                        playing ? 'pf-btn-lime' : 'pf-btn-ghost',
                        'pf-voice-preview',
                      ].join(' ')}
                      disabled={loading || busy}
                      onClick={(e) => previewVoice(v, e)}
                    >
                      {loading ? (
                        "Generating…"
                      ) : playing ? (
                        "Playing"
                      ) : (
                        <>
                          <IconPlay size={12} />
                          {"Preview"}</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
            {selectedVoice ? (
              <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0.55rem 0 0' }}>
                {"Current:"}{selectedVoice.label} {"· Use this voice for the entire final video; click “Preview” to hear an approximately 5-second sample"}</p>
            ) : null}
          </div>

          <div className="pf-style-block">
            <h3>{"Production Method"}</h3>
            <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.65rem' }}>
              {"Any template can choose whether to generate an AI video, regardless of aspect ratio."}</p>
            <div className="pf-style-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {OUTPUT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={pipelineMode === m.id ? 'pf-style-opt selected' : 'pf-style-opt'}
                  onClick={() => setPipelineMode(m.id)}
                >
                  <img src={m.image} alt="" />
                  <div className="cap">{m.label}</div>
                  <div className="cap-sub">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {mediaCatalog ? (
            <div className="pf-style-block">
              <h3>{"Image Model"}</h3>
              <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.65rem' }}>
                {"Uses the TokenFree models selected under “Models” in the admin console."}</p>
              <div className="pf-model-grid">
                {mediaCatalog.image_models.map((m: MediaModelOption) => (
                  <button
                    key={m.id}
                    type="button"
                    className={imageModel === m.id ? 'pf-model-opt selected' : 'pf-model-opt'}
                    onClick={() => setImageModel(m.id)}
                  >
                    <div className="pf-model-opt-title">
                      <span>{m.label}</span>
                      {m.recommended ? <span className="pf-model-badge">{"Recommended"}</span> : null}
                    </div>
                    <div className="pf-model-opt-desc">{m.description}</div>
                    <div className="pf-model-opt-provider">TokenFree</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mediaCatalog && pipelineMode === 'full' ? (
            <div className="pf-style-block">
              <h3>{"Video model"}</h3>
              <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.65rem' }}>
                {"Model used for image-to-video generation; not called in still-image final video mode."}</p>
              <div className="pf-model-grid">
                {mediaCatalog.video_models.map((m: MediaModelOption) => (
                  <button
                    key={m.id}
                    type="button"
                    className={videoModel === m.id ? 'pf-model-opt selected' : 'pf-model-opt'}
                    onClick={() => setVideoModel(m.id)}
                  >
                    <div className="pf-model-opt-title">
                      <span>{m.label}</span>
                      {m.recommended ? <span className="pf-model-badge">{"Recommended"}</span> : null}
                    </div>
                    <div className="pf-model-opt-desc">{m.description}</div>
                    <div className="pf-model-opt-provider">TokenFree</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pf-style-block">
            <h3>{"Output Aspect Ratio"}</h3>
            <div className="pf-ratio-row">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={ratio === r.id ? 'pf-ratio selected' : 'pf-ratio'}
                  onClick={() => pickRatio(r)}
                >
                  <div className="box" style={{ width: r.w, height: r.h }} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="pf-create-col">
          <h3>{"Live Preview"}</h3>
          <div
            className={[
              'pf-editor-preview',
              isPortraitRatio(ratio) ? 'portrait' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ marginBottom: '0.85rem' }}
          >
            {currentTpl ? (
              <img src={api.assetUrl(currentTpl.preview_cover)} alt="" />
            ) : (
              <span className="empty">{"Preview Placeholder"}</span>
            )}
          </div>
          <p className="pf-muted" style={{ fontSize: '0.8rem' }}>
            {"After generation, view the actual visuals in the Storyboard workspace. This is currently a template preview."}</p>
          <h3 style={{ marginTop: '1rem' }}>{"Current Configuration Overview"}</h3>
          <ul className="pf-meta-list">
            <li>
              <span>{"Style"}</span>
              <span>{currentTpl?.name || '—'}</span>
            </li>
            <li>
              <span>{"Role"}</span>
              <span>{"AI decides based on the template and theme"}</span>
            </li>
            <li>
              <span>{"Voiceover"}</span>
              <span>{selectedVoice?.label || "Default"}</span>
            </li>
            <li>
              <span>{"Aspect Ratio"}</span>
              <span>{ratio}</span>
            </li>
            <li>
              <span>{"Final Video"}</span>
              <span>{pipelineMode === 'image_text' ? "Still Image Video" : "AI Video"}</span>
            </li>
          </ul>
          {selectedVoice ? (
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-block pf-btn-sm pf-btn-icon"
              style={{ marginTop: '0.75rem' }}
              disabled={busy || previewBusy === voiceKey(selectedVoice)}
              onClick={(e) => previewVoice(selectedVoice, e)}
            >
              <IconPlay size={14} />
              {playingId === voiceKey(selectedVoice)
                ? "Stop Preview"
                : `Preview “${selectedVoice.label}”`}
            </button>
          ) : null}
          {error ? <BillingErrorNotice message={error} style={{ marginTop: '0.75rem' }} /> : null}
          <button
            type="button"
            className="pf-btn pf-btn-lime pf-btn-block pf-btn-lg pf-btn-icon"
            style={{ marginTop: '0.75rem' }}
            disabled={busy || Boolean(previewBusy)}
            onClick={generate}
          >
            {busy ? "Starting…" : project.shots?.length ? "Save and Continue" : "Generate Storyboard"}
            {!busy ? <span aria-hidden>→</span> : null}
          </button>
          <p className="pf-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
            {"Generate the Storyboard script first, then review and edit it before manually starting image generation and voiceover."}</p>
        </aside>
      </div>
    </AppShell>
  )
}
import { HOME_CATEGORY_LABELS } from '../../lib/categories'
