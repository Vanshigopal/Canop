import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";

/**
 * Storage abstraction:
 * - Dev (no R2 creds): files stored under ./uploads/, served via /api/v1/static/
 * - Prod (R2 creds set): files uploaded to Cloudflare R2, signed URLs with expiry
 */

const IS_R2 = Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID);
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

let s3Client: S3Client | null = null;

if (IS_R2) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export interface UploadResult {
  fileKey: string;
  publicUrl?: string;
  fileSize: number;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  tenantId: string,
): Promise<UploadResult> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = randomBytes(16).toString("hex");
  const ext = path.extname(fileName) || "";
  const safeName = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const fileKey = `${tenantId}/${year}/${month}/${uuid}-${safeName}${ext}`;

  if (IS_R2 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      }),
    );

    return {
      fileKey,
      publicUrl: env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${fileKey}` : undefined,
      fileSize: buffer.length,
    };
  }

  const localPath = path.join(LOCAL_UPLOAD_DIR, fileKey);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);

  return {
    fileKey,
    publicUrl: `/api/v1/static/${fileKey}`,
    fileSize: buffer.length,
  };
}

export async function getSignedDownloadUrl(fileKey: string, expirySec = 600): Promise<string> {
  const clampedExpiry = Math.min(expirySec, 600);
  if (IS_R2 && s3Client) {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    return getSignedUrl(s3Client, command, { expiresIn: clampedExpiry });
  }
  return `/api/v1/static/${fileKey}`;
}

export async function readFile(fileKey: string): Promise<Buffer> {
  if (IS_R2 && s3Client) {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: S3 Body is a Readable stream
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  return fs.readFile(path.join(LOCAL_UPLOAD_DIR, fileKey));
}

export async function deleteFile(fileKey: string): Promise<void> {
  if (IS_R2 && s3Client) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
      }),
    );
    return;
  }
  try {
    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, fileKey));
  } catch {
    // best-effort
  }
}

export function detectMaterialType(
  mimeType: string,
): "PDF" | "DOCX" | "PPT" | "IMAGE" | "OTHER" {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml") || mimeType === "application/msword") return "DOCX";
  if (mimeType.includes("presentationml") || mimeType === "application/vnd.ms-powerpoint")
    return "PPT";
  if (mimeType.startsWith("image/")) return "IMAGE";
  return "OTHER";
}

export function isStorageR2(): boolean {
  return IS_R2;
}
