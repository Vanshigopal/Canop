import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requirePermission, requireRole } from "@/middleware/auth";
import {
  createVideoEntry,
  deleteVideo as deleteBunnyVideo,
  getVideoStatus,
  uploadVideoBuffer,
} from "@/services/bunny-stream.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

export const videosRouter = Router();
videosRouter.use(authenticate);

// GET /api/v1/videos
videosRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { subjectId, chapterNumber, search, batchId } = req.query;

  const videos = await withTenantTransaction(prisma, tenantId, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma where
    const where: any = { deletedAt: null, isPublished: true };
    if (subjectId) where.subjectId = subjectId as string;
    if (chapterNumber) where.chapterNumber = Number(chapterNumber);
    if (batchId) {
      where.OR = [
        { accessType: "INSTITUTE" },
        { accessType: "BATCH", batchAccess: { some: { batchId: batchId as string } } },
      ];
    }
    if (search) {
      const searchOr = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
      where.OR = where.OR ? [...where.OR, ...searchOr] : searchOr;
    }

    let studentId: string | null = null;
    let studentBatchId: string | null = null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true, batchId: true },
      });
      if (!student || !student.batchId) return [];
      studentId = student.id;
      studentBatchId = student.batchId;
      where.OR = [
        ...(where.OR ?? []),
        { accessType: "INSTITUTE" },
        { accessType: "BATCH", batchAccess: { some: { batchId: studentBatchId } } },
      ];
    }

    const rows = await tx.videoLecture.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
        batchAccess: { include: { batch: { select: { id: true, name: true } } } },
      },
      orderBy: [{ subjectId: "asc" }, { chapterNumber: "asc" }, { createdAt: "desc" }],
    });

    if (studentId) {
      const sessions = await tx.videoWatchSession.findMany({
        where: {
          studentId,
          videoId: { in: rows.map((r) => r.id) },
        },
        select: { videoId: true, completionPercent: true, furthestPositionSec: true },
      });
      const byVideo = new Map(sessions.map((s) => [s.videoId, s]));
      return rows.map((r) => ({
        ...r,
        myProgress: byVideo.get(r.id) ?? null,
      }));
    }

    return rows;
  });

  return ok(res, videos);
});

// POST /api/v1/videos
videosRouter.post(
  "/",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  upload.single("file"),
  async (req, res) => {
    const file = req.file;
    if (!file) throw Errors.validationFailed({ file: "Required" });

    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      subjectId: z.string().uuid().optional(),
      chapterNumber: z.coerce.number().int().min(1).optional(),
      chapterTitle: z.string().max(200).optional(),
      accessType: z.enum(["BATCH", "SUBJECT", "INSTITUTE"]).default("BATCH"),
      batchIds: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const batchIds =
      body.batchIds
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    const tenantId = req.user!.tenantId;

    // 1. Create Bunny entry
    const bunny = await createVideoEntry(body.title);

    // 2. Upload buffer to Bunny
    await uploadVideoBuffer(bunny.videoId, file.buffer);

    // 3. Poll for ready status (stub returns immediately)
    const status = await getVideoStatus(bunny.videoId);

    // 4. Create DB record
    const video = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const videoStatus =
        status.status === "ready" ? "READY" : status.status === "failed" ? "FAILED" : "TRANSCODING";
      const created = await tx.videoLecture.create({
        data: {
          tenantId,
          title: body.title,
          description: body.description,
          bunnyVideoId: bunny.videoId,
          bunnyLibraryId: bunny.libraryId,
          thumbnailUrl: status.thumbnailUrl,
          playbackUrl: status.playbackUrl,
          durationSec: status.durationSec,
          status: videoStatus,
          subjectId: body.subjectId,
          chapterNumber: body.chapterNumber,
          chapterTitle: body.chapterTitle,
          accessType: body.accessType,
          uploadedById: req.user!.id,
          publishedAt: videoStatus === "READY" ? new Date() : null,
          isPublished: videoStatus === "READY",
        },
      });

      if (body.accessType === "BATCH" && batchIds.length > 0) {
        await tx.videoBatchAccess.createMany({
          data: batchIds.map((batchId) => ({
            tenantId,
            videoId: created.id,
            batchId,
          })),
        });
      }

      return created;
    });

    emitToTenant(tenantId, "video:created", { videoId: video.id, title: video.title });
    return ok(res, video);
  },
);

