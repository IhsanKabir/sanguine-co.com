import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-utils";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { formatBdt, formatDate } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { listMyAddresses } from "@/lib/actions/addresses";
import AddressBook from "./AddressBook";
import OceanicBand from "@/components/storefront/OceanicBand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const [orders, addresses] = await Promise.all([
    db.select()
      .from(schema.orders)
      .where(eq(schema.orders.guestEmail, user.email!))
      .orderBy(desc(schema.orders.createdAt))
      .limit(20)
      .catch(() => []),
    listMyAddresses().catch(() => []),
  ]);

  return (
    <section className="section" style={{ maxWidth: 900 }}>
      <OceanicBand
        kicker={t("nav.account")}
        name={user.email ?? ""}
        trailing={
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">{t("account.signOut")}</button>
          </form>
        }
      />

      <h2 className="serif" style={{ fontSize: 24, color: "var(--purple-900)", fontWeight: 500, marginBottom: 16 }}>
        {t("account.orders")}
      </h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 14 }}>Wander the maison</Link>
        </div>
      ) : (
        <div className="table">
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th /></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--purple-900)", fontWeight: 500 }}>{o.number}</td>
                  <td>{o.createdAt ? formatDate(o.createdAt, locale as "en"|"bn") : "—"}</td>
                  <td>
                    <span className={"pill " + (o.status === "delivered" ? "pill-ok" : o.status === "shipped" ? "pill-info" : o.status === "cancelled" ? "pill-err" : "pill-warn")}>
                      {o.status}
                    </span>
                  </td>
                  <td>{formatBdt(o.totalBdt, locale as "en"|"bn")}</td>
                  <td><Link href={`/order/${o.number}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddressBook addresses={addresses} />
    </section>
  );
}
