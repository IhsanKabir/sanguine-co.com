import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import WaxSeal from "@/components/storefront/WaxSeal";
import { eq } from "drizzle-orm";
import { formatBdt } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth-utils";

type Props = {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<{ t?: string }>;
};

// This page renders a full name, street address and phone — never indexable.
export const metadata = { robots: { index: false, follow: false } };

export default async function OrderConfirmation({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const orders = await db.select().from(schema.orders).where(eq(schema.orders.number, number)).limit(1).catch(() => []);
  const order = orders[0];
  if (!order) notFound();

  // Gate exactly like the track page: order numbers are low-entropy and this
  // page shows PII, so require the tracking token (?t=, carried by the
  // checkout redirect and the email link) OR an owning session.
  const tokenMatches = !!sp.t && sp.t === order.trackingToken;
  if (!tokenMatches) {
    const user = await getCurrentUser().catch(() => null);
    const ownerMatches = !!user && (
      (!!order.customerId && user.id === order.customerId) ||
      (!!order.guestEmail && !!user.email && order.guestEmail.toLowerCase() === user.email.toLowerCase())
    );
    if (!ownerMatches) notFound();
  }
  const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, order.id)).catch(() => []);
  const addr = parseShippingAddress(order.shippingAddress);
  const firstName = (addr.fullName ?? "").split(" ")[0] || "friend";

  return (
    <section className="section order-confirm-section" style={{ maxWidth: 760, textAlign: "center" }}>
      <div style={{ marginBottom: 28 }}>
        <WaxSeal size={180} />
      </div>
      <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold-deep)", marginBottom: 10, textTransform: "uppercase" }}>
        {t("checkout.orderConfirmed")}
      </div>
      <h1 className="serif page-h1" style={{ fontWeight: 400, color: "var(--purple-900)", margin: "0 0 16px", lineHeight: 1.1 }}>
        {t("checkout.thankYou")}, {firstName}.
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 500, margin: "0 auto 28px", lineHeight: 1.7 }}>
        {t("checkout.orderId")} <b style={{ color: "var(--purple-900)" }}>{order.number}</b>. {t("checkout.haveCash")}
      </p>
      <div className="divider-ornament">
        <span className="mono" style={{ fontSize: 10, letterSpacing: ".3em", color: "var(--gold-deep)" }}>CEREMONY COMPLETE</span>
      </div>
      <div className="order-confirm-stats">
        <div>
          <div className="pdp-label">{t("cart.total")}</div>
          <div className="serif" style={{ fontSize: 24, color: "var(--purple-900)" }}>{formatBdt(order.totalBdt, locale as "en"|"bn")}</div>
        </div>
        <div>
          <div className="pdp-label">Items</div>
          <div className="serif" style={{ fontSize: 24, color: "var(--purple-900)" }}>{lines.length}</div>
        </div>
        <div>
          <div className="pdp-label">Method</div>
          <div className="serif" style={{ fontSize: 24, color: "var(--purple-900)" }}>COD</div>
        </div>
      </div>
      {(addr.fullName || addr.line1 || addr.city) && (
        <div style={{ textAlign: "left", maxWidth: 460, margin: "0 auto 32px", padding: "20px 24px", background: "var(--purple-50)", border: "1px solid var(--purple-200)" }}>
          <div className="pdp-label">Delivering to</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--purple-900)" }}>
            {addr.fullName ?? "—"}<br/>{addr.line1 ?? ""}<br/>{addr.area ? addr.area + ", " : ""}{addr.city ?? ""}{addr.postcode ? " — " + addr.postcode : ""}<br/>{addr.phone ?? ""}
          </p>
        </div>
      )}
      <Link href="/" className="btn btn-primary">{t("checkout.returnHome")}</Link>
    </section>
  );
}
