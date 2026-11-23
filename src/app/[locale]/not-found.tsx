import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import StageHead from "@/components/storefront/StageHead";

export default function NotFound() {
  const t = useTranslations();
  return (
    <StageHead ghost="404" kicker="404" title={t("notFound.title")} lede={t("notFound.body")} align="center">
      <Link href="/" className="btn btn-primary">{t("checkout.returnHome")}</Link>
    </StageHead>
  );
}
