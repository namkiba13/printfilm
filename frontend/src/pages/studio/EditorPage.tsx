import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import type { Project, Shot } from '../../api'
import BillingErrorNotice from '../../components/billing/BillingErrorNotice'
import AppShell from '../../components/layout/AppShell'
import ComingSoon from '../../components/ui/ComingSoon'
import { STATUS_CN, shotsByNo } from '../../lib/status'
import { downloadSingleVideo } from '../../lib/clientDownload'

const PANEL_TABS = ["Script", "Visuals", "Voiceover", "Transitions"] as const

export default function EditorPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const nav = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [activeShotId, setActiveShotId] = useState<number | null>(null)
  const [tab, setTab] = useState<(typeof PANEL_TABS)[number]>("Script")
  const [narration, setNarration] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shotFileRef = useRef<HTMLInputElement>(null)

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
        const first = p.shots[0]
        if (first) {
          setActiveShotId(first.id)
          setNarration(first.narration || '')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to Load"))
  }, [nav, projectId])

  const orderedShots = useMemo(() => shotsByNo(project?.shots), [project?.shots])
  const shot: Shot | undefined = useMemo(
    () => orderedShots.find((s) => s.id === activeShotId),
    [orderedShots, activeShotId],
  )
  const shotIndex = shot ? orderedShots.findIndex((s) => s.id === shot.id) : -1

  const totalDuration = useMemo(
    () => (project?.shots || []).reduce((s, x) => s + (Number(x.duration) || 0), 0),
    [project?.shots],
  )

  function selectShot(s: Shot) {
    setActiveShotId(s.id)
    setNarration(s.narration || '')
  }

  async function saveNarration() {
    if (!project || !shot) return
    setBusy(true)
    setError('')
    try {
      await api.updateShot(project.id, shot.id, { narration })
      setProject(await api.getProject(project.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function regenImage() {
    if (!project || !shot) return
    setBusy(true)
    try {
      await api.regenImage(project.id, shot.id)
      setProject(await api.getProject(project.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed")
    } finally {
      setBusy(false)
    }
  }

  /** 在片尾追加一镜，并选中新建镜头。 */
  async function addShot() {
    if (!project) return
    setBusy(true)
    setError('')
    try {
      const created = await api.createShot(project.id)
      const next = await api.getProject(project.id)
      setProject(next)
      const s = next.shots.find((x) => x.id === created.id)
      if (s) selectShot(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add shot")
    } finally {
      setBusy(false)
    }
  }

  /** 将当前镜与相邻镜对调顺序。 */
  async function moveShot(delta: number) {
    if (!project || !shot) return
    const ordered = orderedShots
    const i = ordered.findIndex((s) => s.id === shot.id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ordered.length) return
    const ids = ordered.map((s) => s.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setBusy(true)
    setError('')
    try {
      setProject(await api.reorderShots(project.id, ids))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder")
    } finally {
      setBusy(false)
    }
  }

  /** 上传本镜静帧，替换后需重出视频。 */
  async function onShotImageFile(file: File | null) {
    if (!project || !shot || !file) return
    setBusy(true)
    setError('')
    try {
      setProject(await api.uploadShotImage(project.id, shot.id, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setBusy(false)
      if (shotFileRef.current) shotFileRef.current.value = ''
    }
  }

  /** 下载已合成的成片。 */
  async function exportFilm() {
    if (!project?.final_video_url) return
    setBusy(true)
    setError('')
    try {
      await downloadSingleVideo({
        projectId: project.id,
        title: project.title,
        url: api.assetUrl(project.final_video_url, project.updated_at),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  async function regenAudio() {
    if (!project || !shot) return
    setBusy(true)
    try {
      await api.regenAudio(project.id, shot.id)
      setProject(await api.getProject(project.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate voiceover")
    } finally {
      setBusy(false)
    }
  }

  if (!project && !error) {
    return (
      <AppShell active="studio" flush>
        <p className="pf-muted" style={{ padding: '2rem' }}>
          {"Loading…"}</p>
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

  const isPortrait = (project.output_ratio || '') === '9:16' || (!project.output_ratio && project.pipeline_mode === 'image_text')
  // Prefer current shot media; final film is for dedicated preview, not shot editing.
  const shotVideo = shot?.video_url ? api.assetUrl(shot.video_url, shot.version) : null
  const shotImage = shot?.image_url ? api.assetUrl(shot.image_url, shot.version) : null

  return (
    <AppShell active="studio" flush>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--pf-line)',
          background: '#fff',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button type="button" className="pf-link" onClick={() => nav(`/studio/${project.id}`)}>
            {"← Back to Project"}</button>
          <strong>{project.title}</strong>
          <span className="pf-muted" style={{ fontSize: '0.8rem' }}>
            {STATUS_CN[project.status] || project.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" disabled>
            {"Undo"}<ComingSoon />
          </button>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" disabled>
            {"Redo"}<ComingSoon />
          </button>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" disabled>
            {"Save Draft"}<ComingSoon />
          </button>
          <button
            type="button"
            className="pf-btn pf-btn-ghost pf-btn-sm"
            disabled={!shot?.video_url && !project.final_video_url}
            onClick={() => {
              const el = document.getElementById('pf-editor-player') as HTMLVideoElement | null
              if (el) {
                el.play()
                return
              }
              if (project.final_video_url) {
                window.open(api.assetUrl(project.final_video_url, project.updated_at), '_blank')
              }
            }}
          >
            {"Preview Playback"}</button>
          <button
            type="button"
            className="pf-btn pf-btn-lime pf-btn-sm"
            disabled={busy || !project.final_video_url}
            onClick={() => void exportFilm()}
          >
            {"Export Video"}</button>
        </div>
      </div>

      {error ? (
        <BillingErrorNotice message={error} style={{ padding: '0.5rem 1.25rem' }} />
      ) : null}

      <div className="pf-editor">
        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <strong>{"Scene List"}</strong>
            <button type="button" className="pf-link" disabled={busy} onClick={() => void addShot()}>
              {"+ Add Shot"}</button>
          </div>
          {orderedShots.map((s) => (
            <button
              key={s.id}
              type="button"
              className={activeShotId === s.id ? 'pf-scene-item active' : 'pf-scene-item'}
              onClick={() => selectShot(s)}
            >
              {s.image_url ? (
                <img src={api.assetUrl(s.image_url, s.version)} alt="" />
              ) : (
                <div className="ph" />
              )}
              <div>
                <strong style={{ fontSize: '0.82rem' }}>
                  {String(s.shot_no).padStart(2, '0')} {s.overlay_title || "Shot"}
                </strong>
                <div className="pf-muted" style={{ fontSize: '0.72rem' }}>
                  {(s.narration || '').slice(0, 28)}
                </div>
              </div>
            </button>
          ))}
          <p className="pf-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
            {"Total Duration"}{' '}
            {Math.floor(totalDuration / 60)
              .toString()
              .padStart(2, '0')}
            :
            {Math.floor(totalDuration % 60)
              .toString()
              .padStart(2, '0')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm"
              disabled={busy || !shot || shotIndex <= 0}
              onClick={() => void moveShot(-1)}
            >
              {"Move Up"}</button>
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm"
              disabled={busy || !shot || shotIndex < 0 || shotIndex >= orderedShots.length - 1}
              onClick={() => void moveShot(1)}
            >
              {"Move Down"}</button>
          </div>
        </aside>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <strong>
              {shot ? `Shot ${shot.shot_no}` : "Preview"} · {isPortrait ? '9:16' : '16:9'}
            </strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={shotFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => void onShotImageFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="pf-btn pf-btn-ghost pf-btn-sm"
                disabled={busy || !shot}
                onClick={() => shotFileRef.current?.click()}
              >
                {"Upload Image"}</button>
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" disabled={busy} onClick={regenImage}>
                {"AI Redraw"}</button>
            </div>
          </div>
          <div className={isPortrait ? 'pf-editor-preview portrait' : 'pf-editor-preview'}>
            {shotVideo ? (
              <video
                id="pf-editor-player"
                key={`v-${shot?.id}-${shot?.version}`}
                src={shotVideo}
                poster={shotImage || undefined}
                controls
                playsInline
              />
            ) : shotImage ? (
              <img key={`i-${shot?.id}-${shot?.version}`} src={shotImage} alt="" />
            ) : (
              <span className="empty">{"No Image"}</span>
            )}
          </div>
          {shot?.audio_url ? (
            <audio
              src={api.assetUrl(shot.audio_url)}
              controls
              style={{ width: '100%', marginTop: '0.65rem' }}
            />
          ) : null}

          <div
            style={{
              marginTop: '0.85rem',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {orderedShots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectShot(s)}
                style={{
                  border: activeShotId === s.id ? '2px solid var(--pf-lime)' : '1px solid var(--pf-line)',
                  borderRadius: 8,
                  padding: 0,
                  background: 'transparent',
                }}
              >
                {s.image_url ? (
                  <img
                    src={api.assetUrl(s.image_url, s.version)}
                    alt=""
                    style={{ width: 88, height: 50, objectFit: 'cover', display: 'block', borderRadius: 6 }}
                  />
                ) : (
                  <div style={{ width: 88, height: 50, background: '#eee', borderRadius: 6 }} />
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: '0.85rem',
              border: '1px dashed var(--pf-line)',
              borderRadius: 12,
              padding: '1.25rem',
              textAlign: 'center',
              color: 'var(--pf-muted)',
              fontSize: '0.9rem',
            }}
          >
            {"Use “Upload Image” to replace this shot’s image, or “AI Redraw” to regenerate it from the prompt."}</div>

          <div style={{ marginTop: '1rem' }}>
            <div className="pf-panel-tabs">
              {["Asset Library", "Favorite Assets", "AI-Generated Assets", "My Uploads"].map((t) => (
                <button key={t} type="button" disabled>
                  {t}
                </button>
              ))}
            </div>
            <p className="pf-muted" style={{ fontSize: '0.85rem' }}>
              {"The asset library is coming soon. For now, use “Upload Image” or “AI Redraw” above to replace this shot’s image."}</p>
          </div>
        </section>

        <aside>
          <div className="pf-panel-tabs">
            {PANEL_TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Script" ? (
            <>
              <label className="pf-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                {"Script Content"}<textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    borderRadius: 10,
                    border: '1px solid var(--pf-line)',
                    padding: '0.65rem',
                  }}
                />
              </label>
              <button
                type="button"
                className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-block"
                style={{ marginTop: 8 }}
                disabled
              >
                {"AI, optimize this shot for me"}<ComingSoon />
              </button>
              <div style={{ marginTop: '0.85rem' }}>
                <strong style={{ fontSize: '0.88rem' }}>
                  {"Style Settings"}<ComingSoon />
                </strong>
                <p className="pf-muted" style={{ fontSize: '0.8rem' }}>
                  {"Font / Size / Color / Alignment placeholder"}</p>
              </div>
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-block"
                style={{ marginTop: '1rem' }}
                disabled={busy}
                onClick={saveNarration}
              >
                {"Save Script"}</button>
            </>
          ) : null}

          {tab === "Visuals" ? (
            <>
              <p className="pf-muted" style={{ fontSize: '0.88rem' }}>
                {"Use the preview area to replace this shot's image with “Upload Visual,” or regenerate it from a prompt with “AI Redraw.”"}</p>
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-block"
                disabled={busy}
                onClick={regenImage}
              >
                {"Regenerate Current Shot"}</button>
            </>
          ) : null}

          {tab === "Voiceover" ? (
            <>
              <p className="pf-muted" style={{ fontSize: '0.88rem' }}>
                {"Replace the voiceover for this shot (using the project's voice)."}</p>
              <button
                type="button"
                className="pf-btn pf-btn-lime pf-btn-block"
                disabled={busy}
                onClick={regenAudio}
              >
                {"Replace Voiceover"}</button>
            </>
          ) : null}

          {tab === "Transitions" ? (
            <div className="pf-hint">
              {"Transition effects (fade in/out, flash, camera movement transitions, etc.) are coming soon."}</div>
          ) : null}

          <button
            type="button"
            className="pf-btn pf-btn-ghost pf-btn-block"
            style={{ marginTop: '1rem' }}
            disabled
          >
            {"Apply to All Similar Shots"}<ComingSoon />
          </button>
        </aside>
      </div>
    </AppShell>
  )
}
