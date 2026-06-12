import { unstable_cache } from "next/cache";
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
 * Curated ambient audio (EXECUTION-PLAN 4.1 + 4.2) — server-side readers.
 *
 * `site_settings.audio` holds an optional uploaded file per ambient sound.
 * The storefront bridge in the locale layout exposes the URLs to
 * public/atier.js as `window.SSG_AUDIO_URLS`; atier.js plays the file when
 * one exists and falls back to its synthesised WebAudio tone otherwise —
 * including when a configured file 404s or fails to decode. Curation (real
 * recorded gongs, CC0/commissioned) is therefore an upload away and never a
 * deploy. Types and schemas live in audio-shared.ts (client-safe).
 */

export const AUDIO_KEY = "audio";
export const AUDIO_CACHE_TAG = "site-audio";

const EMPTY: AudioSettings = { gong: null, chime: null, seal: null };

/**
 * Cached read for the storefront bridge. Missing row, malformed jsonb or an
 * unreachable DB all degrade to "no files" — synth tones keep working.
 */
export const getAudioSettings = unstable_cache(
  async (): Promise<AudioSettings> => {
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
  },
  ["site-audio"],
  { tags: [AUDIO_CACHE_TAG] },
);

/** Uncached read for the admin page — always shows what is stored. */
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
