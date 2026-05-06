"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-utils";

// ─── Core profile ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(40),
  acceptsMarketing: z.boolean(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  anniversary: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const user = await requireUser();
  const data = profileSchema.parse(input);
  await db
    .insert(schema.customerProfiles)
    .values({ id: user.id, ...data })
    .onConflictDoUpdate({
      target: schema.customerProfiles.id,
      set: {
        fullName: data.fullName,
        phone: data.phone,
        acceptsMarketing: data.acceptsMarketing,
        birthday: data.birthday ?? null,
        anniversary: data.anniversary ?? null,
      },
    });
  revalidatePath("/[locale]/account", "page");
  return { ok: true as const };
}

export async function getMyProfile() {
  const user = await requireUser();
  const [profile] = await db
    .select()
    .from(schema.customerProfiles)
    .where(eq(schema.customerProfiles.id, user.id));
  return profile ?? null;
}

// ─── Style preferences ───────────────────────────────────────────────────────

const stylePrefsSchema = z.object({
  perfumeFamily: z.string().min(1).max(60).nullable(),
  bookGenre: z.string().min(1).max(60).nullable(),
  flowerPreference: z.string().min(1).max(60).nullable(),
});

export async function updateStylePreferences(input: z.infer<typeof stylePrefsSchema>) {
  const user = await requireUser();
  const data = stylePrefsSchema.parse(input);
  await db
    .insert(schema.customerProfiles)
    .values({ id: user.id, ...data })
    .onConflictDoUpdate({
      target: schema.customerProfiles.id,
      set: {
        perfumeFamily: data.perfumeFamily,
        bookGenre: data.bookGenre,
        flowerPreference: data.flowerPreference,
      },
    });
  revalidatePath("/[locale]/account", "page");
  return { ok: true as const };
}

// ─── Notification preferences ────────────────────────────────────────────────

const notificationPrefsSchema = z.object({
  notifyEmail: z.boolean(),
  notifySms: z.boolean(),
});

export async function updateNotificationPrefs(input: z.infer<typeof notificationPrefsSchema>) {
  const user = await requireUser();
  const data = notificationPrefsSchema.parse(input);
  await db
    .insert(schema.customerProfiles)
    .values({ id: user.id, ...data })
    .onConflictDoUpdate({
      target: schema.customerProfiles.id,
      set: {
        notifyEmail: data.notifyEmail,
        notifySms: data.notifySms,
      },
    });
  revalidatePath("/[locale]/account", "page");
  return { ok: true as const };
}

// ─── Referral code ───────────────────────────────────────────────────────────

function deriveReferralCode(userId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = Math.imul(31, hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  let n = Math.abs(hash);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length) || Math.abs(hash) + i + 1;
  }
  return "SSG-" + code;
}

export async function ensureReferralCode(): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .select({ referralCode: schema.customerProfiles.referralCode })
    .from(schema.customerProfiles)
    .where(eq(schema.customerProfiles.id, user.id));

  if (row?.referralCode) return row.referralCode;

  const code = deriveReferralCode(user.id);
  await db
    .insert(schema.customerProfiles)
    .values({ id: user.id, referralCode: code })
    .onConflictDoUpdate({
      target: schema.customerProfiles.id,
      set: { referralCode: code },
    });
  return code;
}
