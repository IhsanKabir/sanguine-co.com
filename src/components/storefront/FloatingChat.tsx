"use client";

import { normalizeBdWhatsApp } from "@/lib/utils";

/**
 * Floating WhatsApp + Messenger buttons (BD-essential per research).
 * Configure via env: NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_MESSENGER_PAGE.
 * Hidden if both are unset. Local-format numbers (01XXXXXXXXX) are normalized
 * to international for wa.me — a local-format link points at nothing.
 */
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;   // e.g. 8801XXXXXXXXX
const MESSENGER = process.env.NEXT_PUBLIC_MESSENGER_PAGE;   // e.g. sanguine

export default function FloatingChat() {
  if (!WHATSAPP && !MESSENGER) return null;
  const greeting = encodeURIComponent("Hello, I'd like to ask about a piece on Sanguine.");
  return (
    <div className="floating-chat" aria-label="Chat with the maison">
      {WHATSAPP && (
        <a
          href={`https://wa.me/${normalizeBdWhatsApp(WHATSAPP)}?text=${greeting}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fc-btn fc-whatsapp"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L.3 31.6l7.9-2.1c2.3 1.3 4.9 2 7.6 2 8.6 0 15.6-7 15.6-15.6S24.6.4 16 .4zm0 28.4c-2.4 0-4.8-.7-6.8-1.9l-.5-.3-4.7 1.2 1.3-4.6-.3-.5c-1.4-2.1-2.1-4.6-2.1-7.1 0-7.2 5.9-13.1 13.1-13.1S29.1 8.4 29.1 15.6 23.2 28.8 16 28.8zm7.2-9.8c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2-.2.4-1 1.3-1.3 1.5-.2.2-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.5-.7.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6-.1-.2-.9-2.1-1.2-2.9-.3-.8-.6-.7-.9-.7h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.1.9 2.9.9 4 .8.6-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.2-.4-.3-.8-.5z"/>
          </svg>
          <span className="fc-tooltip">WhatsApp</span>
        </a>
      )}
      {MESSENGER && (
        <a
          href={`https://m.me/${MESSENGER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fc-btn fc-messenger"
          aria-label="Messenger"
        >
          <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M16 1C7.7 1 1 7.3 1 15.2c0 4.5 2.2 8.5 5.6 11.1V31l5.1-2.8c1.4.4 2.8.6 4.3.6 8.3 0 15-6.3 15-14.2C31 7.3 24.3 1 16 1zm1.5 19.2-3.8-4.1-7.4 4.1L14.4 12l3.9 4.1L25.7 12l-8.2 8.2z"/>
          </svg>
          <span className="fc-tooltip">Messenger</span>
        </a>
      )}
    </div>
  );
}
