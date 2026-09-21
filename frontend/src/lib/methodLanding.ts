/** 获客短视频宣传页（/method）文案：对标交付方法论结构，不承诺效果 */

export const METHOD_START_URL = 'https://www.printfilm.com/studio/new'
export const METHOD_GEO_URL = 'https://www.geohao.com/'

export type MethodTocItem = { href: string; label: string }

export type MethodStep = {
  title: string
  body: string
  note?: string
}

export type MethodCard = {
  title: string
  body: string
}

export type MethodTableRow = {
  platform: string
  form: string
  focus: string
  owner: string
}

export type MethodLandingCopy = {
  metaTitle: string
  metaDescription: string
  kicker: string
  title: string
  ledeBefore: string
  ledeEm: string
  ledeAfter: string
  startCta: string
  geoCta: string
  brandLine: string
  skip: string
  noticeTitle: string
  noticeBody: string
  toc: MethodTocItem[]
  sopKicker: string
  sopTitle: string
  sopLeadBefore: string
  sopLeadEm: string
  sopSteps: MethodStep[]
  sopCalloutTitle: string
  sopCalloutBody: string
  geoKicker: string
  geoTitle: string
  geoLead: string
  geoCards: MethodCard[]
  geoCalloutTitle: string
  geoCalloutBody: string
  distKicker: string
  distTitle: string
  distLead: string
  distTableCaption: string
  distTableHead: [string, string, string, string]
  distRows: MethodTableRow[]
  distCalloutTitle: string
  distCalloutBody: string
  paceKicker: string
  paceTitle: string
  paceLead: string
  paceIncludeTitle: string
  paceInclude: string[]
  paceExcludeTitle: string
  paceExclude: string[]
  paceCalloutTitle: string
  paceCalloutBody: string
  qcKicker: string
  qcTitle: string
  qcLead: string
  qcCards: MethodCard[]
  boundKicker: string
  boundTitle: string
  boundLead: string
  boundItems: string[]
  closeTitle: string
  closeBody: string
  footAbout: string
  footLegal: string
  footCopy: string
  jsonLdHeadline: string
}

