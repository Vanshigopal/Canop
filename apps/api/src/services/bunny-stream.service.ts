import axios from "axios";
import { env } from "@/config/env";

/**
 * Bunny Stream service for video hosting.
 * Stubbed locally: returns fake video IDs + placeholder playback URLs.
 * Real mode when BUNNY_STREAM_API_KEY + BUNNY_STREAM_LIBRARY_ID set.
 */

const IS_REAL = Boolean(env.BUNNY_STREAM_API_KEY && env.BUNNY_STREAM_LIBRARY_ID);

export interface BunnyVideoCreateResult {
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
}

export interface BunnyVideoStatus {
  videoId: string;
  status: "processing" | "ready" | "failed";
  durationSec?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
}

export function isBunnyRealMode(): boolean {
  return IS_REAL;
}

export async function createVideoEntry(title: string): Promise<BunnyVideoCreateResult> {
  if (!IS_REAL) {
    const fakeId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[bunny-stub] Video entry created: ${fakeId} (${title})`);
    return {
      videoId: fakeId,
      libraryId: "stub-library",
      uploadUrl: `http://localhost:3001/api/v1/videos/stub-upload/${fakeId}`,
      uploadHeaders: {},
    };
  }

  const response = await axios.post(
    `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos`,
    { title },
    {
      headers: {
        AccessKey: env.BUNNY_STREAM_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  const videoId = response.data.guid;
  return {
    videoId,
    libraryId: env.BUNNY_STREAM_LIBRARY_ID,
    uploadUrl: `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
    uploadHeaders: { AccessKey: env.BUNNY_STREAM_API_KEY },
  };
}

export async function uploadVideoBuffer(videoId: string, buffer: Buffer): Promise<void> {
  if (!IS_REAL) {
    console.log(`[bunny-stub] Video ${videoId} uploaded (${buffer.length} bytes, simulated)`);
    return;
  }

  await axios.put(
    `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
    buffer,
    {
      headers: {
        AccessKey: env.BUNNY_STREAM_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: 500 * 1024 * 1024,
      maxContentLength: 500 * 1024 * 1024,
    },
  );
}

export async function getVideoStatus(videoId: string): Promise<BunnyVideoStatus> {
  if (!IS_REAL) {
    return {
      videoId,
      status: "ready",
      durationSec: 600,
      thumbnailUrl: `https://via.placeholder.com/1280x720.png?text=Stub+Video+${videoId.slice(0, 8)}`,
      playbackUrl: `https://iframe.mediadelivery.net/embed/stub/${videoId}`,
    };
  }

  const response = await axios.get(
    `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
    { headers: { AccessKey: env.BUNNY_STREAM_API_KEY } },
  );

  const data = response.data;
  const statusCode = data.status;
  // Bunny status codes: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding, 4=Finished, 5=Error
  let status: "processing" | "ready" | "failed" = "processing";
  if (statusCode === 4) status = "ready";
  if (statusCode === 5) status = "failed";

  return {
    videoId,
    status,
    durationSec: data.length || undefined,
    thumbnailUrl: data.thumbnailFileName
      ? `https://${env.BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/${data.thumbnailFileName}`
      : undefined,
    playbackUrl:
      status === "ready"
        ? `https://iframe.mediadelivery.net/embed/${env.BUNNY_STREAM_LIBRARY_ID}/${videoId}`
        : undefined,
  };
}

export async function deleteVideo(videoId: string): Promise<void> {
  if (!IS_REAL) {
    console.log(`[bunny-stub] Video ${videoId} deleted`);
    return;
  }
  await axios.delete(
    `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
    { headers: { AccessKey: env.BUNNY_STREAM_API_KEY } },
  );
}
