/**
 * How customers reach the shop. One number for calls and WhatsApp Business
 * (owner, 15 Nov 2026). Messenger comes from an environment variable.
 */
export const SUPPORT_EMAIL = "concierge@sanguine-co.com";
export const SUPPORT_PHONE_DISPLAY = "01575-363214";
export const SUPPORT_PHONE_TEL = "+8801575363214";
/** WhatsApp Business, in wa.me's format: country code and number, no "+". */
export const WHATSAPP_NUMBER = "8801575363214";

/** Reply hours the owner confirmed on 13 Nov 2026. */
export const REPLY_HOURS = { en: "10am and 10pm", bn: "সকাল ১০টা থেকে রাত ১০টার" } as const;

export const INSTAGRAM_URL = "https://www.instagram.com/thesanguineco/";
export const INSTAGRAM_HANDLE = "@thesanguineco";
export const FACEBOOK_URL = "https://www.facebook.com/TheSanguineCo";

export function whatsAppUrl(): string {
  return `https://wa.me/${WHATSAPP_NUMBER}`;
}

export function messengerUrl(): string | null {
  const page = process.env.NEXT_PUBLIC_MESSENGER_PAGE?.trim();
  return page ? `https://m.me/${page}` : null;
}
