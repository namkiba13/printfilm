import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, defaultsFromTemplate } from '../../api'
import type { Template } from '../../api'
import BillingErrorNotice from '../../components/billing/BillingErrorNotice'
import AppShell from '../../components/layout/AppShell'
import Stepper from '../../components/ui/Stepper'
import PillTabs from '../../components/ui/PillTabs'
import { IconChevronLeft, IconRefresh, IconSparkles } from '../../components/ui/Icons'
import { CATEGORY_ORDER, HOME_CATEGORY_LABELS } from '../../lib/categories'
import { kepuStepIndex, kepuSteps } from '../../lib/status'

type Inspiration = {
  title: string
  theme: string
  script: string
}

const INSPIRATION_POOL: Inspiration[] = [
  {
    title: "How to Film a Store Visit Check-In",
    theme: "Turn a local store’s selling points into a Douyin customer-acquisition voiceover: a hook in the first 3 seconds, the setting, 1-2 experiences, and a call to visit the store. Include only known facts.",
    script:
      "I passed this street ten times before finally stepping inside.\n\n" +
      "The place is small, the sign is clear, and it's near the subway entrance.\n\n" +
      "I ordered their signature item and am judging it by my own experience: authentic flavor, served quickly.\n\n" +
      "If you want to try it, check the available set menus for yourself, and don't rely on absolute promises.",
  },
  {
    title: "A Note Recommended by a Best Friend",
    theme: "Xiaohongshu customer-acquisition recommendation: a hook title, first impression, detailed real experiences, and who to recommend it to. State selling points objectively only.",
    script:
      "I only meant to pass by, but ended up sitting there for a long time.\n\n" +
      "My first impression was the clean lighting and comfortable spacing between the seats.\n\n" +
      "I ordered the signature dish and will be honest about the portion; the quiet setting is great for conversation.\n\n" +
      "It's better suited to people who want to take their time; if you're in a hurry, check the set menus first.",
  },
  {
    title: "Break Down Reviews to Guide Decisions",
    theme: "Review-style customer acquisition explainer: overall rating, environment and service, recommended items with reasons, value for money, and who it suits. Do not guess prices that are not provided.",
    script:
      "Overall impression: clean, easy to navigate, and suitable for first-time visitors.\n\n" +
      "The open setting is pleasant, and the staff proactively explain how to choose.\n\n" +
      "I recommend their signature offering because I tried it on-site and the steps were easy to understand.\n\n" +
      "The per-person cost is based on the prices posted in the store. It's more suitable for bringing friends than going alone.",
  },
  {
    title: "Soft Recommendation to Friends",
    theme: "Social-circle customer acquisition short: one genuine impression, one specific detail, and one light recommendation. Keep it restrained and not like an ad.",
    script:
      "I stopped by today and sat for a while; it was quieter than I expected.\n\n" +
      "The table by the window gets natural light, making it a good spot to take a break.\n\n" +
      "If you're nearby, you can go take a look for yourself.",
  },
  {
    title: "How Black Holes Form",
    theme: "How do black holes form? Explain stellar collapse, the event horizon, and spacetime curvature in simple terms for middle school students.",
    script:
      "One of the most mysterious objects in the night sky is the black hole.\n\n" +
      "When a massive star exhausts its fuel, its core collapses violently under gravity. The density becomes so extreme that even light cannot escape, and an event horizon is born.\n\n" +
      "It isn't a cosmic vacuum cleaner, but a region where spacetime is severely warped. Near it, the passage of time also becomes strange.\n\n" +
      "Remember: when the mass is great enough and the collapse is violent enough, a black hole can form. The next time you watch Short Video news, you'll be able to tell legend from science.",
  },
  {
    title: "Why Is the Sky Blue?",
    theme: "Why is the sky blue? Use Rayleigh scattering to explain sunlight, air molecules, and fiery sunset clouds. Suitable for Short Video beginners.",
    script:
      "Look up, and you'll often see a blue sky during the day. Is that just coincidence?\n\n" +
      "Sunlight looks white, but it actually contains many colors. Air molecules scatter blue light more strongly, sending it in all directions, which makes the sky appear blue to us.\n\n" +
      "In the morning and evening, the Sun is lower and its light passes through more atmosphere. Blue light is scattered away more thoroughly, leaving red and orange light to color the horizon.\n\n" +
      "So the sky's color is a collaboration between light and air.",
  },
  {
    title: "How AI Is Changing Our Lives",
    theme: "How AI is changing our lives: from recommendations and voice assistants to medical imaging, explain the convenience and the biases to watch out for.",
    script:
      "Open your phone and you'll find video recommendations, navigation routes, and voice assistants—artificial intelligence has quietly become part of daily life.\n\n" +
      "It excels at finding patterns in vast amounts of data: helping doctors spot clues in medical images, helping factories predict failures, and turning searches into conversations.\n\n" +
      "But AI isn't magic. Data can be biased, models can make mistakes, and privacy needs boundaries. AI is most useful when treated as a tool, not an authority.\n\n" +
      "Once you understand what it can and cannot do, you can use it more intelligently.",
  },
  {
    title: "A Day on Mars",
    theme: "What is a day on Mars like? Compare Earth's day length, temperature, dust storms, and imagined human bases in a scene-based Short Video.",
    script:
      "Imagine waking up on Mars: the Sun is farther away and smaller, the sky is a creamy color, and a day lasts about 24 hours 39 minutes.\n\n" +
      "Daytime may be \"warm\" at below-freezing temperatures, while nights are even colder. The thin carbon-dioxide atmosphere cannot retain heat, and dust storms occasionally blot out the sky.\n\n" +
      "Scientists are still planning bases: they must protect against radiation, produce oxygen, and grow food. Mars is not a second Earth, but it is the nearest classroom for outer space.\n\n" +
      "Understanding a day on Mars is preparation for humanity's next long journey.",
  },
  {
    title: "The Power of Dreams",
    theme: "The power of dreams: sleep cycles, rapid eye movement, and memory processing, using a story to explain how dreaming helps the brain review experiences.",
    script:
      "After you fall asleep, your brain hasn't clocked out.\n\n" +
      "During REM sleep, the brain seems to replay fragments of the day and splice them into fantastical dreams. Scientists believe this helps organize memories and regulate emotions.\n\n" +
      "Too little sleep compromises attention and creativity; regular sleep is like overnight maintenance for the brain.\n\n" +
      "The next time you have a strange dream, don't dismiss it as nonsense—it may be your brain working overtime to learn.",
  },
  {
    title: "A Stray Cat's Spring",
    theme: "A stray cat's spring: use an anthropomorphic narrator to explore urban ecology, responsible feeding boundaries, and coexistence between people and pets in a warm Short Video narrative.",
    script:
      "Spring has arrived. The orange tabby at the alley entrance has started shedding and is also looking for safer corners.\n\n" +
      "Stray animals in cities rely on their remaining instincts and people's unintentional kindness. Responsible feeding, spaying and neutering, and respecting their space matter more than impulse.\n\n" +
      "They are neither scenery nor a nuisance, but part of the urban ecosystem.\n\n" +
      "This spring, may every cat find a safer tomorrow.",
  },
  {
    title: "The Secret of Photosynthesis",
    theme: "The secret of photosynthesis: how leaves turn sunlight into sugar, explaining chloroplasts, energy conversion, and the source of Earth's oxygen.",
    script:
      "Green leaves are not just decoration; they are Earth's quietest chemical factories.\n\n" +
      "Chloroplasts capture sunlight, turning water and carbon dioxide into sugar while releasing oxygen. Without this process, most food chains would collapse.\n\n" +
      "The oxygen you breathe and the rice and vegetables on your table all indirectly come from this magic of light.\n\n" +
      "Understanding photosynthesis means understanding the fundamental ledger of how life operates.",
  },
  {
    title: "What to Do When an Earthquake Strikes",
    theme: "What to do when an earthquake strikes: use scenario-based instruction to explain earthquake preparedness, safe positions, and rumor identification in a practical safety Short Video.",
    script:
      "When the ground suddenly starts shaking, panic is often the first reaction.\n\n" +
      "The right thing to do is to drop, cover, and hold on nearby; stay away from windows and overhead objects, and do not rush into elevators. Preparing an emergency kit in advance is far more useful than scrambling at the last minute.\n\n" +
      "After an earthquake, remain alert for aftershocks and rumors. Authoritative information and orderly mutual aid are what provide real security.\n\n" +
      "Knowing a little about earthquakes can help you stay more composed when it matters most.",
  },
  {
    title: "How Caffeine Keeps You Alert",
    theme: "How caffeine keeps you alert: adenosine receptors, tolerance, and the cost to sleep, helping office workers drink coffee scientifically.",
    script:
      "When you're tired, does a cup of coffee really \"wake up your brain\"?\n\n" +
      "Caffeine takes the place of adenosine, temporarily making you feel less tired. But it cannot replace sleep, and drinking too much in the afternoon can make you toss and turn at night.\n\n" +
      "As you develop tolerance, the same cup becomes less effective. A smarter approach is to use it only when you need to focus and leave enough time for sleep.\n\n" +
      "Coffee can help you stay alert, but only sleep can help you recover.",
  },
  {
    title: "Where Does Plastic Go?",
    theme: "Where does plastic go? Turn microplastics, ocean currents, and alternative materials into an environmental Short Video.",
    script:
      "Do discarded plastic bags really disappear?\n\n" +
      "Most are simply torn into smaller fragments. Microplastics enter rivers and oceans, then move through the food chain and may eventually return to our dinner tables.\n\n" +
      "Reducing single-use plastics, sorting waste properly, and promoting better materials are far cheaper than cleaning up afterward.\n\n" +
      "Asking \"Where does plastic go?\" is really asking what we are willing to leave for the future.",
  },
  {
    title: "Why Vaccines Work",
    theme: "Why vaccines work: use a rehearsal metaphor to explain antigens, antibodies, and herd immunity while clarifying common misconceptions.",
    script:
      "Vaccines are not medicine; they are more like a preview sent to the immune system.\n\n" +
      "They allow the body to recognize key features of a pathogen in advance, so it can mobilize antibodies more quickly when it encounters the pathogen for real. This is not rewriting genes; it is training memory.\n\n" +
      "When enough people are protected, chains of transmission are weakened. That is the meaning of herd immunity.\n\n" +
      "Getting vaccinated based on science means placing yourself and the people around you in a safer network.",
  },
  {
    title: "The Rise and Fall of the Tides",
    theme: "Why do tides rise and fall? Explain the Moon's gravity, centrifugal effects, and spring and neap tides in a seaside setting.",
    script:
      "People who live by the sea know best: water levels rise and fall on schedule.\n\n" +
      "The main driver is the Moon's gravity, with the Sun also contributing. When Earth, the Moon, and the Sun align, the tidal range is greater—this is a spring tide.\n\n" +
      "Tides also affect navigation, power generation, and even biological rhythms. Look up at the Moon, and the sea beneath your feet is responding too.\n\n" +
      "Between rising and falling tides lie visible traces of the gravitational forces of the universe.",
  },
]

