/** Seedance 传值与脚本规则说明弹窗（分集编辑页，对齐 docs/EPISODE_RULES.md） */
import { useState } from 'react'
import Modal from '../ui/Modal'
import {
  DRAMA_SEGMENT_DURATION_MAX,
  DRAMA_SEGMENT_DURATION_MIN,
  DRAMA_SHOT_DURATION_HARD_MAX,
  FRAGMENT_CONTENT_DURATION_MAX,
} from '../../lib/dramaEpisodePromptEditor'
import {
  DIALOGUE_PREFIX,
  DRAMA_NARRATION_PREFIX,
  DRAMA_SUBTITLE_CUE,
  VISUAL_PREFIX,
} from '../../lib/dramaEpisodeScriptValidate'

type Tab = 'payload' | 'script' | 'usage'

type Props = {
  open: boolean
  onClose: () => void
}

// 渲染 Seedance 规则说明弹窗
export function SeedanceRulesModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('payload')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={"Seedance Parameters and Usage Rules"}
      size="lg"
      className="pf-help-modal seedance-rules-modal"
      footer={
        <button type="button" className="pf-btn pf-btn-lime pf-btn-sm" onClick={onClose}>
          {"Got it"}</button>
      }
    >
      <div className="pf-help">
        <p className="pf-help-lede">
          {"Shot videos are generated through the Seedance multimodal API. The instructions below explain how the system combines the script, assets, and top-bar parameters into a request, as well as how to write AI Drama episode scripts (see"}{' '}
          <code>docs/EPISODE_RULES.md</code>）。
        </p>

        <div className="pf-help-tabs" role="tablist" aria-label={"Seedance Rule Categories"}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'payload'}
            className={tab === 'payload' ? 'active' : undefined}
            onClick={() => setTab('payload')}
          >
            {"Parameter Rules"}</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'script'}
            className={tab === 'script' ? 'active' : undefined}
            onClick={() => setTab('script')}
          >
            {"Script Format"}</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'usage'}
            className={tab === 'usage' ? 'active' : undefined}
            onClick={() => setTab('usage')}
          >
            {"Usage Tips"}</button>
        </div>

        {tab === 'payload' ? (
          <div className="seedance-rules-section">
            <h4>{"Top-Bar Parameters → API Fields"}</h4>
            <ul className="seedance-rules-list">
              <li>
                <strong>{"Model"}</strong> → <code>model</code>（Seedance 2.5 / 1.5）
              </li>
              <li>
                <strong>{"Aspect Ratio · Resolution"}</strong>{"(episode top-bar settings) →"}<code>ratio</code>、<code>resolution</code>
              </li>
              <li>
                <strong>{"Duration"}</strong> → <code>duration</code>{" : In the script,"}{' '}
                <code>@duration</code> {" total (recommended 4–"}{FRAGMENT_CONTENT_DURATION_MAX} {" seconds); when no tag is present, the current shot's Duration field is used"}</li>
              <li>
                <strong>{"Video Style"}</strong> {"→ written to the \"Visual Style\" mandatory constraint block in the prompt"}</li>
            </ul>

            <h4>{"content Multimodal Array (submitted in order)"}</h4>
            <ol className="seedance-rules-list">
              <li>
                <strong>text</strong>{" : the automatically assembled complete prompt (see the constraint blocks and body below)"}</li>
              <li>
                <strong>reference_image</strong>{" : the cover or primary image of the character / scene / prop referenced by this shot"}</li>
              {/* 音色难控：暂不提交 reference_audio，口播由 generate_audio 自发挥
              <li>
                <strong>reference_audio</strong>：已绑定音色的角色与旁白试听音频
              </li>
              */}
            </ol>
            <p className="seedance-rules-note">
              {"Enabled by default"}<code>generate_audio</code>{" : when speech narration is intended, Seedance generates native voiceover and burns in subtitles; for visuals-only shots, only ambient audio is used and no subtitles are burned in."}</p>

            <h4>{"Automatic Prompt Assembly Order"}</h4>
            <ol className="seedance-rules-list">
              <li>{"[Mandatory Constraint: Video Visual Style] — Description of the project's selected visual style"}</li>
              <li>{"[Mandatory Constraint: Audio, Subtitles, and Music] — Inferred from script narration / dialogue / visual cues"}</li>
              {/*
              <li>【强制约束：角色音色】— 角色名 → 参考音频序号</li>
              <li>【强制约束：旁白音色】— 旁白 → 参考音频序号</li>
              */}
              <li>{"[Mandatory Constraint: Character Appearance] — Character name → reference image number"}</li>
              <li>{"[Mandatory Constraint: Scene] — Scene name → reference image number"}</li>
              <li>{"[Mandatory Constraint: Prop] — Prop name → reference image number"}</li>
              <li>
                {"Body: Replace"}<code>@asset:ID</code> {" with \"Name (Reference Image N)\"; replace"}{' '}
                <code>@duration:N</code> {" with a time range (e.g., 00:00-00:04)"}</li>
            </ol>
          </div>
        ) : null}

        {tab === 'script' ? (
          <div className="seedance-rules-section">
            <h4>{"Duration Tags"}</h4>
            <ul className="seedance-rules-list">
              <li>
                <code>@duration:N</code>{" : marks the duration of a section of content (in seconds); a single section is recommended to be"}{' '}
                {DRAMA_SEGMENT_DURATION_MIN}–{DRAMA_SEGMENT_DURATION_MAX} {"seconds"}</li>
              <li>
                {"For new storyboards, the recommended total within a shot is ≤"}{FRAGMENT_CONTENT_DURATION_MAX} {"seconds; legacy scripts allow up to"}{DRAMA_SHOT_DURATION_HARD_MAX} {"seconds"}</li>
              <li>{"Type"}<code>@</code> {" to insert a duration chip or referenced asset"}</li>
            </ul>

            <h4>{"Asset References"}</h4>
            <ul className="seedance-rules-list">
              <li>
                <code>@asset:123</code>{" : reference the character / scene / prop with ID 123 in the body"}</li>
              <li>{"Clicking an asset in the left asset panel or the current shot's \"Participating Assets\" bar also automatically inserts a reference"}</li>
              <li>{"Referenced characters must have a reference image; Seedance handles voiceover based on dialogue/narration, so no voice profile needs to be assigned"}</li>
            </ul>

            <h4>{"Common AI Drama cues (do not use the Short Video version's \"burn in narration subtitles throughout\" subtitle wording)"}</h4>
            <div className="seedance-rules-examples">
              <code>{DRAMA_SUBTITLE_CUE}</code>
              <code>{"【BGM: Low, epic, with volume below the vocals】"}</code>
              <code>@duration:4</code>
              <code>{VISUAL_PREFIX}{"Cutaway: The turbid Yellow River pounds against old stones…"}</code>
              <code>@duration:6</code>
              <code>{DIALOGUE_PREFIX}{"Yu: The flood disaster is not over—how can I retreat!"}</code>
              <code>{DRAMA_NARRATION_PREFIX}{"A thousand years later, people still remember this battle."}</code>
            </div>
            <ul className="seedance-rules-list">
              <li>
                <strong>{"Cutaway / Shot Type"}</strong>{": Write as “Cutaway: …,” “Wide Shot: …,” “Close-up: …,” or"}{' '}
                <code>{VISUAL_PREFIX}</code>；<strong>{"Prohibited"}</strong>{"label it as dialogue/narration (it will be spoken aloud and burned into the subtitles)"}</li>
              <li>
                <strong>{"Dialogue"}</strong>：<code>{"Character Name: Dialogue"}</code> {"or"}{DIALOGUE_PREFIX}
              </li>
              <li>
                <strong>{"Narration"}</strong>：{DRAMA_NARRATION_PREFIX}{"; Subtitles rotate sentence by sentence and sync with the currently spoken line; do not display the entire passage on screen"}</li>
              <li>
                <strong>{"Character Introduction"}</strong>{": Overlay the names of important characters appearing for the first time in this drama beside"}<strong>{"Beside the Character"}</strong>{"(not bottom subtitles or a centered large title)"}</li>
              <li>
                <strong>BGM</strong>{": Keep the volume below the vocals and do not overpower them"}</li>
            </ul>

            <h4>{"Shot Type / Camera Movement (@ → Utilities)"}</h4>
            <ul className="seedance-rules-list">
              <li>
                {"Type"}<code>@</code> {"→ “Utilities” → “Shot Type / Camera Movement” to insert prefixes such as “Cutaway:”, “Close-up:”, and “Push-in:” with one click"}</li>
              <li>{"Formula: Subject + Action + Scene + (Shot Type/Camera Movement) + (Lighting); recommend ≤ 2 motion axes per segment"}</li>
              <li>{"Large rotations in close-ups can distort faces; reserve orbit shots for medium shots and wider"}</li>
            </ul>
          </div>
        ) : null}

        {tab === 'usage' ? (
          <div className="seedance-rules-section">
            <h4>{"Pre-Generation Checks"}</h4>
            <ul className="seedance-rules-list">
              <li>{"Script validation: Valid duration; cutaways are not labeled as dialogue/narration (the editor provides immediate alerts, and generation is unavailable when errors exist)"}</li>
              <li>{"Characters in this shot’s “Participating Assets” have reference images (missing images trigger a warning); voiceovers do not require voice binding"}</li>
              <li>{"Confirm the aspect ratio and resolution in the project header; confirm the video style and model in the episode header before clicking “Generate”"}</li>
            </ul>

            <h4>{"Queue and Concurrency"}</h4>
            <ul className="seedance-rules-list">
              <li>{"Storyboard videos use a dedicated video queue, with up to 10 Seedance tasks running in parallel"}</li>
              <li>{"While one shot is generating, you can still edit scripts for other shots and preview completed videos"}</li>
              <li>{"“One-Click Generate” queues all shots in this episode in sequence; per-shot “Generate” submits only the current shot"}</li>
            </ul>

            <h4>{"Inter-Shot Last-Frame Continuity"}</h4>
            <ul className="seedance-rules-list">
              <li>
                {"By default, generation uses <code>return_last_frame=true</code>; after success, the last frame is written to the shot’s <code>params.lastFrameUrl</code>"}<code>return_last_frame=true</code>{"; after success, the last frame is written to the shot’s"}{' '}
                <code>params.lastFrameUrl</code>
              </li>
              <li>
                {"When “Inter-Shot Continuity” is enabled in the episode header: if this shot has a character/scene reference image or voice, the last frame is appended as"}<code>reference_image</code> {"appended at the end (Seedance prohibits combining it with"}<code>first_frame</code> {"); use only when no reference media is available"}<code>first_frame</code>
              </li>
              <li>
                {"For standard generation, do not write wording such as “edit” or “extend” in the script, to avoid task reclassification; the actual “extension path” has not yet been productized"}</li>
            </ul>

            <h4>{"Voice and Reference Audio (Temporarily Disabled)"}</h4>
            <ul className="seedance-rules-list">
              <li>{"Do not submit reference_audio or bind character/narration audition audio for now; voiceovers are generated using Seedance’s native voice acting"}</li>
              <li>{"When a reference image is missing, the system will try to generate one automatically before submitting to Seedance"}</li>
            </ul>

            <h4>{"AI Re-Storyboard"}</h4>
            <p className="seedance-rules-note">
              {"The system will re-plan each shot’s script and @duration structure based on the screenplay and assets; wait for any in-progress video generation to finish before taking further action to avoid state conflicts. Cutaways must use visual phrasing such as “Cutaway: …”; do not write them as dialogue."}</p>

          </div>
        ) : null}
      </div>
    </Modal>
  )
}
