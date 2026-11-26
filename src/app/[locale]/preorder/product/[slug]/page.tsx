import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { getCustomerPrefill } from "@/lib/customer-prefill";
import { isDhakaOnlySegment } from "@/lib/delivery-scope";
import { getProductImages } from "@/lib/queries";
import { priceDisplay, priceDisplayText, effectiveDepositPct } from "@/lib/pricing";
import ProductPreorderForm from "./ProductPreorderForm";
import { localizeEstimate } from "@/lib/delivery";
import { getCommerceSettings } from "@/lib/commerce";
import { cutoutFor } from "@/lib/cutouts";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { expressFeeFor } from "@/lib/express-fee-store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  /** ?color=&size=: a choice made before arriving here, kept (fewest steps). */
  searchParams: Promise<{ color?: string | string[]; size?: string | string[] }>;
};

const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Only a choice the piece really offers is kept; anything else falls back to the form's first. */
const offered = (options: string[], v: string | undefined): string | undefined =>
  options.find((o) => v && o.toLowerCase() === v.toLowerCase());

export default async function ProductPreorderPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [product] = await db.select().from(schema.products)
    .where(eq(schema.products.slug, slug)).limit(1);

  if (!product || !product.preorderEnabled) notFound();

  // No sign-in wall: guests preorder with their email (0021).
  const user = await getCurrentUser();
  const [prefill, seg, photos, uploaded, commerce, expressFee] = await Promise.all([
    getCustomerPrefill(user),
    product.segmentId
      ? db.select().from(schema.segments).where(eq(schema.segments.id, product.segmentId)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    getProductImages(product.id).catch(() => []),
    getUploadedCutouts().catch(() => ({})),
    getCommerceSettings(),
    // This visitor's same-day fee: theirs when signed in, the standard one for a guest.
    expressFeeFor(user?.email ?? null, user?.id ?? null).catch(() => null),
  ]);

  const isBn = locale === "bn";
  const name = (isBn && product.nameBn) || product.name;
  const segName = seg ? ((isBn && seg.nameBn) || seg.name) : "";
  const dhakaOnly = isDhakaOnlySegment(product.segmentId);
  const cutout = cutoutFor(product, uploaded);
  const colors = (product.colors as string[] | null) || [];
  const sizes = (product.sizes as string[] | null) || [];

  // Same pricing rules as the shop and the product page: a hidden price reads
  // "Price on request", never a stale or private figure; a made-to-order quote shows none.
  const display = priceDisplay(product);
  const priceLine = display.kind === "quote"
    ? (product.preorderOnly ? null : t("pdp.priceOnQuote"))
    : priceDisplayText(display, locale as "en" | "bn");

  return (
    <>
      <div className="crumbs">
        <Link href="/">{t("nav.maison")}</Link>
        {seg && <Link href={`/shop/${seg.id}`}>{segName}</Link>}
        <Link href={`/product/${slug}`}>{name}</Link>
        <span className="current">{t("preorderPage.crumb")}</span>
      </div>
      <section className="pre-stage" aria-labelledby="pre-title">
        <div className="stage-ghost" aria-hidden="true" data-ghost={name} />
        <div className="pre-piece">
          {cutout ? (
            <Image src={cutout.large} width={cutout.width} height={cutout.height} alt="" priority
              className="pre-cut" sizes="(max-width: 760px) 50vw, 30vw" />
          ) : photos[0] ? (
            <Image src={photos[0].url} width={600} height={750} alt="" priority
              className="pre-photo" sizes="(max-width: 760px) 40vw, 24vw" />
          ) : null}
          <div className="stage-kicker"><span>01</span>{t("preorderPage.kicker")}</div>
          <h1 id="pre-title">{name}</h1>
          {priceLine && <p className="pre-price">{priceLine}</p>}
          {product.estimatedDelivery && (
            <p className="pre-when">
              {t("preorder.estimatedDelivery", { when: dhakaOnly
                ? t("pdp.usuallySameDay", { when: localizeEstimate(product.estimatedDelivery, locale as "en" | "bn") })
                : localizeEstimate(product.estimatedDelivery, locale as "en" | "bn") })}
            </p>
          )}
          <p className="pre-intro">{t("preorderPage.intro")}</p>
        </div>
        <div className="pre-card">
          <ProductPreorderForm
            productId={product.id}
            productName={name}
            userEmail={user?.email ?? ""}
            prefill={prefill}
            dhakaOnly={dhakaOnly}
            expressCutoffMin={commerce.expressCutoffMin}
            expressFeeBdt={expressFee?.feeBdt ?? commerce.expressFeeBdt}
            depositPct={effectiveDepositPct(product.preorderDepositPct, commerce.preorderDepositPct)}
            signInHref={`/sign-in?next=/${locale}/preorder/product/${slug}`}
            colors={colors}
            sizes={sizes}
            initialColor={offered(colors, one(query.color))}
            initialSize={offered(sizes, one(query.size))}
          />
        </div>
      </section>
    </>
  );
}
