import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, defaultsFromTemplate } from '../../api'
import type { Project, Shot, Template } from '../../api'
import AppShell from '../../components/layout/AppShell'
import Stepper from '../../components/ui/Stepper'
import {
  IconChevronLeft,
  IconDownload,
  IconEdit,
  IconImage,
  IconMonitor,
  IconPlay,
  IconRefresh,
  IconSliders,
  IconTrash,
} from '../../components/ui/Icons'
import { scenePromptForDisplay } from '../../promptDisplay'
import { dialog } from '../../lib/dialog'
import { handleBillingError } from '../../lib/billingError'
import BillingErrorNotice from '../../components/billing/BillingErrorNotice'
import {
  effectiveStatus,
  formatMmSs,
  isRunning,
  kepuBillingPhase,
  kepuPhaseHint,
  kepuStepIndex,
  kepuSteps,
  isProjectWideBusy,
  isShotGenerating,
  shotsByNo,
  shotDisplayDone,
  shotDisplayKind,
  shotDisplayLabel,
  statusLabel,
} from '../../lib/status'
import {
  SEGMENT_SCRIPT_PLACEHOLDER,
  SHOT_DURATION_MAX,
  firstVisualFromScript,
  narrationFromScript,
  parseSegmentScript,
  replaceFirstVisualInScript,
  replaceNarrationInScript,
  validateSegmentScriptDuration,
} from '../../lib/segmentDuration'

