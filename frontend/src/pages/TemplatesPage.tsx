import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Template } from '../api'
import BillingErrorNotice from '../components/billing/BillingErrorNotice'
import AppShell from '../components/layout/AppShell'
import PillTabs from '../components/ui/PillTabs'
import { CATEGORY_ORDER, HOME_CATEGORY_LABELS } from '../lib/categories'

export default function TemplatesPage() {
  const nav = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState('')
  const [category, setCategory] = useState("All")
  const [q, setQ] = useState('')

  useEffect(() => {
    api
      .templates()
      .then(setTemplates)
      .catch((e) => setError(String(e.message || e)))
  }, [])

  const categoryKeys = useMemo(() => {
    const found = new Set<string>()
    for (const t of templates) {
      for (const c of t.category || []) {
        if (CATEGORY_ORDER.includes(c)) found.add(c)
      }
    }
    return ["All", ...CATEGORY_ORDER.filter((c) => found.has(c))]
  }, [templates])

  const categoryLabels = categoryKeys.map((k) => HOME_CATEGORY_LABELS[k] || k)
  const labelToKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const k of categoryKeys) m.set(HOME_CATEGORY_LABELS[k] || k, k)
    return m
  }, [categoryKeys])

  const filtered = useMemo(() => {
    let list = templates
    if (category !== "All") list = list.filter((t) => (t.category || []).includes(category))
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(
        (t) => t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s),
      )
    }
    return list
  }, [templates, category, q])

  function openTemplate(t: Template) {
    if (!localStorage.getItem('token')) {
      nav('/auth')
      return
    }
    nav(`/studio/new?template=${t.id}`)
  }

  return (
    <AppShell active="templates">
      <div className="pf-section-head">
        <div>
          <h2>{"Template Library"}</h2>
          <p>{"Choose a visual language for Short Videos and knowledge shorts"}</p>
        </div>
      </div>
      <div className="pf-search" style={{ maxWidth: 420, marginBottom: '1rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={"Search template names or descriptions"}
        />
      </div>
      <PillTabs
        items={categoryLabels}
        value={HOME_CATEGORY_LABELS[category] || category}
        onChange={(label) => setCategory(labelToKey.get(label) || "All")}
        ariaLabel={"Template Categories"}
      />
      {error ? <BillingErrorNotice message={error} /> : null}
      <div className="pf-template-grid" style={{ marginTop: '1rem' }}>
        {filtered.map((t) => (
          <button key={t.id} type="button" className="pf-template-card" onClick={() => openTemplate(t)}>
            <img src={api.assetUrl(t.preview_cover)} alt="" />
            <div className="body">
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div className="pf-tags">
                {t.category.map((c) => (
                  <span key={c}>{HOME_CATEGORY_LABELS[c] || c}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <p className="pf-muted">{"No matching templates."}</p> : null}
    </AppShell>
  )
}
