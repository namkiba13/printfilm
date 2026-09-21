import {
  LabeledControl,
  SettingsLoading,
  SettingsPanel,
  SettingsStatusBar,
  SettingsTabShell,
} from "@/components/settings/SettingsPanel";
import { useAdminModelSettings } from "@/hooks/useAdminModelSettings";

/** 站点公网地址与媒体工具路径 */
export function SiteSettingsPanel() {
  const { form, loading, saving, patchField, save } = useAdminModelSettings();

  async function handleSave() {
    if (!form) return;
    await save(
      {
        public_base_url: form.public_base_url,
        ffmpeg_path: form.ffmpeg_path,
        ffprobe_path: form.ffprobe_path,
      },
      "Site configuration saved",
    );
  }

  if (loading || !form) {
    return <SettingsLoading />;
  }

  const hasPublic = Boolean(form.public_base_url?.trim());
  const hasFfmpeg = Boolean(form.ffmpeg_path?.trim());
  const hasFfprobe = Boolean(form.ffprobe_path?.trim());

  return (
    <SettingsTabShell onSave={() => void handleSave()} saving={saving}>
      <SettingsStatusBar
        title={"Site Tool Status"}
        items={[
          {
            id: "public",
            label: "Public URL",
            ready: hasPublic,
            readyText: "Configured",
            pendingText: "Not entered",
          },
          {
            id: "ffmpeg",
            label: "ffmpeg",
            ready: hasFfmpeg,
            readyText: form.ffmpeg_path || "Configured",
            pendingText: "Use default PATH",
          },
          {
            id: "ffprobe",
            label: "ffprobe",
            ready: hasFfprobe,
            readyText: form.ffprobe_path || "Configured",
            pendingText: "Use default PATH",
          },
        ]}
      />

      <div className="settings-routing-grid">
        <SettingsPanel
          className="settings-panel--compact"
          title={"1. Public URL"}
          description={"Payment callbacks, share links, and OSS callbacks"}
        >
          <div className="settings-field-grid">
            <LabeledControl
              label={"Backend Public Base URL"}
              hint={"Example: https://www.printfilm.com"}
              className="settings-field-span-full"
            >
              <input
                className="settings-input"
                value={form.public_base_url}
                onChange={(e) => patchField("public_base_url", e.target.value)}
              />
            </LabeledControl>
          </div>
          <p className="settings-panel-footnote">
            {"Infrastructure such as the database, Redis, and SECRET_KEY is still configured through server environment variables and cannot be modified on this page."}</p>
        </SettingsPanel>

        <SettingsPanel
          className="settings-panel--compact"
          title={"2. Media Tools"}
          description={"Local ffmpeg / ffprobe required for compositing and frame extraction"}
        >
          <div className="settings-field-grid">
            <LabeledControl label={"ffmpeg Path"}>
              <input
                className="settings-input"
                placeholder="ffmpeg"
                value={form.ffmpeg_path}
                onChange={(e) => patchField("ffmpeg_path", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label={"ffprobe Path"}>
              <input
                className="settings-input"
                placeholder="ffprobe"
                value={form.ffprobe_path}
                onChange={(e) => patchField("ffprobe_path", e.target.value)}
              />
            </LabeledControl>
          </div>
        </SettingsPanel>
      </div>
    </SettingsTabShell>
  );
}
