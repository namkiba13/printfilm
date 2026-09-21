/** 帮助中心共用文案：分类、上手步骤、常见问题 */

export type HelpFaqItem = {
  q: string
  a: string
}

export type HelpCatItem = {
  id: string
  title: string
  desc: string
  href: string
}

export type HelpGuideStep = {
  n: string
  title: string
  body: string
}

export const HELP_CATS: HelpCatItem[] = [
  { id: 'start', title: "Quick Start", desc: "Workspace product selection entry", href: '/' },
  { id: 'drama', title: "AI Drama Creation", desc: "Script · Episodes · Final Video", href: '/drama' },
  { id: 'kepu', title: "AI Short Video", desc: "Storyboard pipeline and final video", href: '/history' },
  { id: 'tools', title: "Creation Tools", desc: "Text-to-Image / Image-to-Image / Video", href: '/tools' },
  { id: 'settings', title: "Profile", desc: "Projects · Records · Downloads", href: '/settings?tab=tools' },
  { id: 'billing', title: "Top Up Information", desc: "Pay-as-you-go billing; balance never expires", href: '/pricing' },
]

export const HELP_GUIDE_STEPS: HelpGuideStep[] = [
  {
    n: '01',
    title: "Choose a Creation Entry",
    body: "From the Workspace, select \"AI Drama\" or \"AI Short Video\"; individual capabilities such as text-to-image, image-to-image, and text-to-video are also available under \"Tools\" in the top bar.",
  },
  {
    n: '02',
    title: "Configure and Generate",
    body: "AI Drama: Idea → Outline → Assets → Episodes; AI Short Video: Topic → Style → Storyboard → Final Video; Tools: enter a prompt or upload media, then click Generate.",
  },
  {
    n: '03',
    title: "Review and Iterate",
    body: "AI Drama / AI Short Video lets you redraw a single shot, regenerate a video, or re-record the voiceover without remaking the entire video. Tool results can be previewed in the Workspace and generated again.",
  },
  {
    n: '04',
    title: "Save and Download",
    body: "Results are saved to cloud storage. Download AI Short Video results from the History page; view AI Drama projects in the project Workspace; view details and download Tool creations from your Profile.",
  },
]

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    q: "Where should I start the first time I use it?",
    a: "Open the Workspace and select \"AI Drama\" or \"AI Short Video.\" AI Drama is suited to episodic storytelling and character consistency; AI Short Video is designed for customer acquisition, product highlights, and storyboard pipelines. If you only need a single image or short clip, go directly to \"Tools.\"",
  },
  {
    q: "What is the difference between \"AI Video\" and \"Still Image Video\"?",
    a: "AI Video offers stronger camera movement at a higher cost; Still Image Video (image-and-text video) mainly uses visuals and voiceover, making it faster and more reliable for explainer-style customer acquisition clips. Choose according to your needs when creating a new AI Short Video project.",
  },
  {
    q: "Can I leave the page while generation is in progress?",
    a: "Yes. The task will continue running on the server. For AI Short Video, return to the History page to check progress; for AI Drama, return to the corresponding project workspace; for tool video tasks, please stay on the current page until completion if possible, or check the status later in the Personal Center.",
  },
  {
    q: "What can the Tool Center do?",
    a: "Text-to-image, image-to-image, image-to-product, text-to-video, video-to-video, and e-commerce collage are available. After logging in, go to \"Tools\" and select the desired capability, then enter a prompt or upload materials to generate.",
  },
  {
    q: "Where are tool-generated results saved?",
    a: "Each successful generation is added to your creation history, and media files are synchronized to cloud object storage (OSS). Go to Avatar → Personal Center → \"Tool Creations\" to view thumbnails, statuses, and prompts.",
  },
  {
    q: "How can I view and download tool results?",
    a: "Open \"Tool Creations\" in the Personal Center and click \"View\" to preview an image or video; click \"Download\" to save it locally from the cloud URL. After a successful generation, the right side of the generation page will also prompt you to revisit it in the Personal Center.",
  },
  {
    q: "Where can I download finished videos or materials?",
    a: "AI Short Video: Go to the \"AI Short Video\" History page in the top bar. Completed projects can be downloaded or packaged. AI Drama: Enter the corresponding project workspace to view Storyboards and finished videos. Global Assets: Use \"Assets\" in the top bar to manage characters, scenes, props, and voice styles.",
  },
  {
    q: "What is included in the Personal Center?",
    a: "It includes account information, AI Drama projects, AI Short Video history, tool creation records, access to asset management, and subscriptions and balance. Team, API, notification preferences, and other features are still under development.",
  },
  {
    q: "How do I add funds? How is my balance charged?",
    a: "Open \"Pricing\" and select a top-up tier. Alipay and WeChat Pay are supported; logged-out users will first be guided to log in. Charges are based on actual usage, the balance never expires, and there is no mandatory subscription. Usage can be viewed on the Pricing page or under \"Subscriptions & Balance\" in the Personal Center.",
  },
  {
    q: "What should I do if generation fails or the result is not as expected?",
    a: "Adjust the prompt, negative prompt, or reference image and try again; AI Drama / AI Short Video supports regenerating a single shot. If failures persist, check your network and balance, or try again later. Sensitive content may be blocked by the model's safety policies.",
  },
]

// 按关键词过滤常见问题
export function filterHelpFaq(items: HelpFaqItem[], raw: string): HelpFaqItem[] {
  const needle = raw.trim().toLowerCase()
  if (!needle) return items
  return items.filter(
    (item) => item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
  )
}
