import { api } from "@/lib/api";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PlaybackInfo {
  videoId: string;
  title: string;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  resumePositionSec: number;
  completionPercent: number;
  watchSessionId: string | null;
  status: string;
}

interface VideoPlayerModalProps {
  videoId: string;
  onClose: () => void;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_SECONDS = HEARTBEAT_INTERVAL_MS / 1000;

export function VideoPlayerModal({ videoId, onClose }: VideoPlayerModalProps) {
  const [info, setInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/v1/videos/${videoId}/playback`)
      .then((r) => setInfo(r.data.data as PlaybackInfo))
      .catch((err) => {
        const e = err as { response?: { data?: { error?: { title?: string } } } };
        setError(e.response?.data?.error?.title ?? "Cannot play this video");
      })
      .finally(() => setLoading(false));
  }, [videoId]);

  useEffect(() => {
    if (!info || !info.watchSessionId) return;
    const sessionId = info.watchSessionId;

    const tick = () => {
      if (!isPlayingRef.current) return;
      const pos = videoRef.current?.currentTime ?? 0;
      api
        .post(`/api/v1/videos/watch-sessions/${sessionId}/heartbeat`, {
          currentPositionSec: Math.floor(pos),
          secondsWatched: HEARTBEAT_SECONDS,
        })
        .catch(() => {});
    };

    const interval = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [info]);

  useEffect(() => {
    const sessionId = info?.watchSessionId;
    if (!sessionId) return;

    return () => {
      const url = `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/v1/videos/watch-sessions/${sessionId}/end`;
      // sendBeacon is best-effort for page unload / modal close
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      }
    };
  }, [info?.watchSessionId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !info) return;
    if (info.resumePositionSec > 0 && info.resumePositionSec < (info.durationSec ?? Infinity)) {
      video.currentTime = info.resumePositionSec;
    }
  }, [info]);

  const isStubVideo = info?.playbackUrl?.includes("/embed/stub/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-soft">
          <h2 className="font-display text-base truncate">{info?.title ?? "Video"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-dim"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 bg-black flex items-center justify-center min-h-[400px]">
          {loading && <div className="text-white text-sm">Loading...</div>}
          {error && <div className="text-white text-sm">{error}</div>}
          {!loading && !error && info && (
            <>
              {isStubVideo ? (
                <div className="text-center text-white p-8">
                  <div className="text-xs uppercase tracking-widest text-text-dim mb-3">
                    [ Stub Video · Dev Mode ]
                  </div>
                  <div className="text-lg mb-1">{info.title}</div>
                  <div className="text-xs text-text-dim">
                    Bunny Stream not configured — playback is simulated
                  </div>
                  <div className="mt-4">
                    <video
                      ref={videoRef}
                      className="w-full max-w-2xl rounded-lg"
                      controls
                      onPlay={() => {
                        isPlayingRef.current = true;
                      }}
                      onPause={() => {
                        isPlayingRef.current = false;
                      }}
                      onEnded={() => {
                        isPlayingRef.current = false;
                      }}
                      poster={info.thumbnailUrl ?? undefined}
                    >
                      <source src="about:blank" type="video/mp4" />
                      <track kind="captions" />
                    </video>
                    <div className="text-xs text-text-dim mt-3">
                      Heartbeat {info.watchSessionId ? "active" : "off"}; resume at{" "}
                      {info.resumePositionSec}s; last progress{" "}
                      {Math.round(info.completionPercent)}%
                    </div>
                  </div>
                </div>
              ) : info.playbackUrl?.includes("iframe.mediadelivery.net") ? (
                <iframe
                  src={info.playbackUrl}
                  title={info.title}
                  className="w-full aspect-video"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={info.playbackUrl ?? undefined}
                  className="w-full max-h-[70vh]"
                  controls
                  onPlay={() => {
                    isPlayingRef.current = true;
                  }}
                  onPause={() => {
                    isPlayingRef.current = false;
                  }}
                  onEnded={() => {
                    isPlayingRef.current = false;
                  }}
                  poster={info.thumbnailUrl ?? undefined}
                >
                  <track kind="captions" />
                </video>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
