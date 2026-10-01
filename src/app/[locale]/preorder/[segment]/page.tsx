import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; segment: string }>;
};

export default async function PreorderPage({ params }: Props) {
  const { locale, segment } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [seg] = await db.select().from(schema.segments).where(eq(schema.segments.id, segment)).limit(1);
  if (!seg || seg.hidden || !seg.preorderEnabled) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=/${locale}/preorder/${segment}`);
  }

  const name = (locale === "bn" && seg.nameBn) || seg.name;
  const tag = (locale === "bn" && seg.tagBn) || seg.tag || "";
  const blurb = (locale === "bn" && seg.blurbBn) || seg.blurb || "";

  return (
    <>
      <div className="crumbs">
        <Link href="/" style={{ cursor: "pointer" }}>{t("nav.maison")}</Link>
        <Link href={`/shop/${segment}`} style={{ cursor: "pointer" }}>{name}</Link>
        <span className="current">{t("bespoke.crumb")}</span>
      </div>
      <section className="section" style={{ paddingTop: 28, maxWidth: 880 }}>
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>
            {t("bespoke.kicker", { tag: tag.toUpperCase() })}
          </div>
          <h1 className="serif page-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400, lineHeight: 1.05 }}>
            {t("bespoke.title")}
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "16px 0 0", maxWidth: 620, lineHeight: 1.7 }}>
            {blurb || t("bespoke.introFallback", { name })} {t("bespoke.introTail")}
          </p>
        </div>
        <RequestForm
          segmentId={segment}
          segmentName={name}
          userId={user.id}
          userEmail={user.email ?? ""}
        />
      </section>
    </>
  );
}
