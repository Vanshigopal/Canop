import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requirePermission, requireRole } from "@/middleware/auth";
import {
  deleteFile,
  detectMaterialType,
  getSignedDownloadUrl,
  uploadFile,
} from "@/services/storage.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

export const materialsRouter = Router();
materialsRouter.use(authenticate);

// GET /api/v1/materials
materialsRouter.get("/", async (req, res) => {
  const { subjectId, chapterNumber, search } = req.query;
  const tenantId = req.user!.tenantId;

  const materials = await withTenantTransaction(prisma, tenantId, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma where clause
    const where: any = {
      deletedAt: null,
      isPublished: true,
    };
    if (subjectId) where.subjectId = subjectId as string;
    if (chapterNumber) where.chapterNumber = Number(chapterNumber);
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { batchId: true },
      });
      if (!student || !student.batchId) return [];

      where.OR = [
        ...(where.OR ?? []),
        { accessType: "INSTITUTE" },
        { accessType: "BATCH", batchAccess: { some: { batchId: student.batchId } } },
      ];
    }

    return tx.studyMaterial.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
        batchAccess: { include: { batch: { select: { id: true, name: true } } } },
        _count: { select: { accessLogs: true } },
      },
      orderBy: [{ subjectId: "asc" }, { chapterNumber: "asc" }, { createdAt: "desc" }],
    });
  });

  return ok(res, materials);
});

// GET /api/v1/materials/:id
materialsRouter.get("/:id", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const material = await withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.studyMaterial.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: {
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
        batchAccess: { include: { batch: { select: { id: true, name: true } } } },
      },
    });
  });
  if (!material) throw Errors.notFound("Material");
  return ok(res, material);
});

// POST /api/v1/materials
materialsRouter.post(
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
    const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype, tenantId);

    const material = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const created = await tx.studyMaterial.create({
        data: {
          tenantId,
          title: body.title,
          description: body.description,
          materialType: detectMaterialType(file.mimetype),
          fileKey: uploadResult.fileKey,
          fileName: file.originalname,
          fileSize: uploadResult.fileSize,
          mimeType: file.mimetype,
          subjectId: body.subjectId,
          chapterNumber: body.chapterNumber,
          chapterTitle: body.chapterTitle,
          accessType: body.accessType,
          uploadedById: req.user!.id,
          publishedAt: new Date(),
          isPublished: true,
        },
      });

      if (body.accessType === "BATCH" && batchIds.length > 0) {
        await tx.materialBatchAccess.createMany({
          data: batchIds.map((batchId) => ({
            tenantId,
            materialId: created.id,
            batchId,
          })),
        });
      }

      return created;
    });

    emitToTenant(tenantId, "material:created", {
      materialId: material.id,
      title: material.title,
    });
    return ok(res, material);
  },
);

// GET /api/v1/materials/:id/download
materialsRouter.get("/:id/download", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const material = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const m = await tx.studyMaterial.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: { batchAccess: true },
    });
    if (!m) return null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true, batchId: true },
      });
      if (!student || !student.batchId) return null;

      if (m.accessType === "BATCH") {
        const hasAccess = m.batchAccess.some((a) => a.batchId === student.batchId);
        if (!hasAccess) return null;
      }

      await tx.materialAccessLog.create({
        data: {
          tenantId,
          materialId: m.id,
          studentId: student.id,
          userId: req.user!.id,
          action: "DOWNLOADED",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]?.slice(0, 500),
        },
      });

      await tx.studyMaterial.update({
        where: { id: m.id },
        data: { downloadCount: { increment: 1 } },
      });
    }

    return m;
  });

  if (!material) throw Errors.notFound("Material");

  const signedUrl = await getSignedDownloadUrl(material.fileKey, 600);
  return ok(res, { downloadUrl: signedUrl, fileName: material.fileName });
});

// POST /api/v1/materials/:id/view
materialsRouter.post("/:id/view", async (req, res) => {
  const tenantId = req.user!.tenantId;
  if (req.user!.role !== "STUDENT") return ok(res, { skipped: true });

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true },
    });
    if (!student) return;

    await tx.materialAccessLog.create({
      data: {
        tenantId,
        materialId: req.params.id as string,
        studentId: student.id,
        userId: req.user!.id,
        action: "VIEWED",
      },
    });

    await tx.studyMaterial.update({
      where: { id: req.params.id as string },
      data: { viewCount: { increment: 1 } },
    });
  });

  return ok(res, { success: true });
});

// DELETE /api/v1/materials/:id
materialsRouter.delete(
  "/:id",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const material = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const existing = await tx.studyMaterial.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!existing) throw Errors.notFound("Material");

      return tx.studyMaterial.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), isPublished: false },
      });
    });

    // Fire-and-forget file deletion (soft delete in DB; remove underlying file)
    deleteFile(material.fileKey).catch(() => {});

    emitToTenant(tenantId, "material:deleted", { materialId: material.id });
    return ok(res, { success: true });
  },
);
