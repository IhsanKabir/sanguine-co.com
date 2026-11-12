import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth-utils";
import { getCustomerPrefill } from "@/lib/customer-prefill";
import CheckoutForm from "./CheckoutForm";
import { isOnlinePaymentEnabled } from "@/lib/payments/sslcommerz";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { payment } = await searchParams;
  // Back from SSLCommerz without paying (see api/payments/sslcommerz).
  const paymentNotice = payment === "failed" || payment === "cancelled" ? payment : null;
  setRequestLocale(locale);
  const t = await getTranslations();

  const user = await getCurrentUser();

  const prefill = await getCustomerPrefill(user);

  return (
    <div className="section" style={{ maxWidth: 1200 }}>
      <div className="crumbs" style={{ padding: "0 0 24px", maxWidth: "none" }}>
        <Link href="/">{t("nav.maison")}</Link>
        <span className="current">{t("checkout.title")}</span>
      </div>
      <h1 className="serif page-h1" style={{ margin: "0 0 28px", color: "var(--purple-900)", fontWeight: 400 }}>
        {t("checkout.title")}
      </h1>
      <CheckoutForm prefill={prefill} onlinePayment={isOnlinePaymentEnabled()} paymentNotice={paymentNotice} />
    </div>
  );
}
