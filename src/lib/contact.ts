import { normalizeBdWhatsApp } from "@/lib/utils";

/**
 * How customers reach the shop. The phone number is the owner's (confirmed
 * 12 Nov 2026); WhatsApp and Messenger come from the same environment
 * variables the floating chat buttons use.
 */
export const SUPPORT_EMAIL = "concierge@sanguine-co.com";
export const SUPPORT_PHONE_DISPLAY = "01777-603364";
export const SUPPORT_PHONE_TEL = "+8801777603364";

/** Reply hours the owner confirmed on 13 Nov 2026. */
export const REPLY_HOURS = { en: "10am and 10pm", bn: "সকাল ১০টা থেকে রাত ১০টার" } as const;

export const INSTAGRAM_URL = "https://www.instagram.com/thesanguineco/";
export const INSTAGRAM_HANDLE = "@thesanguineco";
export const FACEBOOK_URL = "https://www.facebook.com/TheSanguineCo";

export function whatsAppUrl(): string | null {
  const number = normalizeBdWhatsApp(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "");
  return number ? `https://wa.me/${number}` : null;
}

export function messengerUrl(): string | null {
  const page = process.env.NEXT_PUBLIC_MESSENGER_PAGE?.trim();
  return page ? `https://m.me/${page}` : null;
}
