import { useMemo, useState } from "react";
import {
  LabeledControl,
  SettingsLoading,
  SettingsPanel,
  SettingsStatusBar,
  SettingsTabShell,
} from "@/components/settings/SettingsPanel";
import { SecretField } from "@/components/settings/SecretField";
import { Switch } from "@/components/ui/switch";
import { useAdminModelSettings } from "@/hooks/useAdminModelSettings";

// 阿里云 OSS 存储配置
export function OssSettingsPanel() {
  const { form, loading, saving, patchField, save } = useAdminModelSettings();
  const [ossKeyIdInput, setOssKeyIdInput] = useState("");
  const [ossKeySecretInput, setOssKeySecretInput] = useState("");
  const [clearOssId, setClearOssId] = useState(false);
  const [clearOssSecret, setClearOssSecret] = useState(false);

  const ossReady = useMemo(() => {
    if (!form?.oss_enabled) return false;
    const hasCreds =
      (form.has_oss_access_key_id && !clearOssId) || ossKeyIdInput.trim().length > 0;
    const hasSecret =
      (form.has_oss_access_key_secret && !clearOssSecret) || ossKeySecretInput.trim().length > 0;
    return Boolean(form.oss_bucket && hasCreds && hasSecret);
  }, [form, clearOssId, clearOssSecret, ossKeyIdInput, ossKeySecretInput]);

  async function handleSave() {
    if (!form) return;
    await save(
      {
        oss_enabled: form.oss_enabled,
        oss_endpoint: form.oss_endpoint,
        oss_region: form.oss_region,
        oss_bucket: form.oss_bucket,
        oss_folder: form.oss_folder,
        oss_public_base: form.oss_public_base,
        oss_upload_async: form.oss_upload_async,
        oss_upload_queue: form.oss_upload_queue,
        oss_access_key_id: ossKeyIdInput.trim() || undefined,
        oss_access_key_secret: ossKeySecretInput.trim() || undefined,
        clear_oss_access_key_id: clearOssId,
        clear_oss_access_key_secret: clearOssSecret,
      },
      "Storage settings saved",
    );
    setOssKeyIdInput("");
    setOssKeySecretInput("");
    setClearOssId(false);
    setClearOssSecret(false);
  }

  if (loading || !form) {
    return <SettingsLoading />;
  }

  return (
    <SettingsTabShell onSave={() => void handleSave()} saving={saving}>
      <SettingsStatusBar
        title={"Storage Readiness"}
        items={[
          {
            id: "oss",
            label: "Alibaba Cloud OSS",
            ready: ossReady,
            readyText: "Ready",
            pendingText: form.oss_enabled ? "Credentials incomplete" : "Not enabled",
          },
          {
            id: "async",
            label: "Asynchronous Upload",
            ready: form.oss_upload_async,
            readyText: "Enabled",
            pendingText: "Disabled",
          },
        ]}
        extra={
          <span className="settings-status-extra">
            {"Configuration source:"}{form.source === "db" ? "Admin" : "Environment Variables"}
          </span>
        }
      />

      <div className="settings-routing-grid">
        <SettingsPanel
          className="settings-panel--compact"
          title={"1. Alibaba Cloud OSS"}
          description={"Generated files are saved locally first, then uploaded to OSS asynchronously"}
        >
          <div className="settings-toggle-row">
            <div>
              <strong>{"Enable OSS"}</strong>
              <span>{"When disabled, only the local static directory is used"}</span>
            </div>
            <Switch checked={form.oss_enabled} onCheckedChange={(v) => patchField("oss_enabled", v)} />
          </div>
          <div className="settings-field-grid mt-3">
            <LabeledControl label="Endpoint">
              <input
                className="settings-input"
                placeholder="oss-cn-beijing.aliyuncs.com"
                value={form.oss_endpoint}
                onChange={(e) => patchField("oss_endpoint", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label="Region">
              <input
                className="settings-input"
                placeholder="cn-hangzhou"
                value={form.oss_region}
                onChange={(e) => patchField("oss_region", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label="Bucket">
              <input
                className="settings-input"
                value={form.oss_bucket}
                onChange={(e) => patchField("oss_bucket", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label={"Directory prefix"}>
              <input
                className="settings-input"
                placeholder="kepu"
                value={form.oss_folder}
                onChange={(e) => patchField("oss_folder", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl
              label={"Public access base URL"}
              hint={"Leave blank to automatically construct https://{bucket}.{endpoint}"}
              className="settings-field-span-full"
            >
              <input
                className="settings-input"
                placeholder="https://cdn.example.com"
                value={form.oss_public_base}
                onChange={(e) => patchField("oss_public_base", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label={"Upload queue name"}>
              <input
                className="settings-input"
                value={form.oss_upload_queue}
                onChange={(e) => patchField("oss_upload_queue", e.target.value)}
              />
            </LabeledControl>
            <SecretField
              label="AccessKey ID"
              value={ossKeyIdInput}
              configured={form.has_oss_access_key_id && !clearOssId}
              onChange={setOssKeyIdInput}
              onClear={() => {
                setOssKeyIdInput("");
                setClearOssId(true);
              }}
            />
            <SecretField
              label="AccessKey Secret"
              value={ossKeySecretInput}
              configured={form.has_oss_access_key_secret && !clearOssSecret}
              onChange={setOssKeySecretInput}
              onClear={() => {
                setOssKeySecretInput("");
                setClearOssSecret(true);
              }}
            />
          </div>
          <div className="settings-toggle-row mt-3">
            <div>
              <strong>{"Asynchronous Upload"}</strong>
              <span>{"Return the local URL first, then upload to OSS in the background queue"}</span>
            </div>
            <Switch checked={form.oss_upload_async} onCheckedChange={(v) => patchField("oss_upload_async", v)} />
          </div>
        </SettingsPanel>
      </div>
    </SettingsTabShell>
  );
}
