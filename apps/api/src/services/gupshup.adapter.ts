const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY ?? "";
const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME ?? "";
const GUPSHUP_SENDER_ID = process.env.GUPSHUP_SENDER_ID ?? "";
const GUPSHUP_ENABLED = GUPSHUP_API_KEY.length > 0;

export interface GupshupResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export async function sendSMS(phone: string, message: string): Promise<GupshupResult> {
  if (!GUPSHUP_ENABLED) {
    console.log(`[SMS → ${phone}] ${message}`);
    return { success: true, providerRef: `stub-sms-${Date.now()}` };
  }

  try {
    const params = new URLSearchParams({
      method: "SendMessage",
      send_to: phone.replace(/^\+/, ""),
      msg: message,
      msg_type: "TEXT",
      userid: GUPSHUP_SENDER_ID,
      auth_scheme: "plain",
      password: GUPSHUP_API_KEY,
      v: "1.1",
      format: "text",
    });
    const res = await fetch(`https://enterprise.smsgupshup.com/GatewayAPI/rest?${params.toString()}`);
    const text = await res.text();
    if (!res.ok) {
      return { success: false, error: `Gupshup SMS HTTP ${res.status}: ${text}` };
    }
    const match = text.match(/MessageId:\s*(\S+)/i);
    return { success: true, providerRef: match?.[1] ?? `gs-${Date.now()}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendWhatsApp(phone: string, message: string): Promise<GupshupResult> {
  if (!GUPSHUP_ENABLED) {
    console.log(`[WhatsApp → ${phone}] ${message}`);
    return { success: true, providerRef: `stub-wa-${Date.now()}` };
  }

  try {
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: GUPSHUP_SENDER_ID,
      destination: phone.replace(/^\+/, ""),
      "src.name": GUPSHUP_APP_NAME,
      message: JSON.stringify({ type: "text", text: message }),
    });
    const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
      method: "POST",
      headers: { apikey: GUPSHUP_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!res.ok) {
      return { success: false, error: json.message ?? `Gupshup WhatsApp HTTP ${res.status}` };
    }
    return { success: true, providerRef: json.messageId ?? `gs-wa-${Date.now()}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendEmail(email: string, subject: string, body: string): Promise<GupshupResult> {
  console.log(`[Email → ${email}] ${subject}\n${body}`);
  return { success: true, providerRef: `stub-email-${Date.now()}` };
}

export function isGupshupEnabled(): boolean {
  return GUPSHUP_ENABLED;
}
