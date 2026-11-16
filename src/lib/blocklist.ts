import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { normalizeBdWhatsApp } from "@/lib/utils";

/**
 * Contacts the owner marked as spam in Admin, Pre-orders (16 Nov 2026). Stored in
 * site_settings.blocked_contacts; phones by their last 10 digits, so +880, 880 and 0 forms match.
 * A blocked contact's pre-order gets the same "received" answer as a real one and is never stored,
 * so a script cannot tell it was caught.
 */
const KEY = "blocked_contacts";
const MAX_ENTRIES = 2000;
const store = z.object({ emails: z.array(z.string()).default([]), phones: z.array(z.string()).default([]) });
type Store = z.infer<typeof store>;

const phoneKey = (raw: string | null | undefined) => normalizeBdWhatsApp(raw ?? "").slice(-10);
const emailKey = (raw: string | null | undefined) => (raw ?? "").trim().toLowerCase();

async function read(): Promise<Store> {
  const [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, KEY)).limit(1);
  const parsed = store.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { emails: [], phones: [] };
}

async function write(next: Store): Promise<void> {
  const value = { emails: next.emails.slice(-MAX_ENTRIES), phones: next.phones.slice(-MAX_ENTRIES) };
  await db.insert(schema.siteSettings).values({ key: KEY, value })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value } });
}

/** Whether this email or phone was marked as spam. A database error lets the request through. */
export async function isBlocked(email: string | null | undefined, phone: string | null | undefined): Promise<boolean> {
  try {
    const s = await read();
    const e = emailKey(email), p = phoneKey(phone);
    return (e !== "" && s.emails.includes(e)) || (p.length === 10 && s.phones.includes(p));
  } catch {
    return false;
  }
}

export async function setBlocked(email: string | null | undefined, phone: string | null | undefined, blocked: boolean): Promise<void> {
  const s = await read();
  const e = emailKey(email), p = phoneKey(phone);
  const without = { emails: s.emails.filter((x) => x !== e), phones: s.phones.filter((x) => x !== p) };
  await write(blocked
    ? { emails: e ? [...without.emails, e] : without.emails, phones: p.length === 10 ? [...without.phones, p] : without.phones }
    : without);
}
