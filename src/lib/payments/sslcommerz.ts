/**
 * SSLCommerz (v4) — the Bangladeshi gateway that covers bKash, Nagad,
 * Rocket and Visa/Mastercard/Amex behind one hosted payment page.
 *
 * Off unless SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD are set.
 * SSLCOMMERZ_LIVE=true switches from the sandbox to the live gateway; the
 * sandbox is the default so a misconfigured deploy can never take real money.
 *
 * Endpoints and field names follow SSLCommerz's own Node library
 * (sslcommerz-lts 1.2.0): session init is a multipart POST to
 * /gwprocess/v4/api.php, validation a GET to
 * /validator/api/validationserverAPI.php.
 *
 * The browser callbacks (success/fail/cancel) and the IPN are NOT trusted:
 * every payment is confirmed server-to-server with the Validation API, and
 * the validated amount, currency and transaction id must match the order.
 */

export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  live: boolean;
  baseUrl: string;
};

export function sslcommerzConfig(): SslcommerzConfig | null {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePassword) return null;
  const live = process.env.SSLCOMMERZ_LIVE === "true";
  // SSLCOMMERZ_BASE_URL only exists for local testing against a stub; it is
  // ignored in live mode so production can only ever talk to SSLCommerz.
  const override = !live ? process.env.SSLCOMMERZ_BASE_URL?.trim() : undefined;
  const baseUrl = override || `https://${live ? "securepay" : "sandbox"}.sslcommerz.com`;
  return { storeId, storePassword, live, baseUrl };
}

export function isOnlinePaymentEnabled(): boolean {
  return sslcommerzConfig() !== null;
}

export type InitPaymentInput = {
  tranId: string;          // our order number — unique per attempt
  totalBdt: number;
  numItems: number;
  productName: string;
  customer: { name: string; email: string; phone: string };
  shipping: { line1: string; city: string; postcode?: string | null };
  callbackBase: string;    // e.g. https://sanguine-co.com/api/payments/sslcommerz
  locale: string;          // passed through as value_a, read back on callback
};

export type InitPaymentResult =
  | { ok: true; gatewayUrl: string; sessionKey: string | null }
  | { ok: false; error: string };

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const cfg = sslcommerzConfig();
  if (!cfg) return { ok: false, error: "Online payment is not configured." };

  const form = new FormData();
  const fields: Record<string, string> = {
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    total_amount: input.totalBdt.toFixed(2),
    currency: "BDT",
    tran_id: input.tranId,
    success_url: `${input.callbackBase}/success`,
    fail_url: `${input.callbackBase}/fail`,
    cancel_url: `${input.callbackBase}/cancel`,
    ipn_url: `${input.callbackBase}/ipn`,
    shipping_method: "Courier",
    num_of_item: String(input.numItems),
    product_name: input.productName.slice(0, 255),
    product_category: "General",
    product_profile: "general",
    cus_name: input.customer.name,
    cus_email: input.customer.email,
    cus_phone: input.customer.phone,
    cus_add1: input.shipping.line1,
    cus_city: input.shipping.city,
    cus_postcode: input.shipping.postcode || "0000",
    cus_country: "Bangladesh",
    ship_name: input.customer.name,
    ship_add1: input.shipping.line1,
    ship_city: input.shipping.city,
    ship_postcode: input.shipping.postcode || "0000",
    ship_country: "Bangladesh",
    value_a: input.locale,
  };
  for (const [k, v] of Object.entries(fields)) form.append(k, v);

  try {
    const res = await fetch(`${cfg.baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as { status?: string; GatewayPageURL?: string; sessionkey?: string; failedreason?: string };
    if (json.status === "SUCCESS" && json.GatewayPageURL) {
      return { ok: true, gatewayUrl: json.GatewayPageURL, sessionKey: json.sessionkey ?? null };
    }
    return { ok: false, error: json.failedreason || "The payment gateway did not start a session." };
  } catch {
    return { ok: false, error: "The payment gateway could not be reached." };
  }
}

export type ValidatedPayment = {
  status: string;          // VALID | VALIDATED | INVALID_TRANSACTION | …
  tranId: string;
  valId: string;
  amount: number;
  currency: string;
  bankTranId: string | null;
  cardType: string | null;
  riskLevel: string | null; // "0" safe, "1" risky — SSLCommerz advises holding risky ones
  riskTitle: string | null;
};

/** Server-to-server confirmation. Returns null when the gateway can't be asked. */
export async function validatePayment(valId: string): Promise<ValidatedPayment | null> {
  const cfg = sslcommerzConfig();
  if (!cfg || !valId) return null;
  const qs = new URLSearchParams({
    val_id: valId,
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    v: "1",
    format: "json",
  });
  try {
    const res = await fetch(`${cfg.baseUrl}/validator/api/validationserverAPI.php?${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json()) as Record<string, string | undefined>;
    return {
      status: j.status ?? "",
      tranId: j.tran_id ?? "",
      valId: j.val_id ?? valId,
      // currency_type / currency_amount echo what we asked for at init;
      // amount / currency are what was settled. We only ever ask for BDT,
      // so prefer the echo and fall back to the settled pair.
      amount: Number(j.currency_amount ?? j.amount ?? NaN),
      currency: j.currency_type ?? j.currency ?? "",
      bankTranId: j.bank_tran_id ?? null,
      cardType: j.card_type ?? null,
      riskLevel: j.risk_level ?? null,
      riskTitle: j.risk_title ?? null,
    };
  } catch {
    return null;
  }
}

export function isValidStatus(status: string): boolean {
  return status === "VALID" || status === "VALIDATED";
}

export type TranQuery = { found: boolean; validValId: string | null };

/**
 * Transaction lookup by our tran_id (merchantTransIDvalidationAPI). Used
 * before releasing an order on a fail/cancel callback or a timeout: those
 * callbacks are unauthenticated, so a request alone must never cancel an
 * order that SSLCommerz has actually been paid for. Null = could not ask.
 */
export async function queryTransaction(tranId: string): Promise<TranQuery | null> {
  const cfg = sslcommerzConfig();
  if (!cfg || !tranId) return null;
  const qs = new URLSearchParams({
    tran_id: tranId,
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    v: "1",
    format: "json",
  });
  try {
    const res = await fetch(`${cfg.baseUrl}/validator/api/merchantTransIDvalidationAPI.php?${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json()) as { APIConnect?: string; element?: { status?: string; val_id?: string }[] };
    if (j.APIConnect && j.APIConnect !== "DONE") return null;
    const elements = Array.isArray(j.element) ? j.element : [];
    const valid = elements.find((e) => isValidStatus(e.status ?? ""));
    return { found: elements.length > 0, validValId: valid?.val_id ?? null };
  } catch {
    return null;
  }
}
