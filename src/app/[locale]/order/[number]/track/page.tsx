import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { formatBdt, formatDate } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import Icon from "@/components/storefront/Icon";
import { getCurrentUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

// Order pages are per-customer. Don't let search engines index them.
export const metadata: Metadata = {
  title: "Order tracking",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ number: string; locale: string }>;
  searchParams: Promise<{ t?: string }>;
};

const TIMELINE_EN = [
  { status: "pending",        label: "Order received",      desc: "The atelier has received your order and is preparing the piece." },
  { status: "cod_pending",    label: "Awaiting fulfilment", desc: "Cash-on-Delivery order. We are arranging your courier." },
  { status: "paid",           label: "Payment confirmed",   desc: "Payment received. Preparing dispatch." },
  { status: "processing",     label: "Preparing",           desc: "Wax-sealing the parcel." },
  { status: "shipped",        label: "On its way",          desc: "The courier has the parcel." },
  { status: "delivered",      label: "Delivered",           desc: "We hope it brings you joy." },
] as const;

const TIMELINE_BN = [
  { status: "pending",        label: "অর্ডার গৃহীত",            desc: "অ্যাটেলিয়ার আপনার অর্ডার পেয়েছে এবং পিসটি প্রস্তুত করছে।" },
  { status: "cod_pending",    label: "পূরণের অপেক্ষায়",        desc: "ক্যাশ অন ডেলিভারি অর্ডার। আমরা কুরিয়ারের ব্যবস্থা করছি।" },
  { status: "paid",           label: "পেমেন্ট নিশ্চিত",         desc: "পেমেন্ট গৃহীত। প্রেরণের প্রস্তুতি চলছে।" },
  { status: "processing",     label: "প্রস্তুত করা হচ্ছে",        desc: "পার্সেল মোমে সিল করা হচ্ছে।" },
  { status: "shipped",        label: "পথে",                  desc: "কুরিয়ারের কাছে পার্সেল।" },
  { status: "delivered",      label: "পৌঁছানো হয়েছে",          desc: "এটি যেন আপনাকে আনন্দ দেয়।" },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending: 0, cod_pending: 1, paid: 2, processing: 3, shipped: 4, delivered: 5,
  // Post-delivery return states keep the timeline at "delivered" rather than
  // resetting it to the start.
  return_requested: 5, returned: 5,
};

/**
 * Build a deep-link to the courier's own tracking page so the customer can
 * see live status, not just the static code we display.
 */
function courierTrackingUrl(courier: string | null, code: string | null): string | null {
  if (!courier || !code) return null;
  if (courier === "pathao")    return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(code)}`;
  if (courier === "steadfast") return `https://steadfast.com.bd/t/${encodeURIComponent(code)}`;
  return null;
}

