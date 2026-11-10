import { formatBdt, normalizeBdWhatsApp } from "./utils";

/**
 * The WhatsApp quote: one bilingual message the owner sends from their own
 * WhatsApp with a single tap (wa.me link, no API, no cost). Customers in
 * Bangladesh answer WhatsApp far sooner than email, and the price must reach
 * them fast because bouquets are made fresh only after confirmation.
 * Pure module: safe in client components.
 */
export type QuoteMessageInput = {
  customerName: string | null;
  productName: string;
  productNameBn?: string | null;
  quantity: number;
  quotedPriceBdt: number;
  depositBdt: number | null;
  /** YYYY-MM-DD, as stored on the request. */
  targetDate: string | null;
};

function formatDay(isoDate: string, locale: "en" | "bn"): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(d);
}

export function quoteWhatsAppText(q: QuoteMessageInput): string {
  const total = q.quotedPriceBdt * q.quantity;
  const deposit = q.depositBdt && q.depositBdt > 0 ? Math.min(q.depositBdt, total) : 0;
  const rest = total - deposit;
  const name = q.customerName?.trim() || "";
  const nameBn = q.productNameBn?.trim() || q.productName;
  const qtyBn = q.quantity.toLocaleString("bn-BD");

  const en = [
    `Hello${name ? ` ${name}` : ""},`,
    `Thank you for your Sanguine preorder: ${q.productName} × ${q.quantity}.`,
    `Price: ${formatBdt(total, "en")}.`,
    deposit > 0
      ? `To confirm, please send a ${formatBdt(deposit, "en")} deposit by bKash. The remaining ${formatBdt(rest, "en")} is paid in cash on delivery.`
      : "Payment is cash on delivery.",
    q.targetDate ? `Delivery: ${formatDay(q.targetDate, "en")}.` : null,
    "Reply YES to confirm.",
  ];
  const bn = [
    `প্রিয় ${name || "গ্রাহক"},`,
    `Sanguine-এ প্রি-অর্ডারের জন্য ধন্যবাদ: ${nameBn} × ${qtyBn}।`,
    `দাম: ${formatBdt(total, "bn")}।`,
    deposit > 0
      ? `নিশ্চিত করতে বিকাশে ${formatBdt(deposit, "bn")} অগ্রিম পাঠান। বাকি ${formatBdt(rest, "bn")} ডেলিভারির সময় নগদে দেবেন।`
      : "মূল্য ডেলিভারির সময় নগদে পরিশোধ করবেন।",
    q.targetDate ? `ডেলিভারি: ${formatDay(q.targetDate, "bn")}।` : null,
    "নিশ্চিত করতে \"হ্যাঁ\" লিখে উত্তর দিন।",
  ];
  return [...en, "", ...bn].filter((l) => l !== null).join("\n");
}

/** wa.me link that opens the owner's WhatsApp with the message ready to send. */
export function quoteWhatsAppUrl(phone: string, q: QuoteMessageInput): string | null {
  const digits = normalizeBdWhatsApp(phone);
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(quoteWhatsAppText(q))}`;
}
