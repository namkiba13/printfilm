import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, type AdminDramaFragment } from "@/api/client";
import {
  AdminDetailMeta,
  AdminDetailSection,
} from "@/components/admin/AdminDetailLayout";
import { AdminEntityLink } from "@/components/admin/AdminEntityLink";
import { Button } from "@/components/ui/button";
import { formatDramaGenerationStatus } from "@/lib/dramaLabels";

/** 漫剧分镜详情 */
export function DramaFragmentDetailPage() {
  const { fragmentId } = useParams<{ fragmentId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminDramaFragment | null>(null);
  const [loading, setLoading] = useState(true);
  const id = Number(fragmentId);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate("/drama-fragments", { replace: true });
      return;
    }
    setLoading(true);
    void api<AdminDramaFragment>(`/api/admin/drama-fragments/${id}`)
      .then(setDetail)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to Load");
        navigate("/drama-fragments", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading && !detail) {
    return <div className="admin-detail-page-loading">{"Loading…"}</div>;
  }
  if (!detail) return null;

  return (
    <div className="admin-detail-page">
      <div className="admin-detail-page-toolbar">
        <Button variant="ghost" size="sm" className="admin-detail-back" asChild>
          <Link to="/drama-fragments">
            <ArrowLeft className="h-4 w-4" />
            {"Back to Storyboard List"}</Link>
        </Button>
        <div className="admin-detail-page-heading">
          <h2 className="admin-detail-page-title">{"Storyboard #"}{detail.id}</h2>
          <p className="admin-detail-page-sub">
            {"Episode"}{detail.episode_name ?? detail.episode_id} ·{" "}
            <AdminEntityLink kind="drama" id={detail.project_id} label={detail.project_title ?? undefined} />
          </p>
        </div>
        <div className="admin-detail-page-actions">
          <Button size="sm" variant="outline" asChild>
            <Link to={`/drama-episodes/${detail.episode_id}`}>{"Open Episode"}</Link>
          </Button>
        </div>
      </div>

      {(detail.cover || detail.video) ? (
        <AdminDetailSection title={"Media Preview"}>
          <div className="admin-detail-media">
            {detail.video ? (
              <video src={detail.video} controls className="max-w-full" />
            ) : detail.cover ? (
              <img src={detail.cover} alt="" />
            ) : null}
          </div>
        </AdminDetailSection>
      ) : null}

      <AdminDetailSection title={"Basic Information"}>
        <AdminDetailMeta
          items={[
            { label: "No.", value: detail.sort_order },
            {
              label: "Episode",
              value: (
                <Link to={`/drama-episodes/${detail.episode_id}`} className="admin-link">
                  {detail.episode_name ?? `Episode #${detail.episode_id}`}
                </Link>
              ),
            },
            {
              label: "Project",
              value: <AdminEntityLink kind="drama" id={detail.project_id} label={detail.project_title ?? undefined} />,
            },
            { label: "Duration", value: detail.duration_sec != null ? `${detail.duration_sec}s` : "—" },
            { label: "Generation Status", value: formatDramaGenerationStatus(detail.generation_status) },
            { label: "Number of Asset References", value: detail.asset_ref_count },
            { label: "Script Text", value: detail.content || "—", full: true },
          ]}
        />
      </AdminDetailSection>

      {(detail.asset_ids ?? []).length > 0 ? (
        <AdminDetailSection title={"Related Assets"}>
          <div className="flex flex-wrap gap-2">
            {(detail.asset_ids ?? []).map((assetId) => (
              <Button key={assetId} size="sm" variant="outline" asChild>
                <Link to={`/drama-assets/${assetId}`}>{"Asset #"}{assetId}</Link>
              </Button>
            ))}
          </div>
        </AdminDetailSection>
      ) : null}

      {detail.params ? (
        <AdminDetailSection title={"Parameters JSON"}>
          <pre className="admin-json-preview">{JSON.stringify(detail.params, null, 2)}</pre>
        </AdminDetailSection>
      ) : null}
    </div>
  );
}