export default async function OrderTrackPage({ params, searchParams }: Props) {
  const [{ locale, number }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const isBn = locale === "bn";
  const t = (en: string, bn: string) => (isBn ? bn : en);

  const orders = await db.select().from(schema.orders).where(eq(schema.orders.number, number)).limit(1).catch(() => []);
  const order = orders[0];
  if (!order) notFound();

  // Gate: the visitor must either present the matching tracking token in `?t=`
  // OR be signed in as the customer who placed the order. Otherwise show 404.
  const tokenMatches = !!sp.t && sp.t === order.trackingToken;
  let ownerMatches = false;
  if (!tokenMatches) {
    const user = await getCurrentUser();
    // guestEmail match mirrors returns.ts/account: storefront orders placed
    // before customerId stamping (or while signed out) still belong to the
    // signed-in customer with the same email.
    ownerMatches = !!user && (
      (!!order.customerId && user.id === order.customerId) ||
      (!!order.guestEmail && !!user.email && order.guestEmail.toLowerCase() === user.email.toLowerCase())
    );
  }
  if (!tokenMatches && !ownerMatches) notFound();

  const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, order.id)).catch(() => []);
  const addr = parseShippingAddress(order.shippingAddress);

  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <section className="section" style={{ maxWidth: 720 }}>
        <div className="crumbs"><Link href="/">{t("Maison", "মেইসন")}</Link><span className="current">{t("Order", "অর্ডার")} {number}</span></div>
        <div className="empty-state">
          <Icon name="x" size={36}/>
          <h3>{t(`Order ${order.status}`, `অর্ডার ${order.status === "cancelled" ? "বাতিল" : "ফেরত"}`)}</h3>
          <p>{t(
            "This order is no longer active. If you have questions, write to us at",
            "এই অর্ডারটি আর সক্রিয় নয়। প্রশ্ন থাকলে আমাদের লিখুন",
          )} <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a>.</p>
        </div>
      </section>
    );
  }

  const timeline = isBn ? TIMELINE_BN : TIMELINE_EN;
  const currentIdx = STATUS_INDEX[order.status] ?? 0;
  const courierUrl = courierTrackingUrl(order.shippingCourier, order.shippingTracking);

  return (
    <section className="section" style={{ maxWidth: 760 }}>
      <div className="crumbs">
        <Link href="/">{t("Maison", "মেইসন")}</Link>
        <span className="current">{t("Order", "অর্ডার")} {number}</span>
      </div>

      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
        <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>{t("YOUR ORDER", "আপনার অর্ডার")}</div>
        <h1 className="serif page-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>
          {number}
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 12 }}>
          {t("Placed", "তারিখ")} {order.createdAt ? formatDate(order.createdAt) : "—"} · {formatBdt(order.totalBdt, locale as "en" | "bn")} · {order.paymentMethod === "cod" ? t("Cash on Delivery", "ক্যাশ অন ডেলিভারি") : order.paymentMethod}
        </p>
      </div>

      <div className="track-timeline">
        {timeline.map((step, i) => {
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.status} className={"track-step " + (reached ? "reached " : "") + (isCurrent ? "current" : "")}>
              <div className="track-marker">
                {reached ? <Icon name="check" size={14} /> : <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span>}
              </div>
              <div className="track-body">
                <div className="track-label">{step.label}</div>
                <div className="track-desc">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {order.shippingCourier && order.shippingTracking && (
        <div className="panel" style={{ marginTop: 24, padding: 20, background: "var(--purple-50)" }}>
          <div className="pdp-label">{t("Courier", "কুরিয়ার")}</div>
          <div style={{ fontWeight: 500, marginTop: 4, textTransform: "capitalize" }}>{order.shippingCourier}</div>
          <div className="pdp-label" style={{ marginTop: 12 }}>{t("Tracking code", "ট্র্যাকিং কোড")}</div>
          <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{order.shippingTracking}</div>
          {courierUrl && (
            <a
              href={courierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {t("Track on", "ট্র্যাক করুন")} {order.shippingCourier} <Icon name="arrow" size={12} />
            </a>
          )}
        </div>
      )}

      <div className="panel" style={{ marginTop: 24, padding: 20 }}>
        <div className="pdp-label">{t("Delivering to", "যেখানে পৌঁছানো হবে")}</div>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--purple-900)" }}>
          {addr.fullName ?? "—"}<br/>{addr.line1 ?? ""}<br/>{addr.area ? addr.area + ", " : ""}{addr.city ?? ""}{addr.postcode ? " — " + addr.postcode : ""}<br/>{addr.phone ?? ""}
        </p>
      </div>

      <div className="panel" style={{ marginTop: 16, padding: 20 }}>
        <div className="pdp-label">{lines.length} {t(lines.length === 1 ? "piece" : "pieces", "পিস")}</div>
        {lines.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
            <span>
              {l.nameSnapshot}
              {(l.color || l.size) && <span style={{ color: "var(--ink-soft)", marginLeft: 8 }}>· {[l.color, l.size].filter(Boolean).join(" · ")}</span>}
              <span style={{ color: "var(--ink-soft)", marginLeft: 8 }}>× {l.qty}</span>
            </span>
            <span>{formatBdt(l.lineTotalBdt, locale as "en" | "bn")}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontWeight: 500 }}>
          <span>{t("Total", "মোট")}</span>
          <span>{formatBdt(order.totalBdt, locale as "en" | "bn")}</span>
        </div>
      </div>

      <p style={{ marginTop: 32, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>
        {t("Questions? Write to", "প্রশ্ন আছে? লিখুন")} <a href="mailto:concierge@sanguine-co.com">concierge@sanguine-co.com</a>.
      </p>
    </section>
  );
}
