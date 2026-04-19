import { useCallback, useState } from "react";
import { api } from "@/lib/api";

interface RazorpayOrderResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  key: string;
  stub: boolean;
}

interface StartArgs {
  studentFeeId: string;
  installmentId: string;
  amount: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  tenantName?: string;
  onSuccess: (info: { receiptNumber: string | null }) => void;
  onError?: (message: string) => void;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (resp: RazorpayHandlerResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpay() {
  const [processing, setProcessing] = useState(false);

  const start = useCallback(async (args: StartArgs) => {
    setProcessing(true);
    try {
      const orderRes = await api.post<{
        ok: boolean;
        data: RazorpayOrderResponse;
      }>("/api/v1/payments/razorpay/order", {
        studentFeeId: args.studentFeeId,
        installmentId: args.installmentId,
        amount: args.amount,
      });
      const order = orderRes.data.data;

      if (order.stub) {
        // Stub flow — verify immediately with a mock signature.
        const verify = await api.post<{
          ok: boolean;
          data: { paymentId: string; receiptNumber: string | null };
        }>("/api/v1/payments/razorpay/verify", {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_stub_${Date.now()}`,
          razorpaySignature: "stub-signature",
        });
        args.onSuccess({ receiptNumber: verify.data.data.receiptNumber });
        return;
      }

      const ok = await loadScript();
      if (!ok || !window.Razorpay) {
        args.onError?.("Could not load Razorpay. Check your connection.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amountPaise,
        currency: order.currency,
        name: args.tenantName ?? "Canop",
        description: `Fee payment — ${args.name}`,
        order_id: order.orderId,
        prefill: {
          name: args.name,
          email: args.email ?? undefined,
          contact: args.phone ?? undefined,
        },
        theme: { color: "#4F46E5" },
        handler: async (resp) => {
          try {
            const verify = await api.post<{
              ok: boolean;
              data: { paymentId: string; receiptNumber: string | null };
            }>("/api/v1/payments/razorpay/verify", {
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            args.onSuccess({ receiptNumber: verify.data.data.receiptNumber });
          } catch (err) {
            args.onError?.(err instanceof Error ? err.message : "Verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });
      rzp.open();
    } catch (err) {
      args.onError?.(err instanceof Error ? err.message : "Payment failed to start");
    } finally {
      setProcessing(false);
    }
  }, []);

  return { start, processing };
}
