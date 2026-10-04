/**
 * SSL Wireless SMS gateway client. Bangladesh-specific.
 * Failures are logged but never block order creation.
 *
 * Bangladesh phone format: must start with +880 or 88 or 01. Normalised to '8801XXXXXXXXX'.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+880")) return digits.slice(1);
  if (digits.startsWith("880") && digits.length === 13) return digits;
  if (digits.startsWith("01") && digits.length === 11) return "880" + digits.slice(1);
  if (digits.startsWith("8801") && digits.length === 13) return digits;
  return null;
}

export function isSmsConfigured(): boolean {
  return !!(process.env.SSLWIRELESS_API_TOKEN && process.env.SSLWIRELESS_SID);
}

// SSLWIRELESS_BASE_URL only exists for local testing against a stub; it is
// ignored in production so a live deploy can only ever talk to SSL Wireless.
function smsBaseUrl(): string {
  const override = process.env.NODE_ENV !== "production" ? process.env.SSLWIRELESS_BASE_URL?.trim() : undefined;
  return override || "https://smsplus.sslwireless.com";
}

export async function sendSms(rawPhone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const apiToken = process.env.SSLWIRELESS_API_TOKEN;
  const sid = process.env.SSLWIRELESS_SID;
  if (!apiToken || !sid) {
    console.warn("[sms] missing SSLWIRELESS credentials — skipping send");
    return { ok: false, error: "missing-config" };
  }
  const phone = normalisePhone(rawPhone);
  if (!phone) {
    console.warn("[sms] invalid BD phone:", rawPhone);
    return { ok: false, error: "invalid-phone" };
  }
  const csmsId = "SSG-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  try {
    const res = await fetch(`${smsBaseUrl()}/api/v3/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: apiToken,
        sid,
        msisdn: phone,
        sms: message,
        csms_id: csmsId,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      const { captureError } = await import("@/lib/monitoring");
      captureError(new Error(`[sms] ${res.status}: ${text}`), { phoneLast4: phone.slice(-4) });
      return { ok: false, error: `${res.status}: ${text}` };
    }
    // The gateway answers 200 with { status: "FAILED", error_message } when it
    // refuses a message (bad SID, no balance), so the HTTP status alone is not
    // a delivery. A body that isn't JSON is treated as accepted, as before.
    const body = await res.json().catch(() => null) as { status?: string; error_message?: string } | null;
    if (body?.status && body.status.toUpperCase() !== "SUCCESS") {
      return { ok: false, error: body.error_message || body.status };
    }
    return { ok: true };
  } catch (e) {
    const { captureError } = await import("@/lib/monitoring");
    captureError(e, { where: "sslwireless.sendSms", phoneLast4: phone.slice(-4) });
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
