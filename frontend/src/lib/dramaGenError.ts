/** 漫剧生成队列：把上游/平台原始错误翻成可读中文，并附处理建议 */

import { dialog } from './dialog'
import { isBillingError } from './billingError'

export type DramaGenErrorView = {
  /** 短标题 */
  title: string
  /** 用户可读说明 */
  message: string
  /** 建议操作 */
  suggestion?: string
  /** 是否余额不足（展示充值跳转） */
  billingBlocked?: boolean
  /** 是否上游模型账户欠费（提醒管理员，非用户钱包） */
  upstreamAccountBlocked?: boolean
}

/** 是否为上游 Seedream 账户欠费 */
export function isUpstreamAccountError(message: string): boolean {
  return /AccountOverdueError|上游 Seedream 账户欠费|上游.*账户欠费/i.test(message)
}

// 从 Seedance JSON 文案里取出 content[n]
function extractContentIndex(raw: string): number | null {
  const m = raw.match(/content\[(\d+)\]/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** 判断文案是否像「具体根因」（优先于「重试上限」等包装句） */
function looksLikeRootCause(text: string): boolean {
  return /PrivacyInformation|InputImageSensitive|SensitiveContentDetected|参考图疑似|参考音频过短|may contain real person|Seedance create error|上一镜失败|无法衔接|分镜已变更|分镜上下文|InputTextSensitive|resource download failed|audio_url|audio duration|Credits insufficient|File type not supported|参考图格式不支持/i.test(
    text,
  )
}

// 从错误里尽量抽出已标注的槽位名（后端 content_labels）
function extractNamedSlot(text: string): string | null {
  const named = text.match(/(角色|场景|道具|旁白|参考图|音色)「([^」]+)」/)
  if (named) return `${named[1]}「${named[2]}」`
  return null
}

/**
 * 从多条候选错误里挑出最具体的根因（例如隐私图审核），
 * 避免只展示「重试超过上限」这类包装文案。
 */
export function pickRootDramaGenError(
  candidates: Array<string | null | undefined>,
): string {
  const cleaned = candidates.map((c) => String(c || '').trim()).filter(Boolean)
  const root = cleaned.find(looksLikeRootCause)
  if (root) return root
  return cleaned[0] || ''
}

/**
 * 将任务 error / error_message 转为前端展示文案。
 * 已是中文短句时尽量保留，仅补建议。
 */
export function formatDramaGenError(raw: string | null | undefined): DramaGenErrorView {
  const text = String(raw || '').trim()
  if (!text) {
    return {
      title: "Generation Failed",
      message: "The task could not be completed, and no specific error information was recorded.",
      suggestion: "Please try again later. If it repeatedly fails, check whether your network/proxy can access TokenFree and verify the model channel key in the admin backend.",
    }
  }

  if (/ReadTimeout|WriteTimeout|等待上游超时|响应超时/i.test(text)) {
    return {
      title: "Upstream Response Timed Out",
      message: text.length > 200 ? `${text.slice(0, 200)}…` : text,
      suggestion:
        "TokenFree was reached, but image/video generation exceeded the time limit. Please try again later. If text generation works but images/videos time out, the upstream queue is likely slow rather than the proxy being disconnected.",
    }
  }

  if (/网络错误|ConnectError|ConnectTimeout|无法连接上游|tokenfree\.com|api\.kie\.ai/i.test(text)) {
    return {
      title: "Unable to Connect to Image/Video Service",
      message: text.length > 200 ? `${text.slice(0, 200)}…` : text,
      suggestion:
        "This device currently cannot connect to the upstream service (commonly caused by a proxy not allowing access or a network interruption). Check your network/proxy and try again, and verify that the TokenFree channel key in the admin backend is valid.",
    }
  }

  if (/^生图失败$/.test(text)) {
    return {
      title: "Image Generation Failed",
      message: "Image generation failed, but the legacy task did not save the specific reason (usually an upstream connection failure with no error message).",
      suggestion:
        "Please generate it again; the new version will record a specific error. If it still fails, check the TokenFree network connection and key.",
    }
  }

  if (isUpstreamAccountError(text) || (/Seedream error 403/i.test(text) && /AccountOverdue/i.test(text))) {
    return {
      title: "Upstream Platform Account Balance Insufficient",
      message:
        "The upstream Seedream model account has insufficient balance, so the image generation request was rejected. This concerns the site's upstream model account, not your personal wallet balance.",
      suggestion: "Contact the site administrator to top up the TokenFree console account; retry image generation after the top-up is complete.",
      upstreamAccountBlocked: true,
    }
  }

  if (isBillingError(text)) {
    return {
      title: "Insufficient Balance",
      message: /余额不足|请先充值/.test(text) ? text : "Your current balance is insufficient to continue generating.",
      suggestion: "Please top up before retrying this task.",
      billingBlocked: true,
    }
  }

  if (
    /参考图疑似真人|PrivacyInformation|InputImageSensitive|SensitiveContentDetected|may contain real person/i.test(
      text,
    )
  ) {
    const idx = extractContentIndex(text)
    const named = text.match(/(角色|场景|道具|参考图)「([^」]+)」/)
    if (named) {
      return {
        title: "Reference Image May Contain a Real Person",
        message: `Video service moderation failed: the reference image for ${named[1]} "${named[2]}" may contain a real person's likeness, so generation was rejected.`,
        suggestion: `Open "${named[2]}" in the assets panel on the left, then regenerate or upload an anime-style/illustrated appearance before generating this Storyboard.`,
      }
    }
    const where =
      idx != null
        ? `(Submission item ${idx + 1} / content[${idx}], usually a character or scene reference image)`
        : "(A reference image)"
    return {
      title: "Reference Image May Contain a Real Person",
      message: `Video service review failed: Input image ${where} may contain a real person's likeness, so generation was rejected.`,
      suggestion:
        "Open the assets panel on the left and use AI to regenerate an anime-style or illustrated image for the relevant character/scene (avoid real-person photos), or upload a compliant image before regenerating this shot.",
    }
  }

  if (/重试超过上限|超过重试上限|内部自动重试超过上限/.test(text)) {
    return {
      title: "Still failing after multiple attempts",
      message: text,
      suggestion:
        "Automatic retries for this task have been exhausted; this does not prevent you from clicking Generate again. Based on the actual cause (commonly real-person review of a reference image), modify the assets or script, then click Generate again.",
    }
  }

  if (/上一镜失败|无法衔接尾帧/.test(text)) {
    return {
      title: "Unable to connect to the previous shot",
      message: "This shot depends on the previous shot's end frame, but the previous shot was unsuccessful, so generation of this shot did not start.",
      suggestion: "Fix and regenerate the failed previous shot first, then generate subsequent clips in shot order.",
    }
  }

  if (/分镜已变更|分镜上下文丢失|分镜不存在/.test(text)) {
    return {
      title: "Shot updated",
      message: "The shot was saved or recut during generation, so the old task is no longer valid.",
      suggestion: "Return to the episode page and click Generate again using the current shot list; do not retry the old task.",
    }
  }

  if (/InputTextSensitive|text.*sensitive|敏感/i.test(text) && /Seedance|create error/i.test(text)) {
    return {
      title: "Script failed review",
      message: "The shot script or prompt triggered a content safety review.",
      suggestion: "Revise sensitive wording in the shot and try again.",
    }
  }

  if (/resource download failed|audio_url/i.test(text) && !/audio duration/i.test(text)) {
    return {
      title: "Unable to download reference audio",
      message: "The voice reference file URL is invalid or temporarily inaccessible.",
      suggestion: "Check the preview audio bound to the character, then regenerate or change the voice and try again.",
    }
  }

  // Seedance r2v：reference_audio 须 ≥ 1.8 秒（不是参考图）
  if (/audio duration|参考音频过短|1\.8/i.test(text) && /audio|音色|reference_audio|content\[/i.test(text)) {
    const idx = extractContentIndex(text)
    const named = extractNamedSlot(text)
    const where =
      named ||
      (idx != null ? `Submission item ${idx + 1} / content[${idx}] (reference audio, not an image)` : "A character/narration voice")
    return {
      title: "Reference audio too short",
      message: `The video service requires reference audio to be ≥ 1.8 seconds; the current audio is too short: ${where}.`,
      suggestion:
        "Open the corresponding character or narration asset on the left, then regenerate/upload a longer preview audio clip (recommended: ≥ 2 seconds) before generating this shot. This is not a reference image issue.",
    }
  }

  if (/only support adaptive aspect ratio|adaptive aspect ratio/i.test(text)) {
    return {
      title: "Incompatible aspect ratio parameters",
      message: "For image-to-video generation on the current video channel, a fixed aspect ratio may be rejected when using a single start frame.",
      suggestion: "Regenerate this shot; the server will adapt the aspect ratio to the reference image.",
    }
  }

  if (/Credits insufficient|积分不足|余额不足.*[Kk]ie|Kie.*积分/i.test(text)) {
    return {
      title: "Insufficient video channel Credits",
      message: "The upstream account has insufficient Credits and cannot create a video generation task (this is not a reference image or audio duration issue).",
      suggestion: "Contact an administrator to top up the TokenFree console, then try again; after topping up, regenerate this shot.",
      upstreamAccountBlocked: true,
    }
  }

  if (/File type not supported|参考图格式不支持|不支持 SVG/i.test(text)) {
    return {
      title: "Unsupported reference image format",
      message:
        text.includes('参考图格式不支持')
          ? text
          : "The upstream service rejected the reference image: File type not supported (commonly caused by an SVG placeholder or a non-raster image).",
      suggestion:
        "Check whether the cover images for the characters/scenes/props referenced by this shot are PNG/JPG/WEBP. If an SVG placeholder is still used, regenerate the asset or upload a raster image before generating the video again.",
    }
  }

  if (/Seedance create error\s*400|Kie createTask error/i.test(text)) {
    const idx = extractContentIndex(text)
    const named = extractNamedSlot(text)
    const where =
      named ||
      (idx != null ? `(Submission item ${idx + 1} / content[${idx}])` : '')
    return {
      title: "Video service rejected the request",
      message: `The upstream service returned invalid parameters or content, so the generation task could not be created ${where}.`,
      suggestion: "Check this shot's reference image, reference audio duration (must be ≥ 1.8 seconds), and script, then try again; if the issue persists, contact support and provide the task ID.",
    }
  }

  if (/Seedance|上游生成失败/i.test(text)) {
    return {
      title: "Video generation failed",
      message: text.length > 160 ? `${text.slice(0, 160)}…` : text,
      suggestion: "Try generating this shot again later; if it continues to fail, replace the reference image or simplify the script.",
    }
  }

  if (/跳过重复任务|分镜已生成完成/.test(text)) {
    return {
      title: "Old task skipped",
      message: "The scheduler found that this shot already had a completed video, so it canceled this duplicate old task.",
      suggestion:
        "If you selected \"Regenerate,\" check whether a new task is still in progress in the queue; if not, click Regenerate again. Do not treat this old cancellation as the current failure.",
    }
  }

  if (/已取消|任务已中断/.test(text)) {
    return {
      title: text.includes('取消') ? "Canceled" : "Task interrupted",
      message: text,
      suggestion: "Re-queue the task for generation when you need the completed video.",
    }
  }

  // 已是较短中文：原样展示，补通用建议
  if (!/[{\\[\]"]/.test(text) && text.length <= 120 && /[\u4e00-\u9fff]/.test(text)) {
    return {
      title: "Generation Failed",
      message: text,
      suggestion: "After following the instructions, regenerate this shot.",
    }
  }

  return {
    title: "Generation Failed",
    message: text.length > 200 ? `${text.slice(0, 200)}…` : text,
    suggestion: "Check this shot's reference image and script, then try again.",
  }
}

/** 弹窗展示生成失败（含上游欠费 / 用户余额不足等） */
export async function alertDramaGenError(raw: unknown): Promise<void> {
  const text = raw instanceof Error ? raw.message : String(raw || '')
  const view = formatDramaGenError(text)
  const body = [view.message, view.suggestion].filter(Boolean).join('\n\n')
  await dialog.alert({
    title: view.title,
    message: body || view.title,
    tone: 'danger',
  })
}