const zh: MethodLandingCopy = {
  metaTitle: "Customer Acquisition Short Videos · PRINTFILM (Content Production SOP · GEO Support · Multi-Platform Distribution)",
  metaDescription:
    "PRINTFILM's customer acquisition short video delivery methodology: a four-step content production SOP, how it works with GEO, multi-platform distribution, finished-video cadence, and manual quality control. This page explains the methodology and does not guarantee customer acquisition or conversion results.",
  kicker: 'Method',
  title: "Lead Generation Short Video",
  ledeBefore: "This page explains",
  ledeEm: "How we create customer acquisition short videos",
  ledeAfter:
    ": how content is produced, how it works with GEO, how it is scheduled across multiple platforms, and how finished videos are used. After reading, you should be able to determine whether this process suits your industry.",
  startCta: "Get Started",
  geoCta: "Back to GEO",
  brandLine: "Customer Acquisition Short Videos · GEO-Supported Video Production",
  skip: "Skip to Main Content",
  noticeTitle: "Please Read First",
  noticeBody:
    "The following describes our delivery methodology and capabilities. It is not a customer endorsement or a performance guarantee. This page does not display any customer names, case data, transaction amounts, or customer reviews. PRINTFILM charges based on actual upstream usage and does not guarantee customer acquisition, views, leads, or conversions. The timelines and production capacities shown on this page are reference ranges and subject to verification.",
  toc: [
    { href: '#sop', label: "Content Production SOP" },
    { href: '#geo', label: "How We Work with GEO" },
    { href: '#dist', label: "Multi-Platform Distribution" },
    { href: '#pace', label: "Finished Video Cadence" },
    { href: '#qc', label: "Manual Quality Control and Compliance" },
    { href: '#bound', label: "Capabilities and Limitations" },
  ],
  sopKicker: '01',
  sopTitle: "I. Content Production SOP",
  sopLeadBefore: "We break lead-generation short videos into four steps, each with clear inputs and outputs. The core idea is:",
  sopLeadEm: "Let AI handle the scalable parts, while people retain responsibility for decisions that must be made by humans.",
  sopSteps: [
    {
      title: "Value Proposition Collection: Start by Clearly Defining What You Sell",
      body: "Inputs include your product, pricing, service process, common objections, and industry keywords. The output is a shoot-ready list of topics: pain points, comparisons, process explanations, and pricing breakdowns. This step solves the problem of deciding “what to shoot” by guesswork—validate demand first, then move into the workspace.",
      note: "The written materials you provide are the source of truth; the model will not invent your pricing or qualifications.",
    },
    {
      title: "Structure Breakdown: Turn “Feels Like It Can Generate Leads” into Templates",
      body: "Break each piece down across five dimensions—title, opening 3-second hook, pain point, solution, and closing call to action—and organize them into reusable categories. PRINTFILM uses visual styles and spoken-word structures to carry these categories forward, allowing the same value propositions to produce videos in batches instead of starting from scratch each time.",
    },
    {
      title: "Script and Storyboard: AI Creates the First Draft, People Confirm Before Proceeding",
      body: "After a topic or voiceover enters the workspace, it moves through the Storyboard pipeline for shot breakdown, image generation, voiceover, and compositing. AI provides speed and structural consistency; you refine the tone, add industry details, and continue generating only after confirming the Storyboard—this step determines whether the video feels like you.",
    },
    {
      title: "Review and Publishing: The Human Control Gate Is Mandatory",
      body: "Before each finished video is published externally, it goes through three checks: factual accuracy (whether numbers, qualifications, and pricing match reality), compliance (platform rules and advertising-law restrictions), and brand voice (whether it sounds like you). After approval, you publish it through your own account; we do not publish on your behalf.",
    },
  ],
  sopCalloutTitle: "Why Not Let AI Publish Directly?",
  sopCalloutBody:
    "First, the platform side: mainstream platforms have clear risk-control rules for bulk publishing, automated proxy publishing, and logins from devices not owned by the account holder. The account holder ultimately bears the risks of account bans and reduced distribution caused by proxy publishing. Second, the content side: AI can confidently fabricate details, and content without human review will eventually cause problems. That is why the “human control gate” is a mandatory part of the process and is not omitted for the sake of speed.",
  geoKicker: '02',
  geoTitle: "II. How It Works with GEO",
  geoLead:
    "GEO (Generative Engine Optimization) addresses whether large models are willing to cite or mention you when users ask questions. Lead-generation short videos address whether people can discover you in product-discovery scenarios on Douyin, Xiaohongshu, and WeChat Channels. They are not substitutes for each other, but two ways of expressing the same set of brand facts.",
  geoCards: [
    {
      title: "One Set of Facts, Two Formats",
      body: "Your website, FAQ, and comparison tables provide information for generative engines to extract; short videos transform the same messaging into hooks, voiceovers, and visuals. When the messaging is inconsistent, both models and platforms will reduce their level of trust.",
    },
    {
      title: "Short Videos Expand Your Surface Area for Citation",
      body: "Generative engines do not rely solely on official websites. Public short videos and graphic-text explanations may also be included as sources. Across platforms, synchronize verifiable statements—not emotional long-form writing.",
    },
    {
      title: "GEO Diagnoses; Short Videos Produce the Content",
      body: "Brand profiles, knowledge bases, and citation monitoring are handled on the GEO side; PRINTFILM delivers “videos ready to publish.” When you need to return to diagnostics and plans, go back to GEO from this page.",
    },
    {
      title: "No Citation Guarantees",
      body: "GEO typically takes weeks to show results and is not a ranking mechanism that can be controlled linearly. Short videos also do not guarantee views or leads. Both sides charge based on the services provided, not on outcome-based bets.",
    },
  ],
  geoCalloutTitle: "GEO and Lead-Generation Short Videos (In One Sentence)",
  geoCalloutBody:
    "GEO optimizes whether you are mentioned in AI-generated answers; lead-generation short videos optimize whether people watch you through in product-discovery scenarios and ask about pricing. The former competes for citations, while the latter competes for reach. See the GEO site for diagnostic and plan details.",
  distKicker: '03',
  distTitle: "III. Multi-Platform Distribution Strategy",
  distLead:
    "The same core value proposition needs to be expressed differently on different platforms. We do not “republish one video unchanged across every platform.” Instead, we adapt the hook, cover, and duration to each platform’s characteristics, while leaving account-risk control to the account holder.",
  distTableCaption: "Distribution Adaptation Principles (General Reference; Follow Each Platform’s Latest Official Guidelines)",
  distTableHead: ["Platform", "Preferred Content Format", "Adaptation Focus", "Publishing Account"],
  distRows: [
    { platform: "Douyin", form: "Short Video / Strong Hook", focus: "First 3-second hook, pacing density, and comment-section prompts", owner: "Your own account" },
    { platform: "Xiaohongshu", form: "Graphic-Text Posts / Mid-Length Short Videos", focus: "Title keywords, information density of the cover, and structured body copy", owner: "Your own account" },
    { platform: "WeChat Channels", form: "Short Video / Live-Stream Clips", focus: "Personal-network relationships, local relevance, and shareability", owner: "Your own account" },
    { platform: "Zhihu / WeChat Official Accounts", form: "Long-Form Articles / Practical Content", focus: "Definitions upfront, FAQs, and comparison tables, while also supporting GEO citations", owner: "Your own account" },
    { platform: "Bilibili", form: "Mid- to Long-Form Video", focus: "Structured explanations, chapter breakdowns, and information density", owner: "Your own account" },
  ],
  distCalloutTitle: "Distribution Discipline",
  distCalloutBody:
    "All content is published from your own accounts. PRINTFILM only provides finished videos and structural recommendations; it does not use RPA for bulk publishing, hold account passwords on your behalf, or use any third-party tools that claim to “bypass platform risk controls.” This discipline takes priority over efficiency.",
  paceKicker: '04',
  paceTitle: "IV. Finished Video Pacing",
  paceLead:
    "The workspace is not for “reporting results.” It enables you to consistently produce videos by series and keep completed projects in your history for comparison. You decide the publishing schedule, promotion, and direct-message responses.",
  paceIncludeTitle: "Visible in the workspace",
  paceInclude: [
    "Project list (number of items, visual style, finished-video or image-and-text mode)",
    "Generation status (draft / generating / completed)",
    "Continue only after confirming the storyboard to avoid directly producing videos from unreviewed scripts",
    "Redraw, regenerate the video, or re-record the voiceover for an individual shot without redoing the entire video",
    "Download or package the completed project, then publish it from your account",
  ],
  paceExcludeTitle: "Not provided here",
  paceExclude: [
    "Predictions or guarantees regarding views, follower growth, or customer acquisition",
    "Unauthorized transfer of backend data from third-party platforms",
    "Attributing the performance of a single piece of content to one button or model",
    "Unverified comparisons presented as the “industry average”",
  ],
  paceCalloutTitle: "How This Differs from the GEO Monthly Report",
  paceCalloutBody:
    "GEO examines whether the brand is mentioned by models and whether the wording is accurate; PRINTFILM examines whether the videos were produced by series that week. When the two do not align, adjust the messaging first, not the output volume, rather than adding an even more exaggerated hook.",
  qcKicker: '05',
  qcTitle: "V. Manual Quality Control and Compliance",
  qcLead: "This determines whether content can be published consistently over the long term and is the part of the entire process least replaceable by AI.",
  qcCards: [
    {
      title: "Fact-Checking",
      body: "Every figure and statement concerning prices, qualifications, service scope, and after-sales policies must be based on the written materials you provide; content generated independently by the model is not accepted as authoritative.",
    },
    {
      title: "Advertising Law Review",
      body: "Do not use absolute or promissory claims such as “best,” “number one,” “national-level,” “guaranteed,” or “cures completely.” Highly regulated industries such as healthcare, finance, and education require an additional review under the applicable regulations.",
    },
    {
      title: "AI Labeling",
      body: "Label AI-generated or AI-assisted content as required by each platform. Follow the latest rules of each platform for labeling methods.",
    },
    {
      title: "Account Separation",
      body: "Projects and assets under each account are isolated from one another. Do not apply Client A’s spoken-content template directly to Client B, to prevent data and persona mix-ups.",
    },
  ],
  boundKicker: '06',
  boundTitle: "VI. Capability Boundaries (Be Clear About What Is Not Suitable First)",
  boundLead: "It is better to be clear in advance than to explain afterward. In the following situations, we will tell you directly that something is “not recommended” or “requires prerequisites.”",
  boundItems: [
    "Requests for guaranteed customer acquisition, views, or transaction value—we do not provide this, and it conflicts with usage-based billing.",
    "Requests to hold account passwords on your behalf or use bulk-publishing tools—we do not do this; risk-control risks are borne by the account holder.",
    "Highly regulated industries such as healthcare, finance, and education without the required compliance qualifications and review process—these must be completed first.",
    "Expectations to “see results within one week”—content and GEO are cumulative efforts, with results measured in weeks.",
    "No business information can be provided and no one is available to approve the storyboard—AI cannot generate credible industry details out of thin air.",
  ],
  closeTitle: "Start Producing from a Single Selling Point",
  closeBody: "Go to the workspace to create a new customer-acquisition short video. For brand diagnosis, a knowledge base, and model mentions, return to GEO.",
  footAbout: "PRINTFILM provides a customer-acquisition short-video workspace: topic / spoken content → storyboard → visuals → finished video. Use it together with the GEO site; it does not replace diagnosis or citation monitoring.",
  footLegal:
    "This page explains the methodology and capabilities. It is not a customer endorsement and does not constitute any promise of results. Services are billed according to content production capacity and actual upstream usage; no customer acquisition, views, leads, or transaction results are guaranteed. The site does not use absolute language or display unauthorized customer names or case data.",
  footCopy: "PRINTFILM · Customer-Acquisition Short Videos",
  jsonLdHeadline: "PRINTFILM Customer-Acquisition Short Videos: Content Production SOP, GEO Support, Multi-Platform Distribution, and Manual Quality Control",
}

