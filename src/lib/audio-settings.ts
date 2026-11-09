import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { audioSettingsSchema, type AudioSettings } from "./audio-shared";

export {
  AUDIO_KINDS,
  audioSettingsSchema,
  type AudioKind,
  type AudioSettings,
  type AudioFile,
} from "./audio-shared";

/**
 * Curated ambient audio (EXECUTION-PLAN 4.1 + 4.2): server-side readers.
 *
 * `site_settings.audio` holds an optional uploaded file per ambient sound.
 * Nothing on the storefront plays these since public/atier.js was removed
 * for speed (Nov 2026); only the Admin → Audio page reads them now.
 * Types and schemas live in audio-shared.ts (client-safe).
 */

export const AUDIO_KEY = "audio";
export const AUDIO_CACHE_TAG = "site-audio";

const EMPTY: AudioSettings = { gong: null, chime: null, seal: null };

/** Uncached read for the admin page: always shows what is stored. */
export async function getAudioSettingsUncached(): Promise<AudioSettings> {
  try {
    const rows = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, AUDIO_KEY))
      .limit(1);
    if (!rows[0]) return EMPTY;
    const parsed = audioSettingsSchema.safeParse(rows[0].value);
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}