// GET /api/v1/videos/:id/playback
videosRouter.get("/:id/playback", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const video = await tx.videoLecture.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: { batchAccess: true },
    });
    if (!video) return null;
    if (video.status !== "READY") {
      return { status: video.status, playbackUrl: null, resumePositionSec: 0 };
    }

    let watchSession = null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true, batchId: true },
      });
      if (!student || !student.batchId) return null;

      if (video.accessType === "BATCH") {
        const hasAccess = video.batchAccess.some((a) => a.batchId === student.batchId);
        if (!hasAccess) return null;
      }

      watchSession = await tx.videoWatchSession.upsert({
        where: { videoId_studentId: { videoId: video.id, studentId: student.id } },
        update: { lastHeartbeatAt: new Date() },
        create: {
          tenantId,
          videoId: video.id,
          studentId: student.id,
          userId: req.user!.id,
          startedAt: new Date(),
          lastHeartbeatAt: new Date(),
          furthestPositionSec: 0,
          totalWatchedSec: 0,
          completionPercent: 0,
        },
      });

      await tx.videoLecture.update({
        where: { id: video.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      videoId: video.id,
      title: video.title,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSec: video.durationSec,
      resumePositionSec: watchSession?.furthestPositionSec ?? 0,
      completionPercent: watchSession ? Number(watchSession.completionPercent) : 0,
      watchSessionId: watchSession?.id ?? null,
      status: video.status,
    };
  });

  if (!result) throw Errors.notFound("Video");
  return ok(res, result);
});

// POST /api/v1/videos/watch-sessions/:sessionId/heartbeat
videosRouter.post("/watch-sessions/:sessionId/heartbeat", async (req, res) => {
  const schema = z.object({
    currentPositionSec: z.coerce.number().min(0),
    secondsWatched: z.coerce.number().min(0).max(60),
  });
  const body = schema.parse(req.body);
  const tenantId = req.user!.tenantId;

  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const session = await tx.videoWatchSession.findFirst({
      where: { id: req.params.sessionId as string },
      include: { video: true },
    });
    if (!session) throw Errors.notFound("Watch session");

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true },
      });
      if (!student || student.id !== session.studentId) {
        throw Errors.forbidden("Not your watch session");
      }
    }

    const duration = session.video.durationSec ?? 0;
    const furthest = Math.max(
      session.furthestPositionSec,
      Math.min(body.currentPositionSec, duration > 0 ? duration : body.currentPositionSec),
    );
    const newTotal = duration > 0
      ? Math.min(session.totalWatchedSec + body.secondsWatched, duration)
      : session.totalWatchedSec + body.secondsWatched;
    const completion =
      duration > 0 ? Math.min(100, (newTotal / duration) * 100) : 0;

    return tx.videoWatchSession.update({
      where: { id: session.id },
      data: {
        furthestPositionSec: furthest,
        totalWatchedSec: newTotal,
        completionPercent: completion,
        lastHeartbeatAt: new Date(),
      },
    });
  });

  return ok(res, {
    furthestPositionSec: result.furthestPositionSec,
    totalWatchedSec: result.totalWatchedSec,
    completionPercent: Number(result.completionPercent),
  });
});

// POST /api/v1/videos/watch-sessions/:sessionId/end
videosRouter.post("/watch-sessions/:sessionId/end", async (req, res) => {
  const tenantId = req.user!.tenantId;
  await withTenantTransaction(prisma, tenantId, async (tx) => {
    const session = await tx.videoWatchSession.findFirst({
      where: { id: req.params.sessionId as string },
    });
    if (!session) return;
    await tx.videoWatchSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });
  });
  return ok(res, { success: true });
});

// POST /api/v1/videos/stub-upload/:videoId — dev-only endpoint to simulate Bunny upload URL
videosRouter.post("/stub-upload/:videoId", async (_req, res) => {
  return ok(res, { received: true });
});

// DELETE /api/v1/videos/:id
videosRouter.delete(
  "/:id",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const video = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const existing = await tx.videoLecture.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!existing) throw Errors.notFound("Video");
      return tx.videoLecture.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), isPublished: false },
      });
    });

    if (video.bunnyVideoId) {
      deleteBunnyVideo(video.bunnyVideoId).catch(() => {});
    }

    emitToTenant(tenantId, "video:deleted", { videoId: video.id });
    return ok(res, { success: true });
  },
);
