/**
 * Steadfast Courier client. Used as fallback when Pathao can't deliver to a postcode.
 * Auth is via static API key + secret in headers; no token refresh.
 *
 * Docs: https://docs.steadfast.com.bd/
 */

export type SteadfastOrderInput = {
  invoice: string;                  // your SSG-XXXX
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;                // 0 for prepaid
  note?: string;
};

export async function createSteadfastOrder(input: SteadfastOrderInput): Promise<{ trackingCode: string; consignmentId: string }> {
  const base = process.env.STEADFAST_BASE_URL;
  const apiKey = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!base || !apiKey || !secret) throw new Error("Steadfast credentials not configured");

  const res = await fetch(`${base}/create_order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Secret-Key": secret,
    },
    body: JSON.stringify({
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
      note: input.note,
    }),
  });
  if (!res.ok) throw new Error(`Steadfast order failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    trackingCode: data.consignment?.tracking_code || "",
    consignmentId: String(data.consignment?.consignment_id || ""),
  };
}

/**
 * Delivery status by tracking code: pending, in_review, hold, delivered,
 * partial_delivered, cancelled, unknown, and the *_approval_pending variants
 * (the rider has reported an outcome Steadfast has not confirmed yet).
 */
export async function getSteadfastStatus(trackingCode: string): Promise<string> {
  const base = process.env.STEADFAST_BASE_URL;
  const apiKey = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!base || !apiKey || !secret) throw new Error("Steadfast credentials not configured");
  const res = await fetch(`${base}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
    headers: { "Api-Key": apiKey, "Secret-Key": secret },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Steadfast status failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.delivery_status || "unknown";
}
