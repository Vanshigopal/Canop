import { type Request, type Response, Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "raquel-api",
    session: "1",
    timestamp: new Date().toISOString(),
  });
});
