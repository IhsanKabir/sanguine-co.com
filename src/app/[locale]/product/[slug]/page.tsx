import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getProductBySlug, getSegmentBySlug, getRelatedProducts, getProductImages, getProductSalesVelocity, getHeroImagesFor, getProductsByIds } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import { formatBdt } from "@/lib/utils";
import Icon from "@/components/storefront/Icon";
import ProductCard from "@/components/storefront/ProductCard";
import PdpActionsClient from "@/components/storefront/PdpActionsClient";
import PdpGallery from "@/components/storefront/PdpGallery";
import { PdpStateProvider } from "@/components/storefront/PdpStateContext";
import JsonLd from "@/components/seo/JsonLd";
import ReviewsSection from "@/components/storefront/ReviewsSection";
import NotifyMeButton from "@/components/storefront/NotifyMeButton";
import PreorderButton from "@/components/storefront/PreorderButton";
import RecentlyViewedTracker from "@/components/storefront/RecentlyViewedTracker";
import RecentlyViewedStrip from "@/components/storefront/RecentlyViewedStrip";
import ProductViewTracker from "@/components/storefront/ProductViewTracker";
import { listApprovedReviews } from "@/lib/actions/reviews";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, schema } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { SITE_URL as BASE } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug).catch(() => null);
  if (!p) return { title: "Not found" };
  const photos = await getProductImages(p.id).catch(() => []);
  const isBn = locale === "bn";
  const name = (isBn && p.nameBn) || p.name;
  const description = (isBn && p.descriptionBn) || p.description || "A piece from the maison.";
  const url = `${BASE}/${locale}/product/${slug}`;
  // Branded 1200×630 card from /api/og — it overlays the first product photo
  // when one exists and falls back to the maison card when none does, so
  // every PDP gets a real share preview (most products have no photography
  // yet). The raw photo stays as a secondary og:image for scrapers that
  // prefer a plain product shot.
  const ogCard = `${BASE}/api/og?slug=${encodeURIComponent(slug)}`;
  const photo = photos[0]?.url;
  const ogImages = [
    { url: ogCard, width: 1200, height: 630, alt: name },
    ...(photo ? [{ url: photo, alt: name }] : []),
  ];
  return {
    title: name,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/product/${slug}`,
        "bn-BD": `${BASE}/bn/product/${slug}`,
        "x-default": `${BASE}/en/product/${slug}`,
      },
    },
    openGraph: {
      title: name,
      description,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      images: ogImages,
    },
    // Facebook / LinkedIn / Pinterest render product cards with price +
    // availability when og:type is "product". Next.js's Metadata type
    // doesn't list "product" as an enum value, so we override the meta
    // tag through `other`. The `type: "website"` above only seeds defaults
    // — when both are present, the explicit `og:type` wins in the head.
    other: {
      "og:type": "product",
      "product:price:amount": String(p.priceBdt),
      "product:price:currency": "BDT",
      "product:availability": p.stock > 0 ? "in stock" : "out of stock",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [ogCard],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const p = await getProductBySlug(slug).catch(() => null);
  if (!p) notFound();
  const seg = p.segmentId ? await getSegmentBySlug(p.segmentId).catch(() => null) : null;
  const lookIds = (p.lookProductIds as string[] | null) ?? [];
  const [related, photos, approvedReviews, currentUser, lookItems, velocity] = await Promise.all([
    p.segmentId ? getRelatedProducts(p.id, p.segmentId).catch(() => []) : Promise.resolve([]),
    getProductImages(p.id).catch(() => []),
    listApprovedReviews(p.id).catch(() => []),
    getCurrentUser().catch(() => null),
    lookIds.length > 0 ? getProductsByIds(lookIds).catch(() => []) : Promise.resolve([]),
    getProductSalesVelocity(p.id).catch(() => 0),
  ]);
  const lookHeroImages = lookItems.length > 0
    ? await getHeroImagesFor(lookItems.map((i) => i.id)).catch(() => new Map())
    : new Map();

  // Eligibility for writing a review: signed-in customer with a delivered order
  // of this product, who has not already written one.
  let canWriteReview = false;
  let signedInButIneligible = false;
  if (currentUser) {
    const eligible = await db.execute<{ id: string }>(sql`
      select ${schema.orders.id} as id
      from ${schema.orders}
      join ${schema.orderLines} on ${schema.orderLines.orderId} = ${schema.orders.id}
      where ${schema.orders.customerId} = ${currentUser.id}
        and ${schema.orders.status} = 'delivered'
        and ${schema.orderLines.productId} = ${p.id}
      limit 1
    `).catch(() => []);
    const alreadyReviewed = await db.select({ id: schema.reviews.id }).from(schema.reviews)
      .where(and(eq(schema.reviews.customerId, currentUser.id), eq(schema.reviews.productId, p.id)))
      .limit(1).catch(() => []);
    canWriteReview = eligible.length > 0 && alreadyReviewed.length === 0;
    signedInButIneligible = !canWriteReview;
  }

  const isBn = locale === "bn";
  const name = (isBn && p.nameBn) || p.name;
  const description = (isBn && p.descriptionBn) || p.description || "";
  const segName = seg ? ((isBn && seg.nameBn) || seg.name) : "";
  const segTag = seg ? ((isBn && seg.tagBn) || seg.tag) : "";

  // Product schema with full Offer (shipping + returns) so Google Shopping
  // can render shipping cost and return-policy snippets in rich results.
  // shippingDetails is the standard for Bangladesh COD-only logistics:
  // — Pathao Courier, 5–7 day standard, ৳80 inside Dhaka / ৳150 outside.
  // hasMerchantReturnPolicy follows our /legal/returns: 7-day window,
  // courier-arranged pickup, BDT refund.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.sku,
    description,
    image: photos.length > 0 ? photos.map((ph) => ph.url) : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: p.priceBdt,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${BASE}/${locale}/product/${p.slug}`,
      seller: { "@type": "Organization", name: "Saanguine Maison" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 80,
          currency: "BDT",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BD",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    aggregateRating: p.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: Number(p.rating),
      reviewCount: p.reviewCount,
    } : undefined,
    brand: { "@type": "Brand", name: "Saanguine" },
  };

  const crumbItems: Record<string, unknown>[] = [
    { "@type": "ListItem", position: 1, name: "Maison", item: `${BASE}/${locale}` },
  ];
  if (seg) {
    crumbItems.push({ "@type": "ListItem", position: 2, name: segName, item: `${BASE}/${locale}/shop/${seg.id}` });
  }
  // Google's BreadcrumbList validator requires the leaf item to carry an
  // `item` URL too, even though it's the page the user is already on. Without
  // it the rich result is silently dropped.
  crumbItems.push({
    "@type": "ListItem",
    position: crumbItems.length + 1,
    name,
    item: `${BASE}/${locale}/product/${p.slug}`,
  });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbItems,
  };

  return (
    <>
      <JsonLd data={[productLd, breadcrumbLd]} />
      <RecentlyViewedTracker productId={p.id} />
      <ProductViewTracker productId={p.id} path={`/product/${p.slug}`} />
      <div className="crumbs">
        <Link href="/">Maison</Link>
        {seg && (
          <Link href={`/shop/${seg.id}`}>
            {segName}
          </Link>
        )}
        <span className="current">{name}</span>
      </div>
      <PdpStateProvider>
      <section className="pdp" data-cursor="loupe">
        <PdpGallery
          photos={photos.map((ph) => ({ url: ph.url, alt: ph.alt }))}
          fallback={{
            cat: p.segmentId || "clothing",
            sku: p.sku,
            name: p.name,
            tag: p.tag,
          }}
        />
        <div className="pdp-info">
          <div className="collection">{(segTag || "").toUpperCase()} · {p.sku}</div>
          <h1>{name}</h1>
          <div className="pdp-rating">
            <span className="stars">{"★★★★★".slice(0, Math.round(Number(p.rating)))}{"☆☆☆☆☆".slice(0, 5 - Math.round(Number(p.rating)))}</span>
            <span>{Number(p.rating).toFixed(1)}</span>
            <span>·</span>
            <span>{p.reviewCount} {p.reviewCount === 1 ? t("pdp.review") : t("pdp.reviews")}</span>
          </div>
          {velocity > 10 && (
            <div className="pdp-velocity">{velocity}+ ordered in the past 30 days</div>
          )}
          <div className="pdp-price">
            <span className="now">{formatBdt(p.priceBdt, locale as "en" | "bn")}</span>
            {p.wasBdt && <span className="was">{formatBdt(p.wasBdt, locale as "en" | "bn")}</span>}
            {p.wasBdt && (
              <span className="save">
                Save {Math.round((1 - p.priceBdt / p.wasBdt) * 100)}%
              </span>
            )}
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.7, marginBottom: p.modelNote ? 12 : 24 }}>
            {description}
          </div>
          {p.modelNote && (
            <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", marginBottom: 24 }}>
              {p.modelNote}
            </div>
          )}
          {p.preorderOnly ? (
            <PreorderButton
              slug={p.slug}
              estimatedDelivery={p.estimatedDelivery}
              preorderPriceBdt={p.preorderPriceBdt}
              priceBdt={p.priceBdt}
              locale={locale}
            />
          ) : p.stock > 0 ? (
            <>
              <PdpActionsClient
                product={{
                  productId: p.id,
                  slug: p.slug,
                  sku: p.sku,
                  name,
                  priceBdt: p.priceBdt,
                  cat: p.segmentId || "clothing",
                }}
                colors={(p.colors as string[] | null) || []}
                sizes={(p.sizes as string[] | null) || []}
              />
              {p.preorderEnabled && (
                <PreorderButton
                  slug={p.slug}
                  estimatedDelivery={p.estimatedDelivery}
                  preorderPriceBdt={p.preorderPriceBdt}
                  priceBdt={p.priceBdt}
                  locale={locale}
                  variant="secondary"
                />
              )}
            </>
          ) : p.preorderEnabled ? (
            <PreorderButton
              slug={p.slug}
              estimatedDelivery={p.estimatedDelivery}
              preorderPriceBdt={p.preorderPriceBdt}
              priceBdt={p.priceBdt}
              locale={locale}
            />
          ) : (
            <NotifyMeButton
              productId={p.id}
              productName={name}
              defaultEmail={currentUser?.email ?? ""}
            />
          )}

          {/* Scarcity signal — only when stock is genuinely low */}
          {p.stock > 0 && p.stock <= 5 && (
            <div className="pdp-scarcity">
              <span className="pdp-scarcity__dot" />
              Only {p.stock} left — order soon
            </div>
          )}
          {p.stock > 5 && p.stock < 10 && (
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
              {t("pdp.remaining", { count: p.stock })}
            </div>
          )}
          {p.stock === 0 && !p.preorderEnabled && (
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>Currently out of stock</div>
          )}
          {p.stock === 0 && p.preorderEnabled && (
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>Out of stock — preorder available</div>
          )}
          {p.preorderOnly && (
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>Available by preorder only</div>
          )}

          {/* Shipping estimate */}
          <div className="pdp-shipping-note">
            <Icon name="arrow" size={13} />
            Free delivery on orders over ৳3,000 · Standard ৳80–150
          </div>

          <div className="pdp-feats">
            <div className="pdp-feat"><Icon name="check" size={18} /><div><b>7-day returns</b> Free courier pickup within 7 days of delivery</div></div>
            <div className="pdp-feat"><Icon name="check" size={18} /><div><b>{t("pdp.codTitle")}</b>{t("pdp.codNote")}</div></div>
            <div className="pdp-feat"><Icon name="check" size={18} /><div><b>{t("pdp.authentic")}</b>{t("pdp.authenticNote")}</div></div>
            <div className="pdp-feat"><Icon name="feather" size={18} /><div><b>{t("pdp.giftService")}</b>{t("pdp.giftServiceNote")}</div></div>
          </div>
          {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello, I'm interested in ${name} — ${BASE}/${locale}/product/${p.slug}`)}`}
              style={{ display: "inline-block", fontSize: 12, color: "var(--ink-soft)", marginTop: 14, textDecoration: "none" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Questions about this piece? Chat on WhatsApp →
            </a>
          )}
        </div>
      </section>
      </PdpStateProvider>
      <ReviewsSection
        productId={p.id}
        reviews={approvedReviews}
        canWrite={canWriteReview}
        signedInButIneligible={signedInButIneligible}
        signInHref={`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/product/${p.slug}`)}`}
      />
      {lookItems.length > 0 && (
        <section className="section">
          <div className="section-hd">
            <div>
              <div className="kicker">STYLE IT WITH</div>
              <h2>Complete the look</h2>
            </div>
          </div>
          <div className="grid grid-4">
            {lookItems.map((item) => (
              <ProductCard key={item.id} product={item} segmentTag="" heroImage={lookHeroImages.get(item.id) ?? null} quickView={false} />
            ))}
          </div>
        </section>
      )}
      <RecentlyViewedStrip excludeId={p.id} />
      {related.length > 0 && (
        <section className="section">
          <div className="section-hd">
            <div>
              <div className="kicker">{t("pdp.alsoLike")}</div>
              <h2>{t("pdp.fromSameHouse")}</h2>
            </div>
          </div>
          <div className="grid grid-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} segmentTag={segTag} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
