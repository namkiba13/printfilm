/** 官网首页宣传文案与结构数据 */

/*
 * HOME_PIPELINE 成片三步
 * HOME_DRAMA_STEPS 漫剧路径标签
 * HOME_KEPU_STEPS 科普路径标签
 * HOME_CAPABILITIES 能力说明
 * HOME_AUDIENCES 适用对象
 */

export const HOME_PIPELINE = [
  { step: '01', title: "Write down an idea", desc: "A one-sentence story, a piece of knowledge, or a complete script can all be starting points." },
  { step: '02', title: "Generate assets", desc: "Add characters, scenes, props, and voice styles to your library so subsequent shots maintain the same look and feel." },
  { step: '03', title: "Storyboard to finished video", desc: "Break episodes into shots, reference assets, generate visuals and videos, and export a ready-to-play finished video." },
] as const

export const HOME_DRAMA_STEPS = ["AI-Generated Script", "Characters & Scenes", "Episode Storyboards", "Finished Video Export"] as const

export const HOME_KEPU_STEPS = ["Choose a Visual Style", "Write Storyboard Narration", "Voiceover & Finished Video", "Batch Video Generation"] as const

export const HOME_CAPABILITIES = [
  {
    title: "19 Finished Video Styles",
    desc: "From mythic epics to realistic urban scenes and cyberpunk neon, your chosen style runs throughout the entire work.",
  },
  {
    title: "Reusable Assets",
    desc: "Generate characters, scenes, props, and voice styles once, then reference them throughout the production to avoid redrawing every shot.",
  },
  {
    title: "Editable Storyboards",
    desc: "Use @ to reference assets in the script, and insert duration and camera movement so you can see each shot clearly before generation.",
  },
  {
    title: "Two Video Production Paths",
    desc: "AI Drama uses episodic storytelling, while Short Video uses a Storyboard pipeline, with the same account and Credits.",
  },
] as const

export const HOME_AUDIENCES = [
  { title: "Short Drama Creators", desc: "Break your story into producible episodes: create assets first, then make the finished video." },
  { title: "Knowledge Creators", desc: "Turn articles into vertical explainer videos with a consistent style and controllable pacing." },
  { title: "Team Production", desc: "Keep projects, assets, and history in one place, with less back-and-forth between tools." },
] as const
