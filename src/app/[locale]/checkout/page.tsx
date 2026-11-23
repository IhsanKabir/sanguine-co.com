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
    <section className="co-stage" aria-labelledby="co-title">
      <div className="stage-ghost" aria-hidden="true" data-ghost={t("checkout.title")} />
      <div className="co-inner">
        <div className="crumbs" style={{ padding: "0 0 18px", maxWidth: "none" }}>
          <Link href="/">{t("nav.maison")}</Link>
          <span className="current">{t("checkout.title")}</span>
        </div>
        <div className="stage-kicker co-kicker"><h1 id="co-title">{t("checkout.title")}</h1></div>
        <CheckoutForm prefill={prefill} onlinePayment={isOnlinePaymentEnabled()} paymentNotice={paymentNotice} />
      </div>
    </section>
  );
}
