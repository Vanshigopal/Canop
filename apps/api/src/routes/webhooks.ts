import { prisma } from "@/config/db";
import { ok } from "@/lib/response";
import { Router } from "express";

export const webhooksRouter = Router();

// Gupshup delivery status webhook (no auth — validated by signature if provided).
webhooksRouter.post("/gupshup/delivery", async (req, res) => {
  const body = req.body as {
    messageId?: string;
    status?: string;
    reason?: string;
  };
  if (!body.messageId || !body.status) {
    return ok(res, { acknowledged: true });
  }

  const status = mapStatus(body.status);
  const delivery = await prisma.messageDelivery.findFirst({
    where: { providerRef: body.messageId },
  });
  if (!delivery) return ok(res, { acknowledged: true, found: false });

  const data: Partial<{
    status: typeof status;
    deliveredAt: Date;
    errorMessage: string;
  }> = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();
  if (status === "FAILED" && body.reason) data.errorMessage = body.reason.slice(0, 500);

  await prisma.messageDelivery.update({ where: { id: delivery.id }, data });
  return ok(res, { acknowledged: true, deliveryId: delivery.id });
});

webhooksRouter.post("/gupshup/read", async (req, res) => {
  const body = req.body as { messageId?: string };
  if (!body.messageId) return ok(res, { acknowledged: true });

  const delivery = await prisma.messageDelivery.findFirst({
    where: { providerRef: body.messageId },
  });
  if (!delivery) return ok(res, { acknowledged: true, found: false });

  await prisma.messageDelivery.update({
    where: { id: delivery.id },
    data: { status: "READ", readAt: new Date() },
  });
  return ok(res, { acknowledged: true, deliveryId: delivery.id });
});

function mapStatus(
  s: string,
): "DELIVERED" | "SENT" | "FAILED" | "READ" {
  const u = s.toUpperCase();
  if (u.includes("DELIV")) return "DELIVERED";
  if (u.includes("READ")) return "READ";
  if (u.includes("FAIL") || u.includes("REJECT")) return "FAILED";
  return "SENT";
}
