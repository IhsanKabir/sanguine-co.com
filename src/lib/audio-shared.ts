import { z } from "zod";

/**
 * Shared shapes for the uploadable ambient audio (EXECUTION-PLAN 4.2).
 *
 * Split from audio-settings.ts deliberately: that module imports the
 * Drizzle/postgres client, so anything a "use client" component needs at
 * runtime (the kind list, the schemas, the types) must live here instead —
 * otherwise the DB driver gets pulled into the browser bundle and the
 * production build fails.
 */

export const AUDIO_KINDS = ["gong", "chime", "seal"] as const;
export type AudioKind = (typeof AUDIO_KINDS)[number];

export const audioFileSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1).max(300),
  label: z.string().max(120).default(""),
  uploadedAt: z.string(),
});

export const audioSettingsSchema = z.object({
  gong: audioFileSchema.nullable().default(null),
  chime: audioFileSchema.nullable().default(null),
  seal: audioFileSchema.nullable().default(null),
});

export type AudioSettings = z.infer<typeof audioSettingsSchema>;
export type AudioFile = z.infer<typeof audioFileSchema>;
