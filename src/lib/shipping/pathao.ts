/**
 * Pathao Courier client. OAuth2 password-grant flow.
 * Caches the access token in module memory until expiry.
 *
 * Docs: https://merchant.pathao.com/courier/developer-api
 */

type Token = { access_token: string; expires_at: number };
let cachedToken: Token | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }
  const base = process.env.PATHAO_BASE_URL;
  const body = {
    client_id: process.env.PATHAO_CLIENT_ID,
    client_secret: process.env.PATHAO_CLIENT_SECRET,
    username: process.env.PATHAO_USERNAME,
    password: process.env.PATHAO_PASSWORD,
    grant_type: "password",
  };
  if (!base || !body.client_id || !body.username) {
    throw new Error("Pathao credentials not configured");
  }
  const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pathao token failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    // Refresh 60s early to be safe.
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.access_token;
}

export type PathaoOrderInput = {
  merchantOrderId: string;        // your SSG-XXXX
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: number;          // Pathao city ID
  recipientZone: number;          // Pathao zone ID
  recipientArea?: number;         // Pathao area ID (optional)
  itemQty: number;
  itemWeight: number;             // kg, min 0.5
  amountToCollect: number;        // 0 for prepaid; >0 for COD
  itemDescription?: string;
};

export async function createPathaoOrder(input: PathaoOrderInput): Promise<{ consignmentId: string; trackingCode: string }> {
  const token = await getToken();
  const storeId = process.env.PATHAO_STORE_ID;
  if (!storeId) throw new Error("PATHAO_STORE_ID not configured");

  const res = await fetch(`${process.env.PATHAO_BASE_URL}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      store_id: Number(storeId),
      merchant_order_id: input.merchantOrderId,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: input.recipientCity,
      recipient_zone: input.recipientZone,
      recipient_area: input.recipientArea,
      delivery_type: 48,             // 48 hours (normal)
      item_type: 2,                  // 1: Document, 2: Parcel
      special_instruction: "Handle with care · maison parcel",
      item_quantity: input.itemQty,
      item_weight: Math.max(0.5, input.itemWeight),
      amount_to_collect: input.amountToCollect,
      item_description: input.itemDescription,
    }),
  });
  if (!res.ok) {
    throw new Error(`Pathao order failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    consignmentId: data.data?.consignment_id || "",
    trackingCode: data.data?.consignment_id || "",
  };
}

export async function getCities(): Promise<Array<{ city_id: number; city_name: string }>> {
  const token = await getToken();
  const res = await fetch(`${process.env.PATHAO_BASE_URL}/aladdin/api/v1/city-list`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Pathao cities failed: ${await res.text()}`);
  const data = await res.json();
  return data.data?.data || [];
}

/**
 * Current status of a consignment ("Pending", "Picked", "In_Transit",
 * "Delivered", "Return", "Delivery_Failed", ...), from the order info endpoint.
 * We store the consignment id as the order's tracking code.
 */
export async function getPathaoOrderStatus(consignmentId: string): Promise<string> {
  const token = await getToken();
  const res = await fetch(
    `${process.env.PATHAO_BASE_URL}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
    {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`Pathao status failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data?.order_status_slug || data.data?.order_status || "unknown";
}
