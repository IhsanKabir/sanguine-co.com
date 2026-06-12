"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/monitoring";
import {
  AUDIO_CACHE_TAG,
  AUDIO_KEY,
  getAudioSettingsUncached,
} from "@/lib/audio-settings";
import {
  AUDIO_KINDS,
  audioSettingsSchema,
  type AudioKind,
  type AudioSettings,
} from "@/lib/audio-shared";

/**
 * Admin actions for the uploadable ambient audio (EXECUTION-PLAN 4.2).
 *
 * The browser uploads straight to the `audio` Storage bucket with the
 * admin's session JWT (RLS enforces the `settings` permission — see
 * migration 0015), then calls `saveAudioFile` to record the URL. Mirrors
 * the product-images flow so there is one upload idiom in the codebase.
 */

const BUCKET = "audio";
const MAX_BYTES = 250 * 1024; // plan 4.2: reject > 250 KB server-side too

const saveSchema = z.object({
  kind: z.enum(AUDIO_KINDS),
  url: z.string().url().max(600),
  path: z.string().min(1).max(300),
  label: z.string().max(120).default(""),
  sizeBytes: z.number().int().positive(),
});

/** The only origin we accept audio URLs from — our own public bucket. */
function bucketPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${BUCKET}/` : null;
}

async function persist(next: AudioSettings): Promise<void> {
  const data = audioSettingsSchema.parse(next);
  await db
    .insert(schema.siteSettings)
    .values({ key: AUDIO_KEY, value: data })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: data } });
  revalidateTag(AUDIO_CACHE_TAG);
  // The URL bridge is baked into every page's HTML via the locale layout.
  for (const locale of ["en", "bn"]) {
    revalidatePath(`/${locale}`, "layout");
  }
}

/** Remove a blob from the bucket, best-effort — an orphan is not worth failing the save. */
async function removeBlob(path: string): Promise<void> {
  try {
    const sb = createSupabaseServiceClient();
    await sb.storage.from(BUCKET).remove([path]);
  } catch (err) {
    captureError(err, { action: "audio.removeBlob", path });
  }
}

export async function saveAudioFile(
  input: z.infer<typeof saveSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("settings");

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid audio payload." };
  const { kind, url, path, label, sizeBytes } = parsed.data;

  // NOTE: sizeBytes is browser-reported (the file went direct-to-bucket, so
  // this action never sees the bytes). The bucket's 256 KB file_size_limit
  // (migration 0015) is the actual enforcement — this check is UX only.
  if (sizeBytes > MAX_BYTES) {
    return { ok: false, error: "File is over the 250 KB limit." };
  }
  // Same origin-validation idiom as recordProductImage: the URL must point
  // into our own public bucket and must end with the path that was uploaded.
  const prefix = bucketPrefix();
  if (!prefix || !url.startsWith(prefix) || !url.endsWith(path)) {
    return { ok: false, error: "Audio URL does not match the storage bucket." };
  }

  const current = await getAudioSettingsUncached();
  const previous = current[kind];
  await persist({
    ...current,
    [kind]: { url, path, label, uploadedAt: new Date().toISOString() },
  });
  // Replacing a sound leaves the old blob behind — clean it up after the
  // settings row is safely written. Known TOCTOU: two simultaneous saves of
  // the same kind can orphan one blob (read → persist isn't transactional
  // with Storage). Worst case is an orphaned file, never a broken setting —
  // removeBlob is best-effort by design, so we accept this for a three-file
  // bucket rather than adding locking.
  if (previous && previous.path !== path) await removeBlob(previous.path);
  return { ok: true };
}

/** One-click rollback to the synthesised default (plan 4.2 acceptance). */
export async function clearAudioFile(
  kind: AudioKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("settings");

  const current = await getAudioSettingsUncached();
  const previous = current[kind];
  await persist({ ...current, [kind]: null });
  if (previous) await removeBlob(previous.path);
  return { ok: true };
}
