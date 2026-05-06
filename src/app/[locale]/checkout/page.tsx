import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const user = await getCurrentUser();

  let prefill: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    area: string;
    city: string;
    postcode: string;
  } = { fullName: "", email: user?.email ?? "", phone: "", line1: "", area: "", city: "Dhaka", postcode: "" };

  if (user) {
    const [profileRow, defaultAddr] = await Promise.all([
      db.select()
        .from(schema.customerProfiles)
        .where(eq(schema.customerProfiles.id, user.id))
        .limit(1)
        .catch(() => []),
      db.select()
        .from(schema.addresses)
        .where(and(
          eq(schema.addresses.customerId, user.id as unknown as string),
          eq(schema.addresses.isDefault, true),
        ))
        .limit(1)
        .catch(() => []),
    ]);

    const profile = profileRow[0] ?? null;
    const addr = defaultAddr[0] ?? null;

    prefill = {
      fullName: profile?.fullName ?? "",
      email: user.email ?? "",
      phone: profile?.phone ?? addr?.phone ?? "",
      line1: addr?.line1 ?? "",
      area: addr?.area ?? "",
      city: addr?.city ?? "Dhaka",
      postcode: addr?.postcode ?? "",
    };
  }

  return (
    <div className="section" style={{ maxWidth: 1200 }}>
      <div className="crumbs" style={{ padding: "0 0 24px", maxWidth: "none" }}>
        <Link href="/">Maison</Link>
        <span className="current">{t("checkout.title")}</span>
      </div>
      <h1 className="serif" style={{ fontSize: 44, margin: "0 0 28px", color: "var(--purple-900)", fontWeight: 400 }}>
        {t("checkout.title")}
      </h1>
      <CheckoutForm prefill={prefill} />
    </div>
  );
}
