import { useEffect, useState } from 'react'
import { apiKeysApi, getPublicApiBase, type ApiKeyItem } from '../../api/apiKeys'
import { dialog } from '../../lib/dialog'

/** 格式化时间 */
function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 设置页 API：Key 管理与调用文档 */
export default function ApiKeysPanel() {
  /*
   * keys Key 列表
   * name 新建名称
   * busy 提交中
   * error 错误
   * createdSecret 刚创建的一次性 secret
   */
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdSecret, setCreatedSecret] = useState('')

  const base = getPublicApiBase()

  async function reload() {
    setError('')
    try {
      setKeys(await apiKeysApi.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to Load")
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function handleCreate() {
    if (busy) return
    setBusy(true)
    setError('')
    setCreatedSecret('')
    try {
      const row = await apiKeysApi.create(name.trim() || "Default Key")
      setCreatedSecret(row.secret)
      setName('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(item: ApiKeyItem) {
    const ok = await dialog.confirm({
      title: "Revoke API Key",
      message: `Revoke “${item.name}” (${item.key_prefix}…)? This cannot be undone.`,
      confirmText: "Undo",
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await apiKeysApi.revoke(item.id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation failed")
    } finally {
      setBusy(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="pf-settings-card">
      <h1>API</h1>
      <p className="pf-muted">{"Use an API Key to call image generation, video generation, and Seedance forwarding services. Charges are deducted from your balance based on usage."}</p>

      <div className="pf-api-create">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={"Key name, e.g. “Production”"}
          maxLength={64}
        />
        <button type="button" className="pf-btn pf-btn-lime pf-btn-sm" disabled={busy} onClick={() => void handleCreate()}>
          {busy ? "Processing…" : "Create Key"}
        </button>
      </div>

      {createdSecret ? (
        <div className="pf-api-secret">
          <p>
            <strong>{"Copy and save it now. It cannot be viewed again after closing:"}</strong>
          </p>
          <code>{createdSecret}</code>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={() => void copyText(createdSecret)}>
            {"Copy Key"}</button>
        </div>
      ) : null}

      {error ? <p className="pf-error">{error}</p> : null}

      {keys.length > 0 ? (
        <ul className="pf-settings-list pf-api-key-list">
          {keys.map((item) => (
            <li key={item.id}>
              <div className="pf-settings-list-row">
                <span className="pf-settings-list-main">
                  <strong>{item.name}</strong>
                  <em className="pf-muted">
                    {item.key_prefix}{"… · Created on"}{formatWhen(item.created_at)}
                    {item.last_used_at ? ` · Last used ${formatWhen(item.last_used_at)}` : ''}
                  </em>
                </span>
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-sm"
                  disabled={busy}
                  onClick={() => void handleRevoke(item)}
                >
                  {"Undo"}</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="pf-settings-empty">
          <p>{"No API Keys yet"}</p>
        </div>
      )}

      <div className="pf-api-docs">
        <h3>{"Usage Instructions"}</h3>
        <p className="pf-muted">{"Authentication: choose either Header"}</p>
        <pre>{`Authorization: Bearer pf_live_...\nX-Api-Key: pf_live_...`}</pre>

        <p className="pf-muted">{"Image Generation (Seedream)"}</p>
        <pre>{`POST ${base}/api/v1/images/generations
Content-Type: application/json

{
  "prompt": "Cyberpunk city at night",
  "ratio": "16:9",
  "image_url": null
}`}</pre>

        <p className="pf-muted">{"Video Generation (Seedance image-to-video from the first frame)"}</p>
        <pre>{`POST ${base}/api/v1/videos/generations

{
  "prompt": "The camera slowly moves forward as neon lights flicker",
  "image_url": "https://.../first_frame.jpg",
  "duration": 5,
  "resolution": "480p"
}`}</pre>

        <p className="pf-muted">{"Seedance Forwarding (multimodal body)"}</p>
        <pre>{`POST ${base}/api/v1/seedance/tasks

{
  "content": [
    { "type": "text", "text": "Description..." },
    { "type": "image_url", "image_url": { "url": "https://..." }, "role": "first_frame" }
  ],
  "duration": 5,
  "resolution": "480p"
}`}</pre>

        <p className="pf-muted">{"Query Video Task"}</p>
        <pre>{`GET ${base}/api/v1/tasks/{task_id}`}</pre>
      </div>
    </section>
  )
}
