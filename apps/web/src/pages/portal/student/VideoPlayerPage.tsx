import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
} from "@/components/portal/PortalPrimitives";

interface PlaybackResponse {
  playbackUrl: string;
  sessionId: string;
  startPositionSec: number;
  title: string;
  description: string | null;
  durationSec: number | null;
}

export function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PlaybackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/api/v1/videos/${id}/playback`);
      setInfo(data.data);
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!info) return;
    const sessionId = info.sessionId;

    const beat = async () => {
      const v = videoRef.current;
      if (!v) return;
      try {
        await api.post(`/api/v1/videos/watch-sessions/${sessionId}/heartbeat`, {
          currentPositionSec: Math.floor(v.currentTime),
        });
      } catch {
        // ignore
      }
    };

    heartbeatRef.current = window.setInterval(beat, 15_000);
    return () => {
      if (heartbeatRef.current !== null) window.clearInterval(heartbeatRef.current);
      const v = videoRef.current;
      api
        .post(`/api/v1/videos/watch-sessions/${sessionId}/end`, {
          currentPositionSec: v ? Math.floor(v.currentTime) : 0,
        })
        .catch(() => {});
    };
  }, [info]);

  if (loading && !info) return <PortalSkeleton height={260} />;
  if (!info) return <Empty title="Video not found" />;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "#4F46E5", minHeight: 44 }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div
        className="glass-panel p-0 overflow-hidden"
        style={{ aspectRatio: "16 / 9", backgroundColor: "#000" }}
      >
        <video
          ref={videoRef}
          src={info.playbackUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full"
          onLoadedMetadata={(e) => {
            if (info.startPositionSec > 0) {
              (e.currentTarget as HTMLVideoElement).currentTime = info.startPositionSec;
            }
          }}
        />
      </div>

      <PortalCard>
        <h1
          className="text-lg"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 500, color: "#2C2C2A" }}
        >
          {info.title}
        </h1>
        {info.description && (
          <p
            className="text-sm mt-2 whitespace-pre-wrap"
            style={{ color: "#3D3632" }}
          >
            {info.description}
          </p>
        )}
      </PortalCard>
    </div>
  );
}
