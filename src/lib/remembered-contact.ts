/**
 * A guest's own contact details, remembered in their browser only, so the
 * next request or order starts filled in. Nothing here reaches the server.
 * Storage can be blocked (private windows, cleared site data), so every
 * access is guarded and the forms work without it.
 */
export type RememberedContact = {
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  area?: string;
  city?: string;
  postcode?: string;
};

const STORAGE_KEY = "ssg_contact";
const FIELDS = ["name", "phone", "email", "line1", "area", "city", "postcode"] as const;
const MAX_FIELD_LENGTH = 200;

export function readRememberedContact(): RememberedContact {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const source = parsed as Record<string, unknown>;
    const contact: RememberedContact = {};
    for (const field of FIELDS) {
      const value = source[field];
      if (typeof value === "string" && value) contact[field] = value.slice(0, MAX_FIELD_LENGTH);
    }
    return contact;
  } catch {
    return {};
  }
}

export function rememberContact(contact: RememberedContact): void {
  try {
    const merged = { ...readRememberedContact() };
    for (const field of FIELDS) {
      const value = contact[field]?.trim();
      if (value) merged[field] = value.slice(0, MAX_FIELD_LENGTH);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable: the form simply starts empty next time.
  }
}
