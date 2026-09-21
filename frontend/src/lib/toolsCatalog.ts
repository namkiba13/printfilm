import { Clapperboard, Image, Images, Play, ShoppingBag, Sparkles, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Messages } from '../i18n'

export type ToolId = 't2i' | 'i2i' | 'i2p' | 't2v' | 'v2v' | 'ecom'

export type ToolField = {
  key: string
  label: string
  kind: 'textarea' | 'upload' | 'chips'
  options?: string[]
  multiple?: boolean
  accept?: string
  placeholder?: string
}

export type ToolDef = {
  id: ToolId
  title: string
  desc: string
  soon: boolean
  icon: LucideIcon
  /** 左侧控件区文案提示 */
  panelHint: string
  fields: ToolField[]
  cta: string
}

export const TOOL_DEFS: ToolDef[] = [
  {
    id: 't2i',
    title: "Text to Image",
    desc: "Generate high-quality visuals from text descriptions",
    soon: false,
    icon: Image,
    panelHint: "Describe the visuals with text, select an aspect ratio, and generate.",
    fields: [
      { key: 'prompt', label: "Prompt", kind: 'textarea', placeholder: "Describe the subject, scene, lighting, and style…" },
      { key: 'negative', label: "Negative Prompt", kind: 'textarea', placeholder: "Content you do not want, such as text or watermarks…" },
      { key: 'ratio', label: "Aspect Ratio", kind: 'chips', options: ['1:1', '16:9', '9:16'] },
    ],
    cta: "Generate",
  },
  {
    id: 'i2i',
    title: "Image to Image",
    desc: "Upload a reference image to generate consistent variations",
    soon: false,
    icon: Sparkles,
    panelHint: "Upload a reference image and describe what you want to preserve or change.",
    fields: [
      { key: 'ref', label: "Reference Image", kind: 'upload', accept: 'image/*' },
      { key: 'prompt', label: "Prompt", kind: 'textarea', placeholder: "Keep the subject, but change it to a cinematic night scene…" },
      { key: 'strength', label: "Similarity", kind: 'chips', options: ['低', '中', '高'] },
    ],
    cta: "Generate",
  },
  {
    id: 'i2p',
    title: "Product Image Generation",
    desc: "Generate white-background and lifestyle product images in one click",
    soon: false,
    icon: ShoppingBag,
    panelHint: "Upload a product image and choose a white background, lifestyle scene, or long-form detail image.",
    fields: [
      { key: 'product', label: "Product Image", kind: 'upload', accept: 'image/*' },
      { key: 'mode', label: "Output Type", kind: 'chips', options: ['白底图', '场景图', '详情长图'] },
      { key: 'prompt', label: "Additional Description (Optional)", kind: 'textarea', placeholder: "Materials, placement, usage scenario…" },
    ],
    cta: "Generate Product Image",
  },
  {
    id: 't2v',
    title: "Text to Video",
    desc: "Generate short video clips from scripts",
    soon: false,
    icon: Play,
    panelHint: "Enter a script to generate a still frame first, then a short video (about 1–3 minutes).",
    fields: [
      { key: 'script', label: "Video Script", kind: 'textarea', placeholder: "Describe camera movement, subject actions, and atmosphere…" },
      { key: 'duration', label: "Duration", kind: 'chips', options: ['5s', '10s', '15s'] },
      { key: 'ratio', label: "Aspect Ratio", kind: 'chips', options: ['16:9', '9:16'] },
    ],
    cta: "Generate video",
  },
  {
    id: 'v2v',
    title: "Video to Video",
    desc: "Transform the style and motion of an existing video",
    soon: false,
    icon: Clapperboard,
    panelHint: "Upload a source video or first-frame image, then describe the style and motion intensity.",
    fields: [
      {
        key: 'source',
        label: "Source Video / First Frame",
        kind: 'upload',
        accept: 'video/mp4,video/quicktime,video/webm,image/*',
      },
      { key: 'prompt', label: "Transformation Description", kind: 'textarea', placeholder: "Transform into a cyberpunk night scene, with the camera slowly pushing in…" },
      { key: 'motion', label: "Motion Intensity", kind: 'chips', options: ['弱', '中', '强'] },
    ],
    cta: "Start Transforming",
  },
  {
    id: 'ecom',
    title: "E-commerce Tools",
    desc: "A collection of handy tools for main image collages, detail layouts, and more",
    soon: false,
    icon: Images,
    panelHint: "Upload at least 2 images for collages; upload 1 product image to generate a selling-point poster.",
    fields: [
      { key: 'pack', label: "Toolbox", kind: 'chips', options: ['主图拼接', '详情排版', '卖点海报'] },
      { key: 'images', label: "Image", kind: 'upload', multiple: true, accept: 'image/*' },
      { key: 'prompt', label: "Selling-Point Description (Optional for Poster)", kind: 'textarea', placeholder: "Highlight the material and use scenarios…" },
    ],
    cta: "Start Creating",
  },
]

// 按 id 查找工具定义
export function getToolDef(id: string | undefined): ToolDef | undefined {
  return TOOL_DEFS.find((t) => t.id === id)
}

export const PRODUCT_ICONS = { drama: Clapperboard, kepu: Video }

// 芯片字段的默认选中项（取 options 第一项；值为中文枚举，给后端）
export function defaultToolChips(tool: ToolDef): Record<string, string> {
  const chips: Record<string, string> = {}
  for (const field of tool.fields) {
    if (field.kind === 'chips' && field.options?.[0]) chips[field.key] = field.options[0]
  }
  return chips
}

// 用当前语言覆盖工具标题、说明与字段文案（options 值保持中文给 API）
export function localizeToolDef(tool: ToolDef, m: Messages): ToolDef {
  const pack = m.tools.items[tool.id]
  return {
    ...tool,
    title: pack.title,
    desc: pack.desc,
    panelHint: pack.panelHint,
    cta: pack.cta,
    fields: tool.fields.map((field) => {
      const f = pack.fields[field.key as keyof typeof pack.fields] as
        | { label?: string; placeholder?: string }
        | undefined
      return {
        ...field,
        label: f?.label || field.label,
        placeholder: f?.placeholder || field.placeholder,
      }
    }),
  }
}

export function localizeToolDefs(m: Messages): ToolDef[] {
  return TOOL_DEFS.map((tool) => localizeToolDef(tool, m))
}

// 芯片展示文案；未知值原样返回
export function chipDisplayLabel(value: string, m: Messages): string {
  const chips = m.tools.chips as Record<string, string>
  return chips[value] || value
}
