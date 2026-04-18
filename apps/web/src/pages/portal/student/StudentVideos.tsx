import { Play, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  Empty,
  PortalSkeleton,
  SectionHeader,
} from "@/components/portal/PortalPrimitives";

interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  status: "UPLOADING" | "TRANSCODING" | "READY" | "FAILED";
  subject: { id: string; name: string } | null;
  myProgress: null | {
    completionPercent: number | string;
    furthestPositionSec: number;
  };
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function StudentVideos() {
  const [items, setItems] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/videos");
      setItems((data.data ?? []).filter((v: VideoRow) => v.status === "READY"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("video:created", load);
  useSocket("video:deleted", load);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Videos" />

      {loading && items.length === 0 ? (
        <PortalSkeleton height={240} />
      ) : items.length === 0 ? (
        <Empty
          icon={<Video size={20} />}
          title="No videos yet"
          body="Your teachers' video lessons will appear here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((v) => {
            const pct = v.myProgress ? Number(v.myProgress.completionPercent) : 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => navigate(`/portal/student/videos/${v.id}`)}
                className="glass-panel p-0 overflow-hidden text-left transition-transform active:scale-[0.99]"
              >
                <div
                  className="relative w-full aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"
                  style={{ backgroundColor: "#E0E7FF" }}
                >
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video size={36} color="#4F46E5" />
                  )}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                    >
                      <Play size={20} color="#2C2C2A" fill="#2C2C2A" />
                    </div>
                  </div>
                  <div
                    className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                  >
                    {fmtDuration(v.durationSec)}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium truncate" style={{ color: "#2C2C2A" }}>
                    {v.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#6B6A66" }}>
                    {v.subject?.name ?? "—"}
                  </p>
                  {pct > 0 && (
                    <div className="mt-2">
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#F1EFE8" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: "#4F46E5",
                          }}
                        />
                      </div>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: "#6B6A66" }}
                      >
                        {Math.round(pct)}% watched
                      </p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
