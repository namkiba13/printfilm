/** 漫剧资产生成状态（与 params.generation.status 一致） */
export const DRAMA_GENERATION_STATUSES = [
  "queued",
  "running",
  "generating",
  "done",
  "failed",
  "cancelled",
] as const;

/** 漫剧生成状态中文标签（idle 仅用于分镜等无 params.generation 时的展示回退） */
export function dramaGenerationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: "Queued",
    running: "Generating",
    generating: "Generating",
    done: "Completed",
    failed: "Failed",
    cancelled: "Canceled",
    idle: "Not Started",
  };
  return map[status] ?? status;
}

/** 列表/详情展示：空值显示 — */
export function formatDramaGenerationStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return dramaGenerationStatusLabel(status);
}

/** 漫剧资产类型中文标签 */
export function dramaAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    character: "Character",
    scene: "Scene",
    prop: "Prop",
    material: "Material",
    narration: "Narration",
    video: "Video",
    audio: "Audio",
    text: "Text",
    none: "Uncategorized",
  };
  return map[type] ?? type;
}
