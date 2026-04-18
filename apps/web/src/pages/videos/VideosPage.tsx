import { Badge, Button } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { Play, Plus, Search, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { UploadVideoModal } from "./UploadVideoModal";
import { VideoPlayerModal } from "./VideoPlayerModal";

type VideoStatus = "UPLOADING" | "TRANSCODING" | "READY" | "FAILED";

interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  durationSec: number | null;
  status: VideoStatus;
  accessType: "BATCH" | "SUBJECT" | "INSTITUTE";
  viewCount: number;
  totalWatchTimeSec: number;
  createdAt: string;
  subject: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string };
  batchAccess: Array<{ batch: { id: string; name: string } }>;
  myProgress?: {
    completionPercent: number | string;
    furthestPositionSec: number;
  } | null;
}

const STATUS_TONE: Record<VideoStatus, "warning" | "info" | "success" | "danger"> = {
  UPLOADING: "warning",
  TRANSCODING: "info",
  READY: "success",
  FAILED: "danger",
};

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideosPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "TEACHER";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playerVideo, setPlayerVideo] = useState<VideoRow | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (subjectFilter) params.subjectId = subjectFilter;
    if (search) params.search = search;
    api
      .get("/api/v1/videos", { params })
      .then((r) => setVideos(r.data.data as VideoRow[]))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [subjectFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/api/v1/subjects")
      .then((r) => setSubjects(r.data.data))
      .catch(() => setSubjects([]));
  }, []);

  useSocket<{ videoId: string }>("video:created", load);
  useSocket<{ videoId: string }>("video:deleted", load);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function remove(v: VideoRow) {
    if (!confirm(`Delete "${v.title}"?`)) return;
    try {
      await api.delete(`/api/v1/videos/${v.id}`);
      setToast("Deleted");
      load();
    } catch {
      setToast("Delete failed");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Videos</h1>
          <p className="text-text-muted text-sm mt-1">
            Recorded lectures with watch-time tracking and per-student progress
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Video
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center text-text-dim text-xs py-12">Loading videos...</div>
      )}

      {!loading && videos.length === 0 && (
        <div className="glass-panel text-center py-16">
          <Video size={32} className="mx-auto text-text-dim mb-3" />
          <p className="text-sm text-text-muted">No videos yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => {
          const progressPct = v.myProgress ? Number(v.myProgress.completionPercent) : 0;
          return (
            <div key={v.id} className="glass-panel p-3">
              <button
                type="button"
                onClick={() => v.status === "READY" && setPlayerVideo(v)}
                className="block w-full aspect-video rounded-lg overflow-hidden bg-surface-hover relative group"
              >
                {v.thumbnailUrl ? (
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video size={32} className="text-text-dim" />
                  </div>
                )}
                {v.status === "READY" && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition">
                    <Play
                      size={32}
                      className="text-white opacity-0 group-hover:opacity-100 transition"
                    />
                  </div>
                )}
                {v.durationSec && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(v.durationSec)}
                  </div>
                )}
              </button>

              <div className="mt-3">
                <div className="font-medium text-sm line-clamp-2">{v.title}</div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {v.subject && <Badge tone="neutral">{v.subject.name}</Badge>}
                  <Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge>
                </div>
                {v.myProgress && progressPct > 0 && (
                  <div className="mt-2">
                    <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary transition-all"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      {Math.round(progressPct)}% watched
                    </div>
                  </div>
                )}
                {canManage && (
                  <div className="text-xs text-text-dim mt-2">{v.viewCount} views</div>
                )}
                {canManage && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => remove(v)}
                      title="Delete"
                      className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploadOpen && (
        <UploadVideoModal
          subjects={subjects}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            setToast("Video uploaded");
            load();
          }}
        />
      )}

      {playerVideo && (
        <VideoPlayerModal
          videoId={playerVideo.id}
          onClose={() => {
            setPlayerVideo(null);
            load();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-text-primary text-white text-xs px-4 py-2.5 shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