const en: MethodLandingCopy = {
  metaTitle: 'Lead-gen short video · PRINTFILM (SOP · GEO companion · distribution)',
  metaDescription:
    'How PRINTFILM makes lead-gen short videos: a four-step SOP, how it pairs with GEO, multi-platform adaptation, and human review. Methodology only — no performance promises.',
  kicker: 'Method',
  title: 'Lead-gen short video',
  ledeBefore: 'This page is about ',
  ledeEm: 'how we make lead-gen shorts',
  ledeAfter:
    ': how content is produced, how it pairs with GEO, how it is adapted per platform, and how films are used. Read it to judge whether the process fits your industry.',
  startCta: 'Start',
  geoCta: 'Back to GEO',
  brandLine: 'Lead-gen shorts · GEO companion',
  skip: 'Skip to content',
  noticeTitle: 'Read this first',
  noticeBody:
    'This is a methodology and capability note, not a testimonial and not a performance promise. We do not show client names, case metrics, deal sizes, or reviews. PRINTFILM bills on actual upstream usage and does not promise leads, views, or sales. Timelines here are reference ranges.',
  toc: [
    { href: '#sop', label: 'Production SOP' },
    { href: '#geo', label: 'How it pairs with GEO' },
    { href: '#dist', label: 'Distribution' },
    { href: '#pace', label: 'Shipping cadence' },
    { href: '#qc', label: 'Human review' },
    { href: '#bound', label: 'Boundaries' },
  ],
  sopKicker: '01',
  sopTitle: '1. Production SOP',
  sopLeadBefore: 'Lead-gen video is four steps, each with a clear input and output. The idea is: ',
  sopLeadEm: 'let AI scale what can be scaled, and keep humans on what must be judged.',
  sopSteps: [
    {
      title: 'Collect the offer: write down what you sell',
      body: 'Inputs are product, price, service flow, objections, and category keywords. Output is a shootable topic list: pain points, comparisons, process explainers, price breakdowns. Demand first, studio second.',
      note: 'Numbers and credentials come from your written materials. The model does not invent your price list.',
    },
    {
      title: 'Break the pattern: turn “this could convert” into a template',
      body: 'Split samples by title, first-three-second hook, pain, offer, and call to action. PRINTFILM holds those columns with a visual style plus narration structure so you can batch, not start from zero.',
    },
    {
      title: 'Script and boards: AI drafts, you confirm before going on',
      body: 'A topic or voiceover enters the studio, then storyboard, stills, voice, and compose. AI keeps pace and structure; you rewrite tone and confirm boards before the rest of the pipeline runs.',
    },
    {
      title: 'Review and publish: the human gate is not optional',
      body: 'Before anything goes public: facts (numbers, licenses, prices), compliance (platform rules and advertising law), and brand voice. You publish from your own accounts. We do not post for you.',
    },
  ],
  sopCalloutTitle: 'Why AI does not publish',
  sopCalloutBody:
    'Platforms restrict bulk posting, auto-publish, and login from non-owner devices; bans land on the account holder. Models also invent details with confidence. The human gate stays, even when it slows you down.',
  geoKicker: '02',
  geoTitle: '2. How it pairs with GEO',
  geoLead:
    'GEO (Generative Engine Optimization) asks whether models will cite you. Lead-gen shorts ask whether people will see you on Douyin, Xiaohongshu, and video accounts. Same brand facts, two expressions — not substitutes.',
  geoCards: [
    {
      title: 'One set of facts, two carriers',
      body: 'Site copy, FAQs, and comparison tables for generative engines; shorts for hooks, voiceover, and picture. Inconsistent claims cost trust in both places.',
    },
    {
      title: 'Video widens what can be cited',
      body: 'Engines do not only read your homepage. Public shorts and captions can be included too. We sync verifiable claims, not hype essays.',
    },
    {
      title: 'GEO diagnoses, PRINTFILM ships film',
      body: 'Brand files, knowledge bases, and mention checks live on the GEO side. PRINTFILM ships playable films. Return to GEO for diagnosis and plans.',
    },
    {
      title: 'No mention guarantees',
      body: 'GEO usually takes weeks and is not a controllable ranking. Shorts do not promise views or leads. Both bill for work done, not for outcomes.',
    },
  ],
  geoCalloutTitle: 'GEO vs lead-gen video (one line)',
  geoCalloutBody:
    'GEO is “are you in the AI answer?” Lead-gen video is “can someone finish the clip and ask a price?” One fights citation, the other fights attention. See the GEO site for diagnosis and plans.',
  distKicker: '03',
  distTitle: '3. Multi-platform distribution',
  distLead:
    'The same offer should not be copy-pasted across apps. We adapt hook, cover, and length per platform, and we leave account risk with the account owner.',
  distTableCaption: 'Adaptation notes (generic; follow each platform’s current rules)',
  distTableHead: ['Platform', 'Format', 'Focus', 'Who posts'],
  distRows: [
    { platform: 'Douyin', form: 'Short / strong hook', focus: 'First 3 seconds, pace, comment CTA', owner: 'Your account' },
    { platform: 'Xiaohongshu', form: 'Carousel / mid-short', focus: 'Title keywords, cover density, structure', owner: 'Your account' },
    { platform: 'Channels', form: 'Short / live cuts', focus: 'Social graph, local, easy to forward', owner: 'Your account' },
    { platform: 'Zhihu / WeChat', form: 'Long-form', focus: 'Definition first, FAQ, tables for GEO', owner: 'Your account' },
    { platform: 'Bilibili', form: 'Mid-long', focus: 'Chapters, density, systematic explainers', owner: 'Your account' },
  ],
  distCalloutTitle: 'Distribution rules',
  distCalloutBody:
    'You post from your own accounts. PRINTFILM supplies films and structure notes. No RPA bulk posting, no holding passwords, no “bypass the risk engine” tools. This rule outranks speed.',
  paceKicker: '04',
  paceTitle: '4. Shipping cadence',
  paceLead:
    'The studio is not a scoreboard. It lets you keep shipping by column and keep finished projects in History. Cadence, ads, and DMs stay yours.',
  paceIncludeTitle: 'What you can see',
  paceInclude: [
    'Project list (count, look, full film vs stills-to-film)',
    'Status (draft / running / done)',
    'Confirm boards before the rest of the pipeline',
    'Regenerate a still, clip, or voice track without remaking the film',
    'Download or pack when done, then post from your account',
  ],
  paceExcludeTitle: 'What we do not provide',
  paceExclude: [
    'Forecasts or guarantees of views, followers, or leads',
    'Copying third-party analytics without your permission',
    'Blaming a single button or model for one clip’s result',
    'Unverified “industry average” comparisons',
  ],
  paceCalloutTitle: 'How this splits from GEO reporting',
  paceCalloutBody:
    'GEO asks whether models mention you and describe you accurately. PRINTFILM asks whether this week’s films actually shipped. When they disagree, fix the claims before you add volume.',
  qcKicker: '05',
  qcTitle: '5. Human review and compliance',
  qcLead: 'This is what lets you keep posting. It is the part AI cannot replace.',
  qcCards: [
    {
      title: 'Facts',
      body: 'Every number on price, license, scope, and after-sales comes from your written materials — not from the model.',
    },
    {
      title: 'Advertising law',
      body: 'No superlatives or cure-all promises. Medical, finance, and education need an extra review against the relevant rules.',
    },
    {
      title: 'AI labeling',
      body: 'Label AI-generated or AI-assisted work as each platform currently requires.',
    },
    {
      title: 'Account isolation',
      body: 'Projects stay in the account that made them. Do not paste Client A’s voiceover onto Client B.',
    },
  ],
  boundKicker: '06',
  boundTitle: '6. Boundaries (what we will not do)',
  boundLead: 'Better to say this up front. We will decline or require preconditions when:',
  boundItems: [
    'You want guaranteed leads, views, or revenue — we do not, and it conflicts with usage billing.',
    'You want us to hold passwords or bulk-post — we do not; platform risk sits with the account owner.',
    'You are in a tightly regulated category without licenses or a review process — fix that first.',
    'You expect results in a week — both content and GEO accumulate over weeks.',
    'You cannot provide any business facts or confirm boards — the model cannot invent credible detail.',
  ],
  closeTitle: 'Start from one offer',
  closeBody: 'Open the studio to make a lead-gen short. For brand diagnosis, knowledge base, and model mentions, go back to GEO.',
  footAbout:
    'PRINTFILM is a lead-gen short-video studio: topic / voiceover → boards → picture → film. It pairs with the GEO site; it does not replace diagnosis or citation monitoring.',
  footLegal:
    'Methodology and capability only — not a testimonial, not a performance promise. We bill for content capacity and actual upstream usage. No guarantees of leads, views, or sales. No superlatives. No unauthorized client names or case data.',
  footCopy: 'PRINTFILM · Lead-gen short video',
  jsonLdHeadline: 'PRINTFILM lead-gen short video: production SOP, GEO companion, distribution, and human review',
}

export const METHOD_LANDING: Record<'zh' | 'en', MethodLandingCopy> = { zh, en }
