"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-utils";

const profileSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(40),
  acceptsMarketing: z.boolean(),
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