const PAGE_SIZE = 6

function isDefaultTitle(value: string) {
  const t = value.trim()
  return !t || t === "Untitled project"
}

function deriveTitle(text: string) {
  const line = text
    .trim()
    .split(/\n/)[0]
    .replace(/["""'']/g, '')
    .replace(/[。！？!?：:].*$/, '')
    .trim()
  if (!line) return "Untitled project"
  return line.length <= 120 ? line : line.slice(0, 120).replace(/\s+\S*$/, '')
}

export default function CreateProjectPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState(params.get('template') || '')
  const [category, setCategory] = useState("All")
  const [q, setQ] = useState('')
  const [inputTab, setInputTab] = useState("One-Sentence Topic")
  const [sourceText, setSourceText] = useState(INSPIRATION_POOL[0].theme)
  const [title, setTitle] = useState(INSPIRATION_POOL[0].title)
  const [titleTouched, setTitleTouched] = useState(false)
  const [inspPage, setInspPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      nav('/auth')
      return
    }
    api.me().catch(() => nav('/auth'))
    api.templates().then((list) => {
      setTemplates(list)
      const fromUrl = params.get('template') || ''
      setTemplateId((prev) => prev || fromUrl || list[0]?.id || '')
    })
  }, [nav, params])

  const categories = useMemo(() => {
    const found = new Set<string>()
    for (const t of templates) {
      for (const c of t.category || []) {
        if (CATEGORY_ORDER.includes(c)) found.add(c)
      }
    }
    return ["All", "Recommended", ...CATEGORY_ORDER.filter((c) => found.has(c))]
  }, [templates])

  const filtered = useMemo(() => {
    let list = templates
    if (category === "Recommended") list = [...templates].sort((a, b) => a.sort_order - b.sort_order).slice(0, 8)
    else if (category !== "All") list = list.filter((t) => (t.category || []).includes(category))
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(s))
    }
    return list
  }, [templates, category, q])

  const selected = templates.find((t) => t.id === templateId)
  const sourceType = inputTab === "Paste full script" ? 'script' : 'theme'
  const inspTotal = Math.ceil(INSPIRATION_POOL.length / PAGE_SIZE)
  const inspirations = INSPIRATION_POOL.slice(inspPage * PAGE_SIZE, inspPage * PAGE_SIZE + PAGE_SIZE)

  // 把灵感示例填进主题/文案，并同步短标题
  function applyInspiration(item: Inspiration) {
    if (sourceType === 'script') {
      setInputTab("Paste full script")
      setSourceText(item.script.slice(0, 8000))
    } else {
      setInputTab("One-Sentence Topic")
      setSourceText(item.theme.slice(0, 100))
    }
    setTitle(deriveTitle(item.title))
    setTitleTouched(false)
    setError('')
  }

  function shuffleInspirations() {
    setInspPage((p) => (p + 1) % inspTotal)
  }

  async function aiExpand() {
    const seed = sourceText.trim() || title.trim() || "How Artificial Intelligence Is Changing Life"
    setAiBusy(true)
    setError('')
    try {
      const mode = sourceType === 'script' ? 'script' : 'theme'
      const result = await api.expandContent(seed, mode)
      setSourceText(result.content.slice(0, mode === 'theme' ? 100 : 8000))
      if (!titleTouched || isDefaultTitle(title)) {
        setTitle(deriveTitle(result.title))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed")
    } finally {
      setAiBusy(false)
    }
  }

  async function next() {
    if (!templateId || !sourceText.trim()) {
      setError("Please select a template and enter the topic content")
      return
    }
    setBusy(true)
    setError('')
    try {
      const tpl = templates.find((t) => t.id === templateId)
      const d = tpl ? defaultsFromTemplate(tpl) : undefined
      const modeParam = params.get('mode')
      const pipeline_mode: 'full' | 'image_text' =
        modeParam === 'image_text' || modeParam === 'full' ? modeParam : 'full'
      const finalTitle =
        title.trim() || deriveTitle(sourceText) || "Untitled project"
      const project = await api.createProject({
        template_id: templateId,
        title: finalTitle,
        source_type: sourceType,
        source_text: sourceText.trim(),
        resolution_mode: 'preview',
        pipeline_mode,
        output_ratio: d?.output_ratio || '16:9',
        voice_id: d?.voice_id,
      })
      nav(`/studio/${project.id}/style`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell active="studio" wide>
      <header className="pf-page-head">
        <div className="pf-page-head-row">
          <div>
            <button type="button" className="pf-back" onClick={() => nav('/')}>
              <IconChevronLeft size={18} />
              {"New Project / Start Creating"}</button>
            <h1 className="pf-page-title">{"Create Project"}</h1>
          </div>
          <Stepper steps={kepuSteps()} current={kepuStepIndex('create')} doneThrough={-1} />
        </div>
      </header>

      <div className="pf-create">
        <aside className="pf-create-col">
          <h3>{"Select a Template"}</h3>
          <div className="pf-search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={"Search templates…"} />
          </div>
          <PillTabs
            items={categories.slice(0, 6).map(key => HOME_CATEGORY_LABELS[key] || key)}
            value={HOME_CATEGORY_LABELS[category] || category}
            onChange={label => setCategory(categories.find(key => (HOME_CATEGORY_LABELS[key] || key) === label) || label)}
            ariaLabel="Template Categories"
          />
          <div className="pf-tpl-list" style={{ marginTop: '0.75rem' }}>
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className={templateId === t.id ? 'pf-tpl-mini selected' : 'pf-tpl-mini'}
                onClick={() => setTemplateId(t.id)}
              >
                <img src={api.assetUrl(t.preview_cover)} alt="" />
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.default_ratio} · {HOME_CATEGORY_LABELS[t.category?.[0]] || t.category?.[0] || "General"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="pf-create-col">
          <h3>{"Enter Content"}</h3>
          <div className="pf-input-tabs">
            {["One-Sentence Topic", "Paste full script"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={['pf-pill', inputTab === tab ? 'lime active' : ''].join(' ')}
                onClick={() => setInputTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <label className="pf-field">
            <span className="pf-field-label">{"Project Name"}</span>
            <input
              className="pf-field-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleTouched(true)
              }}
              onBlur={() => {
                if (isDefaultTitle(title) && sourceText.trim()) {
                  setTitle(deriveTitle(sourceText))
                  setTitleTouched(false)
                }
              }}
              placeholder={"Auto-filled based on the content"}
            />
          </label>

          <div className="pf-textarea-wrap">
            <div className="pf-textarea-toolbar">
              <button
                type="button"
                className="pf-btn pf-btn-ai pf-btn-sm pf-btn-icon"
                disabled={aiBusy || busy}
                onClick={aiExpand}
              >
                <IconSparkles size={14} />
                {aiBusy ? "Generating…" : sourceType === 'script' ? "AI Expand Script" : "AI Generate Topic"}
              </button>
              <span className="pf-muted" style={{ fontSize: '0.75rem' }}>
                {sourceType === 'script' ? "Expand one sentence into a complete voiceover" : "Complete the audience and key points"}
              </span>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => {
                const next = e.target.value.slice(0, sourceType === 'theme' ? 100 : 8000)
                setSourceText(next)
                if (!titleTouched || isDefaultTitle(title)) {
                  setTitle(deriveTitle(next))
                }
              }}
              placeholder={
                sourceType === 'theme'
                  ? "Example: How do black holes form? Explain gravity and spacetime in simple terms"
                  : "Paste or have AI generate a complete voiceover script…"
              }
            />
            {sourceType === 'theme' ? (
              <span className="pf-char-count">{sourceText.length}/100</span>
            ) : (
              <span className="pf-char-count">{sourceText.length} {"characters"}</span>
            )}
          </div>

          <div className="pf-inspire">
            <div className="pf-inspire-head">
              <strong>{"Inspiration Examples"}</strong>
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm pf-btn-icon" onClick={shuffleInspirations}>
                <IconRefresh size={14} />
                {"Show More"}</button>
            </div>
            <div className="pf-chips">
              {inspirations.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="pf-chip"
                  title={sourceType === 'script' ? item.script.slice(0, 80) : item.theme}
                  onClick={() => applyInspiration(item)}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <p className="pf-muted" style={{ fontSize: '0.78rem', margin: '0.55rem 0 0' }}>
              Click an example to fill in the {sourceType === 'script' ? 'script' : 'topic'} and set the project name.
            </p>
          </div>

          <div className="pf-hint" style={{ marginTop: '1rem' }}>
            {"The more specific the topic, the more accurately AI can generate Short Video storyboards and voiceovers. Specify the target audience and key points if possible."}</div>
          {error ? <BillingErrorNotice message={error} /> : null}
        </section>

        <aside className="pf-create-col">
          <h3>{"Creation Summary"}</h3>
          {selected ? (
            <div style={{ marginBottom: '0.85rem' }}>
              <img
                src={api.assetUrl(selected.preview_cover)}
                alt=""
                style={{ width: '100%', borderRadius: 12, aspectRatio: '16/9', objectFit: 'cover' }}
              />
              <strong style={{ display: 'block', marginTop: '0.5rem' }}>{selected.name}</strong>
              <p className="pf-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                {selected.description}
              </p>
            </div>
          ) : (
            <p className="pf-muted">{"Please select a template"}</p>
          )}
          <div className="pf-summary-row">
            <span>{"Project Name"}</span>
            <span>{title.trim() || "Untitled project"}</span>
          </div>
          <div className="pf-summary-row">
            <span>{"Output Mode"}</span>
            <span>{selected?.default_ratio === '9:16' ? "Video · 9:16" : "Video · 16:9"}</span>
          </div>
          <div className="pf-summary-row">
            <span>{"Estimated Duration"}</span>
            <span>{"~1–3 minutes"}</span>
          </div>
          <div className="pf-summary-row">
            <span>{"Language"}</span>
            <span>{"Same as your idea or requested language"}</span>
          </div>
          <div className="pf-summary-row">
            <span>{"Input Method"}</span>
            <span>{inputTab}</span>
          </div>
          <button
            type="button"
            className="pf-btn pf-btn-lime pf-btn-block pf-btn-lg pf-btn-icon"
            style={{ marginTop: '1.25rem' }}
            disabled={busy || aiBusy || !templateId || !sourceText.trim()}
            onClick={next}
          >
            {busy ? "Creating…" : "Next: Style Configuration"}
            {!busy ? <span aria-hidden>→</span> : null}
          </button>
          <button
            type="button"
            className="pf-btn pf-btn-ghost pf-btn-block pf-btn-sm pf-btn-icon"
            style={{ marginTop: '0.55rem' }}
            disabled={aiBusy || busy}
            onClick={aiExpand}
          >
            <IconSparkles size={14} />
            {aiBusy ? "AI Generating…" : "Not complete? Let AI write it for you"}
          </button>
          <p className="pf-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
            {"The visual style comes with the template. Next, confirm the voiceover and production method."}</p>
        </aside>
      </div>
    </AppShell>
  )
}
