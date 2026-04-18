import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { LOCAL_UPLOAD_DIR } from "@/services/storage.service";

export const staticRouter = Router();

// GET /api/v1/static/*
staticRouter.get("/*", async (req, res) => {
  // biome-ignore lint/suspicious/noExplicitAny: Express wildcard param
  const fileKey = (req.params as any)[0] as string | undefined;
  if (!fileKey) return res.status(404).json({ ok: false, error: "Not found" });

  if (fileKey.includes("..") || fileKey.includes("\\")) {
    return res.status(400).json({ ok: false, error: "Invalid path" });
  }

  const filePath = path.join(LOCAL_UPLOAD_DIR, fileKey);
  if (!filePath.startsWith(LOCAL_UPLOAD_DIR)) {
    return res.status(400).json({ ok: false, error: "Invalid path" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: "File not found" });
  }

  return res.sendFile(filePath);
});
