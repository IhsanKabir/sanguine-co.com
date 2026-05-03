/**
 * Open-redirect guard for `?next=` parameters.
 *
 * Three callsites used to maintain their own copy of this logic (auth callback,
 * locale auth callback, sign-in page). Three copies = three places to drift
 * out of sync; one place is enough. Mitigates the next-intl open-redirect
 * vector (GHSA-8f24-v5vv-gm5j) by rejecting any input that isn't an
 * obviously-internal absolute path.
 *
 * Rejects:
 *  - empty / missing
 *  - not starting with `/` (relative or external)
 *  - starting with `//` (protocol-relative URL → can hop to other origins)
 *  - containing `://` (full URL anywhere in string)
 *  - containing `\` (Windows path separator can confuse browser URL parsing)
 *
 * Returns the supplied `fallback` for any rejection — never throws.
 */
export function safeRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}