function csvEscape(value: string | number | null | undefined) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadStoryboardCsv(project: Project) {
  const header = ["Shot No.", "Narration", "Visual Description", "Duration (sec)", "Status", "Shot Title"]
  const rows = (project.shots || [])
    .slice()
    .sort((a, b) => a.shot_no - b.shot_no)
    .map((s) =>
      [
        s.shot_no,
        s.narration,
        scenePromptForDisplay(s.img_prompt || s.video_prompt || ''),
        s.duration,
        shotDisplayLabel(shotDisplayKind(s, { pipelineMode: project.pipeline_mode })),
        s.overlay_title || '',
      ]
        .map(csvEscape)
        .join(','),
    )
  const bom = '\uFEFF'
  const blob = new Blob([bom + [header.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project.title || `project_${project.id}`}_storyboard.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

type PreviewState =
  | {
      kind: 'shot'
      shotNo: number
      imageUrl: string | null
      videoUrl: string | null
      audioUrl: string | null
      caption: string
    }
  | { kind: 'final'; url: string; title: string; bust?: string }
  | null

function shotCaption(shot: Shot) {
  if (shot.overlay_title) {
    return `${shot.overlay_title}${
      shot.overlay_subtitle ? ` · ${shot.overlay_subtitle}` : ''
    }${shot.narration ? `｜Voiceover: ${shot.narration}` : ''}`
  }
  return shot.narration
}

function hasActiveUnifiedTasks(project: Project | null): boolean {
  const activeStatuses = ['pending', 'leased', 'running', 'awaiting_poll', 'awaiting_review']
  return Boolean(
    project?.active_tasks?.some(
      (task) => !task.cancel_requested && activeStatuses.includes(task.status),
    ),
  )
}

/** 有任务平台数据时以 active_tasks 为准；COMPOSING 无任务视为拼接失败残留，可重试 */
function isProjectBusy(project: Project | null): boolean {
  if (!project) return false
  if (hasActiveUnifiedTasks(project)) return true
  if (Array.isArray(project.active_tasks) && project.active_tasks.length === 0) {
    return false
  }
  return isRunning(project.status)
}

export default function StoryboardPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const nav = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [busy, setBusy] = useState(false)
  // busyShotIds 正在提交单镜图/视频的镜号，可并行，finally 只删自己
  const [busyShotIds, setBusyShotIds] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Shot | null>(null)
  const [editFocus, setEditFocus] = useState<string>('')
  /** 表格入口：旁白列 / 逐段分镜列 / 操作栏「编辑」 */
  const [editMode, setEditMode] = useState<'full' | 'narration' | 'segment'>('full')
  const [promptEdit, setPromptEdit] = useState<{
    style_prompt: string
    character_prompt: string
    extra_prompt: string
  } | null>(null)
  const [preview, setPreview] = useState<PreviewState>(null)
  const [menuShotId, setMenuShotId] = useState<number | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchSelected, setBatchSelected] = useState<number[]>([])
  const [batchDuration, setBatchDuration] = useState('')
  const [batchRegenAudio, setBatchRegenAudio] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      nav('/auth')
      return
    }
    if (!projectId) {
      nav('/studio/new')
      return
    }
    api
      .getProject(projectId)
      .then((p) => {
        setProject(p)
        return api.templates().then((list) => {
          setTemplate(list.find((t) => t.id === p.template_id) || null)
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to Load"))
  }, [nav, projectId])

  useEffect(() => {
    if (!project) return
    // Only poll while pipeline is actively running — idle checkpoints
    // (IMAGE_READY / VIDEO_READY / SCRIPT_READY) must not spin forever.
    if (!isProjectBusy(project)) return
    const timer = setInterval(() => {
      api
        .getProject(project.id)
        .then(setProject)
        .catch(() => undefined)
    }, 1500)
    return () => clearInterval(timer)
  }, [project?.id, project?.status, project?.active_tasks])

  useEffect(() => {
    if (menuShotId == null) return
    function onDoc() {
      setMenuShotId(null)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [menuShotId])

  const running = isProjectBusy(project)
  const step = project ? kepuStepIndex('board', project) : 2
  const totalDuration = useMemo(
    () => (project?.shots || []).reduce((s, x) => s + (Number(x.duration) || 0), 0),
    [project?.shots],
  )

  // editScriptText 弹窗中当前编辑的逐段脚本
  const editScriptText = editing?.segment_script || editing?.video_prompt || ''
  // editDurationCheck 弹窗脚本时长校验
  const editDurationCheck = useMemo(
    () => validateSegmentScriptDuration(editScriptText),
    [editScriptText],
  )

  const shots = useMemo(() => shotsByNo(project?.shots), [project?.shots])
  /** 项目字段为空时回显模板默认（与后端 _effective_* 一致） */
  const promptDefaults = useMemo(
    () => (template ? defaultsFromTemplate(template) : null),
    [template],
  )
  const displayPrompts = useMemo(() => {
    if (!project) {
      return { style_prompt: '', character_prompt: '', extra_prompt: '' }
    }
    return {
      style_prompt: (project.style_prompt || '').trim() || promptDefaults?.style_prompt || '',
      character_prompt:
        (project.character_prompt || '').trim() || promptDefaults?.character_prompt || '',
      extra_prompt: (project.extra_prompt || '').trim() || promptDefaults?.extra_prompt || '',
    }
  }, [project, promptDefaults])
  const isFullPipeline = project?.pipeline_mode !== 'image_text'
  /**
   * Full pipeline: need AI videos before compose.
   * VIDEO_READY+ means video stage finished (incl. privacy skips without video_url).
   * image_text skips the video stage entirely.
   */
  const phase = project ? kepuBillingPhase(project) : 'script'
  const readyToCompose = phase === 'compose'
  const needsVideos = phase === 'videos'
  const needsScriptConfirm = phase === 'assets'
  const hasFinal = Boolean(project?.final_video_url)
  /** Primary CTA: confirm script → generate → (videos) → compose → preview */
  const primaryAction: 'generate' | 'compose' | 'preview' | 'busy' = running
    ? 'busy'
    : hasFinal
      ? 'preview'
      : readyToCompose
        ? 'compose'
        : 'generate'

  const generateLabel = running
    ? "Generating…"
    : shots.length === 0
      ? "Go to the Style page to generate a storyboard"
      : needsScriptConfirm
        ? "Confirm storyboard, then generate images and voiceovers shot by shot"
        : needsVideos
          ? "Generate Videos Shot by Shot"
          : "Continue Generating"

  // 工作台进度：完整模式要镜头视频 + 外部 TTS，静图模式只配音合成
  const progressItems = useMemo(() => {
    if (!project) return []
    const list = project.shots || []
    const imgs = list.filter((s) => s.image_url).length
    const auds = list.filter((s) => s.audio_url).length
    const vids = list.filter((s) => s.video_url).length
    const full = project.pipeline_mode !== 'image_text'
    const stage = effectiveStatus(project)
    type ProgressItem = { label: string; done: boolean; run?: boolean; pct?: number }
    const items: ProgressItem[] = [
      { label: "Theme Analysis", done: true },
      { label: "Storyboard Script", done: list.length > 0 || !['DRAFT', 'SCRIPTING'].includes(project.status) },
      {
        label: `Image Generation (${imgs}/${list.length || 0})`,
        done: list.length > 0 && imgs === list.length,
      },
    ]
    if (full) {
      items.push({
        label: `Shot Video (${vids}/${list.length || 0})`,
        done:
          list.length > 0 &&
          (vids === list.length ||
            ['VIDEO_READY', 'COMPOSING', 'AUDITING', 'DONE'].includes(stage)),
        run: stage === 'VIDEOING',
        pct: stage === 'VIDEOING' ? project.progress : undefined,
      })
    }
    items.push({
      label: `Voiceover Synthesis (${auds}/${list.length || 0})`,
      done: list.length > 0 && auds === list.length,
      run: stage === 'AUDIOING',
      pct: stage === 'AUDIOING' ? project.progress : undefined,
    })
    items.push({
      label: full ? "Stitch Shots" : "Render Final Video",
      done: Boolean(project.final_video_url) || project.status === 'DONE',
      run: stage === 'COMPOSING',
      pct: stage === 'COMPOSING' ? project.progress : undefined,
    })
    return items
  }, [project])

  function openFinalPreview() {
    if (!project?.final_video_url) return
    setPreview({
      kind: 'final',
      url: api.assetUrl(project.final_video_url, project.updated_at),
      title: project.title,
      bust: project.updated_at,
    })
  }

  async function continueGenerate() {
    if (!project) return
    setBusy(true)
    setError('')
    try {
      setProject(await api.generate(project.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Continue generating failed"
      if (msg.includes('合成成片')) {
        try {
          setError('')
          setProject(await api.compose(project.id))
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "Synthesis failed")
        }
        return
      }
      setError(msg)
      await handleBillingError(err, nav)
    } finally {
      setBusy(false)
    }
  }

  async function restartGenerate() {
    if (!project) return
    const ok = await dialog.confirm({
      title: "Start Over",
      message: "This will clear the current storyboard and assets and split the shots again. You can still review and confirm them before continuing after generation.",
      confirmText: "Confirm Redo",
      cancelText: "Think Again",
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      setProject(await api.generate(project.id, { restart: true }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Redo failed"
      setError(msg)
      await handleBillingError(err, nav)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProject() {
    if (!project) return
    const ok = await dialog.confirm({
      title: "Delete Project",
      message: "Are you sure you want to delete this project? All assets and the final video will be removed. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.deleteProject(project.id)
      nav('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  async function composeOnly() {
    if (!project) return
    setBusy(true)
    try {
      setProject(await api.compose(project.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed")
    } finally {
      setBusy(false)
    }
  }

  async function onCoverFile(file: File | null) {
    if (!project || !file) return
    setBusy(true)
    setError('')
    try {
      setProject(await api.uploadCover(project.id, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover Upload Failed")
    } finally {
      setBusy(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  async function useFirstShotCover() {
    if (!project) return
    const first = [...(project.shots || [])]
      .sort((a, b) => a.shot_no - b.shot_no)
      .find((s) => s.image_url)
    if (!first?.image_url) {
      setError("No Usable Shot Visuals")
      return
    }
    setBusy(true)
    setError('')
    try {
      setProject(await api.updateProject(project.id, { cover_url: first.image_url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to Set Cover")
    } finally {
      setBusy(false)
    }
  }

  function openBatchAdjust() {
    if (!project) return
    setBatchSelected((project.shots || []).map((s) => s.id))
    setBatchDuration('')
    setBatchRegenAudio(false)
    setBatchOpen(true)
  }

  async function applyBatchAdjust() {
    if (!project || batchSelected.length === 0) return
    const durationVal = batchDuration.trim() === '' ? null : Number(batchDuration)
    if (durationVal != null && (!Number.isFinite(durationVal) || durationVal <= 0)) {
      setError("Please enter a valid duration (seconds)")
      return
    }
    if (durationVal == null && !batchRegenAudio) {
      setError("Please set a duration or select Re-voiceover")
      return
    }
    setBusy(true)
    setError('')
    try {
      for (const shotId of batchSelected) {
        if (durationVal != null) {
          await api.updateShot(project.id, shotId, { duration: durationVal })
        }
        if (batchRegenAudio) {
          await api.regenAudio(project.id, shotId)
        }
      }
      setProject(await api.getProject(project.id))
      setBatchOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch Adjustment Failed")
      try {
        setProject(await api.getProject(project.id))
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!project) return
    setBusy(true)
    try {
      await api.publish(project.id)
      nav('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing Failed")
    } finally {
      setBusy(false)
    }
  }

  // 标记本镜请求进行中，不覆盖其它镜
  function markShotBusy(shotId: number) {
    setBusyShotIds((ids) => new Set(ids).add(shotId))
  }

  // 只清自己，避免并行请求互相冲掉锁
  function markShotIdle(shotId: number) {
    setBusyShotIds((ids) => {
      const next = new Set(ids)
      next.delete(shotId)
      return next
    })
  }

  async function regenImage(shot: Shot) {
    if (!project) return
    markShotBusy(shot.id)
    try {
      setProject(await api.regenImage(project.id, shot.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image Generation Failed")
    } finally {
      markShotIdle(shot.id)
    }
  }

  async function regenVideo(shot: Shot) {
    if (!project) return
    markShotBusy(shot.id)
    try {
      setProject(await api.regenVideo(project.id, shot.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video Generation Failed")
    } finally {
      markShotIdle(shot.id)
    }
  }

  async function regenAudio(shot: Shot) {
    if (!project) return
    // 重配音会重写整片口播，锁整表避免两路抢写
    setBusy(true)
    try {
      setProject(await api.regenAudio(project.id, shot.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate voiceover")
    } finally {
      setBusy(false)
    }
  }

  function openShotEdit(shot: Shot, focus = '') {
    setEditFocus(focus)
    if (focus === 'narration') setEditMode('narration')
    else if (focus === 'segment_script') setEditMode('segment')
    else setEditMode('full')
    setEditing({ ...shot })
    setMenuShotId(null)
  }

  function closeShotEdit() {
    setEditing(null)
    setEditFocus('')
    setEditMode('full')
  }

  // 改旁白时同步写入脚本旁白段
  function patchEditingNarration(value: string) {
    if (!editing) return
    const script = editing.segment_script || editing.video_prompt || ''
    const next = replaceNarrationInScript(script, value)
    setEditing({
      ...editing,
      narration: value,
      segment_script: next,
      video_prompt: next,
    })
  }

  // 改首帧画面时同步写入脚本第一段 visual
  function patchEditingVisual(value: string) {
    if (!editing) return
    const script = editing.segment_script || editing.video_prompt || ''
    const next = replaceFirstVisualInScript(script, value)
    setEditing({
      ...editing,
      img_prompt: value,
      segment_script: next,
      video_prompt: next,
    })
  }

  // 改脚本时回填旁白与首帧画面
  function patchEditingScript(value: string) {
    if (!editing) return
    setEditing({
      ...editing,
      segment_script: value,
      video_prompt: value,
      narration: narrationFromScript(value),
      img_prompt: firstVisualFromScript(value) || editing.img_prompt,
    })
  }

  async function saveShot() {
    if (!project || !editing) return
    // scriptText 当前编辑中的逐段脚本
    const scriptText = editing.segment_script || editing.video_prompt || ''
    // durationCheck 时长校验结果
    const durationCheck = validateSegmentScriptDuration(scriptText)
    if (!durationCheck.valid) {
      setError(durationCheck.message || "Invalid storyboard duration")
      return
    }
    setBusy(true)
    try {
      await api.updateShot(project.id, editing.id, {
        narration: editing.narration,
        overlay_title: editing.overlay_title,
        overlay_subtitle: editing.overlay_subtitle,
        img_prompt: editing.img_prompt,
        video_prompt: editing.video_prompt,
        segment_script: editing.segment_script,
        duration: Number(editing.duration) || 4,
        camera: editing.camera,
      })
      closeShotEdit()
      setProject(await api.getProject(project.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  // 保存项目提示词；与后台模板相同则清空覆盖
  async function saveProjectPrompts() {
    if (!project || !promptEdit) return
    setBusy(true)
    try {
      const d = promptDefaults
      const styleOut = promptEdit.style_prompt.trim()
      const charOut = promptEdit.character_prompt.trim()
      const extraOut = promptEdit.extra_prompt.trim()
      const updated = await api.updateProject(project.id, {
        style_prompt: d && styleOut === d.style_prompt ? '' : styleOut,
        character_prompt: d && charOut === d.character_prompt ? '' : charOut,
        extra_prompt: d && extraOut === d.extra_prompt ? '' : extraOut,
      })
      setProject(updated)
      setPromptEdit(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setBusy(false)
    }
  }

  // 清空项目覆盖，后续生成跟随后台模板
  async function restoreTemplatePrompts() {
    if (!project) return
    setBusy(true)
    try {
      const updated = await api.updateProject(project.id, {
        style_prompt: '',
        character_prompt: '',
        extra_prompt: '',
      })
      setProject(updated)
      setPromptEdit(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to Restore Template")
    } finally {
      setBusy(false)
    }
  }

  if (!project && !error) {
    return (
      <AppShell active="studio">
        <p className="pf-muted">{"Loading…"}</p>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell active="studio">
        <BillingErrorNotice message={error} />
      </AppShell>
    )
  }

  const structure = (project.shots || []).slice(0, 5).map((s, i) => {
    const labels = ["Beginning", "Development", "Turning Point", "Climax", "Ending"]
    return { label: labels[i] || `Paragraph ${i + 1}`, text: s.narration || s.overlay_title || '—' }
  })

  return (
    <AppShell active="studio" wide>
      <header className="pf-page-head">
        <div className="pf-page-head-row">
          <div>
            <button type="button" className="pf-back" onClick={() => nav(`/studio/${project.id}/style`)}>
              <IconChevronLeft size={18} />
              {"AI-Generated Storyboard / Shot Workbench"}</button>
            <h1 className="pf-page-title">{project.title}</h1>
          </div>
          <div className="pf-toolbar">
            {primaryAction === 'preview' ? (
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-sm pf-btn-icon"
                disabled={busy || !hasFinal}
                onClick={openFinalPreview}
              >
                <IconMonitor size={14} />
                {"Preview Final Video"}</button>
            ) : primaryAction === 'compose' ? (
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-sm pf-btn-icon"
                disabled={busy || running}
                onClick={composeOnly}
              >
                <IconPlay size={14} />
                {"Assemble Final Video"}</button>
            ) : (
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-sm pf-btn-icon"
                disabled={busy || running}
                onClick={() =>
                  shots.length === 0 ? nav(`/studio/${project.id}/style`) : void continueGenerate()
                }
              >
                <IconPlay size={14} />
                {generateLabel}
              </button>
            )}
            <button
              type="button"
              className="pf-btn-text"
              disabled={busy || running || shots.length === 0}
              onClick={openBatchAdjust}
            >
              <IconSliders size={15} />
              {"Batch Adjust"}</button>
            <button
              type="button"
              className="pf-btn-text"
              disabled={busy || running}
              onClick={restartGenerate}
            >
              <IconRefresh size={15} />
              {"Start Over"}</button>
            {primaryAction !== 'preview' && hasFinal ? (
              <button type="button" className="pf-btn-text" onClick={openFinalPreview}>
                <IconMonitor size={15} />
                {"Preview Final Video"}</button>
            ) : null}
            {primaryAction === 'preview' && readyToCompose ? (
              <button
                type="button"
                className="pf-btn-text"
                disabled={busy || running}
                onClick={composeOnly}
title={"Reassemble using Current Shots"}
            >
              {"Reassemble"}</button>
            ) : null}
            {primaryAction !== 'generate' && !readyToCompose ? (
              <button
                type="button"
                className="pf-btn-text"
                disabled={busy || running}
                onClick={continueGenerate}
              >
                {generateLabel === "Generating…" ? "Continue Generating" : generateLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="pf-btn pf-btn-outline pf-btn-sm pf-btn-icon"
              onClick={() => nav(`/studio/${project.id}/editor`)}
            >
              <IconEdit size={14} />
              {"Open Editor"}</button>
          </div>
        </div>
        <Stepper
          steps={kepuSteps(project.pipeline_mode)}
          current={step}
          doneThrough={Math.max(0, step - 1)}
        />
        <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0.55rem 0 0' }}>
          {kepuPhaseHint(project)}
        </p>
      </header>

      {error ? <BillingErrorNotice message={error} /> : null}
      {project.error_msg ? <p className="pf-error">{project.error_msg}</p> : null}

      <div className="pf-board">
        <aside className="pf-create-col">
          <h3>{"Project Settings"}</h3>
          {(project.cover_url || template?.preview_cover) ? (
            <img
              src={api.assetUrl(project.cover_url || template?.preview_cover)}
              alt=""
              style={{ width: '100%', borderRadius: 12, aspectRatio: '16/10', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '16/10',
                borderRadius: 12,
                background: '#e8eaee',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--pf-muted)',
              }}
            >
              <IconImage size={28} />
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => onCoverFile(e.target.files?.[0] || null)}
          />
          <div className="pf-side-actions">
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-icon"
              disabled={busy || running}
              onClick={() => coverInputRef.current?.click()}
            >
              <IconImage size={14} />
              {"Change Cover"}</button>
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-icon"
              disabled={busy || running || !shots.some((s) => s.image_url)}
              onClick={useFirstShotCover}
              title={"Use the First Shot with an Image as the Cover"}
            >
              <IconImage size={14} />
              {"Use First Shot as Cover"}</button>
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-icon"
              disabled={shots.length === 0}
              onClick={() => downloadStoryboardCsv(project)}
            >
              <IconDownload size={14} />
              {"Export Draft"}</button>
          </div>
          <ul className="pf-meta-list" style={{ marginTop: '0.85rem' }}>
            <li>
              <span>{"Project Name"}</span>
              <span>{project.title}</span>
            </li>
            <li>
              <span>{"Status"}</span>
              <span>{statusLabel(project)}</span>
            </li>
            <li>
              <span>{"Progress"}</span>
              <span>{project.progress}%</span>
            </li>
            <li>
              <span>{"Duration"}</span>
              <span>
                {Math.floor(totalDuration / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor(totalDuration % 60)
                  .toString()
                  .padStart(2, '0')}
              </span>
            </li>
            <li>
              <span>{"Aspect Ratio"}</span>
              <span>{project.output_ratio || (project.pipeline_mode === 'image_text' ? '9:16' : '16:9')}</span>
            </li>
            <li>
              <span>{"Production Method"}</span>
              <span>{project.pipeline_mode === 'image_text' ? "Still Image Video" : "AI Video"}</span>
            </li>
            <li>
              <span>{"Style"}</span>
              <span>{template?.name || project.template_id}</span>
            </li>
          </ul>
          <button
            type="button"
            className="pf-btn pf-btn-ghost pf-btn-block pf-btn-sm"
            onClick={() => nav(`/studio/${project.id}/style`)}
            disabled={running}
          >
            {"Edit Project Settings"}</button>
          <div className="pf-prompt-panel">
            <h4>{"Built-in Prompts"}</h4>
            <p className="pf-muted" style={{ fontSize: '0.72rem', margin: '0 0 0.45rem' }}>
              {"The visual style comes from the template. AI determines whether characters appear based on the template and theme; changes made here only override this project."}</p>
            {(
              [
                ["Style", displayPrompts.style_prompt],
                ["Character", displayPrompts.character_prompt],
                ["Additional", displayPrompts.extra_prompt],
              ] as const
            ).map(([label, value]) => (
              <button
                key={label}
                type="button"
                className="pf-prompt-chip"
                disabled={busy || running}
                onClick={() =>
                  setPromptEdit({
                    style_prompt: displayPrompts.style_prompt,
                    character_prompt: displayPrompts.character_prompt,
                    extra_prompt: displayPrompts.extra_prompt,
                  })
                }
              >
                <strong>{label}</strong>
                <span>{(value || '').trim() || "(Empty, click to edit)"}</span>
              </button>
            ))}
          </div>
          <p className="pf-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
            {"Content is AI-generated. Please verify its accuracy."}</p>
        </aside>

        <div className="pf-board-main">
          <div className="pf-outline-grid">
            <article className="pf-create-col">
              <h3>{"AI-Generated Outline"}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65 }}>
                {project.source_text}
              </p>
              <div className="pf-tags">
                <span>{"Core Theme"}</span>
                <span>{project.source_type === 'script' ? "Full Script" : "One-Sentence Topic"}</span>
              </div>
            </article>
            <article className="pf-create-col">
              <h3>{"Structure Summary"}</h3>
              <ul className="pf-meta-list">
                {structure.length ? (
                  structure.map((s) => (
                    <li key={s.label}>
                      <span>{s.label}</span>
                      <span style={{ maxWidth: '60%', textAlign: 'right' }}>{s.text.slice(0, 36)}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>{"Awaiting Storyboard"}</span>
                    <span>—</span>
                  </li>
                )}
              </ul>
            </article>
          </div>

          <section className="pf-shot-card">
            <div className="pf-shot-card-head">
              <h3>{"Storyboard List ("}{project.shots.length} {" scenes)"}</h3>
              <div className="pf-toolbar">
                {project.status === 'DONE' && hasFinal ? (
                  <button type="button" className="pf-btn pf-btn-lime pf-btn-sm" disabled={busy} onClick={publish}>
                    {"Publish"}</button>
                ) : null}
                {hasFinal ? (
                  <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={openFinalPreview}>
                    {"Preview Final Video"}</button>
                ) : (
                  <button
                    type="button"
                    className="pf-btn pf-btn-ghost pf-btn-sm"
                    disabled={busy || running || !readyToCompose}
                    onClick={composeOnly}
                  >
                    {"Assemble Final Video"}</button>
                )}
              </div>
            </div>
            {project.shots.length === 0 ? (
              <p className="pf-muted" style={{ margin: '1.5rem 0', textAlign: 'center' }}>
                {running
                  ? "Splitting into shots…"
                  : "No shots yet. Start generating from the Style Configuration page, then review and edit before manually starting image generation."}
              </p>
            ) : needsScriptConfirm ? (
              <p className="pf-muted" style={{ margin: '0 0 1rem' }}>
                {"The storyboard is ready. Click “Narration” in the table to edit the voice-over (this syncs with the script and affects the voice-over for the entire video), or click “Shot-by-Shot Storyboard” to adjust the visual pacing and @duration. After confirmation, credits are reserved by stage: visuals + voice-over → shot videos → composition."}</p>
            ) : null}
            {project.shots.length === 0 ? null : (
              <div className="pf-shot-table-wrap">
                <table className="pf-shot-table">
                  <thead>
                    <tr>
                      <th className="col-no">{"Scene"}</th>
                      <th className="col-thumb">{"Visuals"}</th>
                      <th className="col-narr">{"Narration/Dialogue"}</th>
                      <th className="col-seg">{"Shot-by-Shot Storyboard"}</th>
                      <th className="col-dur">{"Duration"}</th>
                      <th className="col-status">{"Status"}</th>
                      <th className="col-ops">{"Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shots.map((shot) => {
                      /*
                       * localBusy 本镜请求已发出、任务尚未回写
                       * shotGenerating 本镜任务或本地提交中
                       * pipelineLocked 整片流水线/配音占用
                       * displayKind / done / failed 按素材完备度展示
                       */
                      const localBusy = busyShotIds.has(shot.id)
                      const shotGenerating = isShotGenerating(project, shot.id) || localBusy
                      const pipelineLocked = isProjectWideBusy(project)
                      const rowBusy = busy || pipelineLocked || shotGenerating
                      const displayKind = shotDisplayKind(shot, {
                        pipelineMode: project.pipeline_mode,
                        generating: shotGenerating,
                      })
                      const done = shotDisplayDone(displayKind)
                      const failed = displayKind === 'failed'
                      const sceneTitle =
                        shot.overlay_title?.trim() || `Scene ${String(shot.shot_no).padStart(2, '0')}`
                      const narration = (shot.narration || '').trim()
                      const script = shot.segment_script || shot.video_prompt || ''
                      const { cues, beats } = parseSegmentScript(script)
                      const desc = scenePromptForDisplay(shot.img_prompt).trim()
                      return (
                        <tr key={shot.id}>
                          <td className="col-no">{String(shot.shot_no).padStart(2, '0')}</td>
                          <td className="col-thumb">
                            <button
                              type="button"
                              className="pf-shot-thumb-btn"
                              onClick={() =>
                                setPreview({
                                  kind: 'shot',
                                  shotNo: shot.shot_no,
                                  imageUrl: shot.image_url,
                                  videoUrl: shot.video_url,
                                  audioUrl: shot.audio_url,
                                  caption: shotCaption(shot),
                                })
                              }
                            >
                              {shot.image_url ? (
                                <img
                                  className="pf-shot-thumb"
                                  src={api.assetUrl(shot.image_url, shot.version)}
                                  alt=""
                                />
                              ) : (
                                <div className="pf-shot-thumb empty">
                                  {shotGenerating ? "Generating" : "Awaiting Image"}
                                </div>
                              )}
                            </button>
                          </td>
                          <td className="col-narr">
                            <button
                              type="button"
                              className="pf-shot-narration pf-shot-editable"
                              disabled={rowBusy}
                              title={"Click to edit narration and title"}
                              onClick={() => openShotEdit(shot, 'narration')}
                            >
                              <span className="title">{sceneTitle}</span>
                              <span className="line">
                                {narration ? `“${narration}”` : '—'}
                              </span>
                            </button>
                          </td>
                          <td className="col-seg">
                            <button
                              type="button"
                              className="pf-shot-desc pf-shot-editable"
                              disabled={rowBusy}
                              title={"Click to edit the shot-by-shot storyboard script"}
                              onClick={() => openShotEdit(shot, 'segment_script')}
                              style={{ textAlign: 'left', width: '100%' }}
                            >
                              {cues.length > 0 ? (
                                <span className="pf-muted" style={{ display: 'block', fontSize: '0.75rem' }}>
                                  {cues[0]?.replace(/^【|】$/g, '').slice(0, 28)}
                                  {cues[1]
                                    ? ` · ${cues[1].replace(/^【BGM[:：]\s*|】$/g, '').slice(0, 16)}`
                                    : ''}
                                </span>
                              ) : null}
                              {beats.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                  {beats.slice(0, 4).map((b, i) => (
                                    <span key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                      {b.duration > 0 ? (
                                        <span
                                          style={{
                                            flex: '0 0 auto',
                                            fontSize: '0.72rem',
                                            background: '#111',
                                            color: '#fff',
                                            borderRadius: 4,
                                            padding: '1px 5px',
                                          }}
                                        >
                                          {b.duration}s
                                        </span>
                                      ) : null}
                                      <span style={{ fontSize: '0.82rem' }}>
                                        {b.text.length > 42 ? `${b.text.slice(0, 42)}…` : b.text}
                                      </span>
                                    </span>
                                  ))}
                                  {beats.length > 4 ? (
                                    <span className="pf-muted" style={{ fontSize: '0.75rem' }}>
                                      {"plus"}{beats.length - 4} {" sections…"}</span>
                                  ) : null}
                                </div>
                              ) : (
                                desc || "(Click to fill in the storyboard shot by shot)"
                              )}
                            </button>
                          </td>
                          <td className="col-dur">{formatMmSs(shot.duration)}</td>
                          <td className="col-status">
                            <span
                              className={[
                                'pf-shot-status',
                                failed ? 'bad' : done ? '' : 'warn',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {done && !failed ? <span className="mark">✓</span> : null}
                              {shotDisplayLabel(displayKind)}
                            </span>
                          </td>
                          <td className="col-ops">
                            <div className="pf-shot-ops">
                              <button
                                type="button"
                                className="op"
                                disabled={rowBusy}
                                onClick={() => openShotEdit(shot)}
                              >
                                {"Edit"}</button>
                              <button
                                type="button"
                                className="op"
                                disabled={rowBusy}
                                onClick={() => regenImage(shot)}
                              >
                                {shot.image_url ? "Redraw Visual" : "Generate Visual"}
                              </button>
                              {isFullPipeline ? (
                                <button
                                  type="button"
                                  className="op op-video"
                                  disabled={rowBusy || !shot.image_url}
                                  title={!shot.image_url ? "Please generate the visual for this shot first" : undefined}
                                  onClick={() => regenVideo(shot)}
                                >
                                  {shot.video_url ? "Regenerate Video" : "Generate Video"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="more"
                                aria-label={"More Actions"}
                                disabled={rowBusy}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMenuShotId((id) => (id === shot.id ? null : shot.id))
                                }}
                              >
                                ⋮
                              </button>
                              {menuShotId === shot.id ? (
                                <div className="pf-shot-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    disabled={rowBusy}
                                    onClick={() => {
                                      setMenuShotId(null)
                                      regenAudio(shot)
                                    }}
                                  >
                                    {"Regenerate Voiceover"}</button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pf-shot-footer">
              <span className="pf-muted" style={{ fontSize: '0.82rem' }}>
                {"Total Duration:"}{formatMmSs(totalDuration)} {"| Visuals:"}{project.shots.length} {" items | Audio:"}{' '}
                {project.shots.filter((s) => s.audio_url).length} {" segments | Resolution: Preview"}</span>
              <div className="pf-toolbar">
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-icon"
                  disabled={shots.length === 0}
                  onClick={() => downloadStoryboardCsv(project)}
                >
                  <IconDownload size={15} />
                  {"Export Storyboard Script"}</button>
                <button
                  type="button"
                  className="pf-btn-text"
                  disabled={busy || running}
                  onClick={deleteProject}
                >
                  <IconTrash size={15} />
                  {"Delete Project"}</button>
              </div>
            </div>
          </section>
        </div>

        <aside className="pf-create-col pf-board-settings">
          <h3>{"Generation Progress"}</h3>
          <ul className="pf-progress-list">
            {progressItems.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span>
                  {item.done ? (
                    <span className="pf-check">✓</span>
                  ) : item.run ? (
                    `${item.pct ?? 0}%`
                  ) : (
                    '…'
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="pf-meter" style={{ marginTop: '1rem' }}>
            <i style={{ width: `${Math.min(100, project.progress)}%` }} />
          </div>
          <p className="pf-muted" style={{ fontSize: '0.82rem' }}>
            {statusLabel(project)}
          </p>
        </aside>
      </div>

      {batchOpen && project ? (
        <div className="modal-backdrop" onClick={() => !busy && setBatchOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{"Batch Adjust Shots"}</h3>
            <p className="pf-muted" style={{ marginTop: 0 }}>
              {"Selected"}{batchSelected.length} / {project.shots.length} {" shots"}</p>
            <div
              style={{
                maxHeight: 160,
                overflow: 'auto',
                border: '1px solid var(--pf-border, #e5e7eb)',
                borderRadius: 10,
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={batchSelected.length === project.shots.length && project.shots.length > 0}
                  onChange={(e) =>
                    setBatchSelected(e.target.checked ? project.shots.map((s) => s.id) : [])
                  }
                />
                {"Select All"}</label>
              {project.shots
                .slice()
                .sort((a, b) => a.shot_no - b.shot_no)
                .map((s) => (
                  <label
                    key={s.id}
                    style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}
                  >
                    <input
                      type="checkbox"
                      checked={batchSelected.includes(s.id)}
                      onChange={(e) =>
                        setBatchSelected((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        )
                      }
                    />
                    {"Shot"}{String(s.shot_no).padStart(2, '0')} · {formatMmSs(Number(s.duration) || 0)}
                  </label>
                ))}
            </div>
            <label>
              {"Set duration (seconds; leave blank to keep unchanged)"}<input
                type="number"
                min={1}
                step={0.5}
                placeholder={"e.g. 6"}
                value={batchDuration}
                onChange={(e) => setBatchDuration(e.target.value)}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={batchRegenAudio}
                onChange={(e) => setBatchRegenAudio(e.target.checked)}
              />
              {"Regenerate voiceover for selected shots"}</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="pf-btn pf-btn-lime"
                disabled={busy || batchSelected.length === 0}
                onClick={applyBatchAdjust}
              >
                {"Apply"}</button>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                disabled={busy}
                onClick={() => setBatchOpen(false)}
              >
                {"Cancel"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" onClick={closeShotEdit}>
          <div
            className={[
              'modal',
              'pf-prompt-modal',
              editMode === 'narration' ? 'pf-prompt-modal--narration' : '',
              editMode === 'segment' ? 'pf-prompt-modal--segment' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {editMode === 'narration'
                ? `Edit Shot ${editing.shot_no} · Voiceover & Title`
                : editMode === 'segment'
                  ? `Edit Shot ${editing.shot_no} · Shot-by-Shot Storyboard`
                  : `Edit Shot ${editing.shot_no} · All Prompts`}
            </h3>
            <div className="pf-prompt-modal-scroll">
              {editMode === 'narration' || editMode === 'full' ? (
                <>
                  <label>
                    {"Shot Title"}<input
                      autoFocus={editFocus === 'title' || editMode === 'narration'}
                      value={editing.overlay_title || ''}
                      onChange={(e) => setEditing({ ...editing, overlay_title: e.target.value })}
                    />
                    <span className="pf-muted pf-prompt-hint">
                      {"Storyboard list name; overlaid at the top of the frame for image-to-video creation"}</span>
                  </label>
                  <label>
                    {"Subtitle"}<input
                      value={editing.overlay_subtitle || ''}
                      onChange={(e) => setEditing({ ...editing, overlay_subtitle: e.target.value })}
                    />
                    <span className="pf-muted pf-prompt-hint">
                      {"Overlaid text for image-to-video creation; not burned into AI video outputs, used only as storyboard notes"}</span>
                  </label>
                  <label>
                    {"Narration"}<textarea
                      autoFocus={editFocus === 'narration'}
                      value={editing.narration}
                      onChange={(e) => patchEditingNarration(e.target.value)}
                      rows={editMode === 'narration' ? 6 : 3}
                    />
                    <span className="pf-muted pf-prompt-hint">
                      {"Syncs to the script's voiceover segment and affects the voiceover for the entire project (regenerate the voiceover/final video after editing)"}</span>
                  </label>
                </>
              ) : null}
              {editMode === 'full' ? (
                <label>
                  {"Visual Prompt (First Frame)"}<textarea
                    autoFocus={editFocus === 'img_prompt'}
                    value={editing.img_prompt}
                    onChange={(e) => patchEditingVisual(e.target.value)}
                    rows={3}
                  />
                  <span className="pf-muted pf-prompt-hint">
                    {"Syncs to the first visual in the script; used for both image and video generation"}</span>
                </label>
              ) : null}
              {editMode === 'segment' || editMode === 'full' ? (
                <>
                  <label>
                    {"Shot-by-shot storyboard script (visual pacing and @duration)"}<textarea
                      className="pf-prompt-segment"
                      autoFocus={editFocus === 'segment_script' || editMode === 'segment'}
                      value={editing.segment_script || editing.video_prompt || ''}
                      onChange={(e) => patchEditingScript(e.target.value)}
                      rows={editMode === 'segment' ? 8 : 5}
                      placeholder={SEGMENT_SCRIPT_PLACEHOLDER}
                    />
                  </label>
                  <div className="pf-chips pf-prompt-duration-chips">
                    {editDurationCheck.durations.length > 0 ? (
                      editDurationCheck.durations.map((sec, i) => (
                        <span key={`${sec}-${i}`} className="pf-chip" style={{ cursor: 'default' }}>
                          {sec}s
                        </span>
                      ))
                    ) : (
                      <span className="pf-muted" style={{ fontSize: '0.8rem' }}>
                        {"No @duration tags yet"}</span>
                    )}
                    <span
                      className="pf-muted"
                      style={{
                        fontSize: '0.8rem',
                        marginLeft: 'auto',
                        color: editDurationCheck.valid ? undefined : 'var(--pf-danger, #c0392b)',
                      }}
                    >
                      {"Total"}{editDurationCheck.total}s / {SHOT_DURATION_MAX}s
                    </span>
                  </div>
                  {!editDurationCheck.valid && editDurationCheck.message ? (
                    <p className="pf-error pf-prompt-duration-error">{editDurationCheck.message}</p>
                  ) : null}
                  <label>
                    {"Camera Notes"}<input
                      value={editing.camera || ''}
                      onChange={(e) => setEditing({ ...editing, camera: e.target.value })}
                    />
                  </label>
                  <div className="pf-prompt-modal-row">
                    <label>
                      {"Duration (seconds; recalculated from @duration after saving)"}<input
                        type="number"
                        value={editing.duration}
                        onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                </>
              ) : null}
            </div>
            <div className="pf-prompt-modal-foot">
              {editMode !== 'segment' ? (
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-sm"
                  onClick={() => {
                    setEditMode('segment')
                    setEditFocus('segment_script')
                  }}
                >
                  {"Shot-by-Shot Storyboard…"}</button>
              ) : null}
              {editMode !== 'narration' ? (
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-sm"
                  onClick={() => {
                    setEditMode('narration')
                    setEditFocus('narration')
                  }}
                >
                  {"Voiceover & Title…"}</button>
              ) : null}
              {editMode !== 'full' ? (
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-sm"
                  onClick={() => {
                    setEditMode('full')
                    setEditFocus('')
                  }}
                >
                  {"All Fields"}</button>
              ) : null}
              <span className="pf-prompt-modal-foot-spacer" />
              <button
                type="button"
                className="pf-btn pf-btn-lime"
                disabled={busy || !editDurationCheck.valid}
                onClick={saveShot}
              >
                {"Save"}</button>
              <button type="button" className="pf-btn pf-btn-ghost" onClick={closeShotEdit}>
                {"Cancel"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {promptEdit ? (
        <div className="modal-backdrop" onClick={() => setPromptEdit(null)}>
          <div className="modal pf-prompt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{"Project Built-in Prompts"}</h3>
            <p className="pf-muted" style={{ fontSize: '0.8rem', marginTop: 0 }}>
              {"Follows the backend template by default. Saving content identical to the template automatically removes the override; generated shots must be regenerated to update."}</p>
            <label>
              {"Style Prompt"}<textarea
                value={promptEdit.style_prompt}
                onChange={(e) => setPromptEdit({ ...promptEdit, style_prompt: e.target.value })}
                rows={3}
              />
            </label>
            <label>
              {"Character Prompt"}<textarea
                autoFocus
                value={promptEdit.character_prompt}
                onChange={(e) => setPromptEdit({ ...promptEdit, character_prompt: e.target.value })}
                rows={3}
              />
            </label>
            <label>
              {"Additional Requirements"}<textarea
                value={promptEdit.extra_prompt}
                onChange={(e) => setPromptEdit({ ...promptEdit, extra_prompt: e.target.value })}
                rows={2}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pf-btn pf-btn-lime"
                disabled={busy}
                onClick={saveProjectPrompts}
              >
                {"Save"}</button>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                disabled={busy}
                onClick={() => void restoreTemplatePrompts()}
              >
                {"Restore Backend Template"}</button>
              <button type="button" className="pf-btn pf-btn-ghost" onClick={() => setPromptEdit(null)}>
                {"Cancel"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                {preview.kind === 'final' ? preview.title : `Shot ${preview.shotNo}`}
              </h3>
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={() => setPreview(null)}>
                {"Close"}</button>
            </div>
            {preview.kind === 'final' ? (
              <video className="preview-media" src={preview.url} controls autoPlay />
            ) : preview.videoUrl ? (
              <video
                className="preview-media"
                src={api.assetUrl(preview.videoUrl)}
                poster={preview.imageUrl ? api.assetUrl(preview.imageUrl) : undefined}
                controls
                autoPlay
              />
            ) : preview.imageUrl ? (
              <img className="preview-media" src={api.assetUrl(preview.imageUrl)} alt="" />
            ) : (
              <p className="pf-muted">{"No Preview Yet"}</p>
            )}
            {preview.kind === 'shot' && preview.audioUrl ? (
              <audio src={api.assetUrl(preview.audioUrl)} controls style={{ width: '100%' }} />
            ) : null}
            {preview.kind === 'shot' ? <p className="pf-muted">{preview.caption}</p> : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
