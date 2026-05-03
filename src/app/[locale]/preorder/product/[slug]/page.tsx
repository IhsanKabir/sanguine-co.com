import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { getProductImages } from "@/lib/queries";
import { formatBdt } from "@/lib/utils";
import ProductPreorderForm from "./ProductPreorderForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ProductPreorderPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [product] = await db.select().from(schema.products)
    .where(eq(schema.products.slug, slug)).limit(1);

  if (!product || !product.preorderEnabled) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=/${locale}/preorder/product/${slug}`);
  }

  const seg = product.segmentId
    ? await db.select().from(schema.segments).where(eq(schema.segments.id, product.segmentId)).limit(1).then((r) => r[0] ?? null)
    : null;

  const photos = await getProductImages(product.id).catch(() => []);

  const isBn = locale === "bn";
  const name = (isBn && product.nameBn) || product.name;
  const segName = seg ? ((isBn && seg.nameBn) || seg.name) : "";

  const displayPrice = product.preorderPriceBdt ?? product.priceBdt;
  const hasDifferentPrice = product.preorderPriceBdt && product.preorderPriceBdt !== product.priceBdt;

  return (
    <>
      <div className="crumbs">
        <Link href="/">Maison</Link>
        {seg && <Link href={`/shop/${seg.id}`}>{segName}</Link>}
        <Link href={`/product/${slug}`}>{name}</Link>
        <span className="current">Preorder</span>
      </div>
      <section className="section" style={{ paddingTop: 28, maxWidth: 880 }}>
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: photos[0] ? "120px 1fr" : "1fr", gap: 28, alignItems: "center" }}>
          {photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={name} style={{ width: 120, height: 160, objectFit: "cover" }} />
          )}
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>
              PREORDER
            </div>
            <h1 className="serif" style={{ fontSize: 40, margin: "0 0 10px", color: "var(--purple-900)", fontWeight: 400, lineHeight: 1.05 }}>
              {name}
            </h1>
            <div style={{ fontSize: 20, fontWeight: 500, color: "var(--purple-900)", marginBottom: 6 }}>
              {formatBdt(displayPrice, locale as "en" | "bn")}
              {hasDifferentPrice && (
                <span style={{ fontSize: 13, color: "var(--ink-soft)", marginLeft: 10, fontWeight: 400 }}>
                  preorder price · regular {formatBdt(product.priceBdt, locale as "en" | "bn")}
                </span>
              )}
            </div>
            {product.estimatedDelivery && (
              <div style={{ fontSize: 13, color: "var(--gold-deep)" }}>
                Estimated delivery · {product.estimatedDelivery}
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 32, maxWidth: 620 }}>
          Fill in the details below and the maison will confirm your preorder by email within a day or two.
          A prepayment via bKash will be arranged to secure the piece.
        </p>

        <ProductPreorderForm
          productId={product.id}
          productName={name}
          userId={user.id}
          userEmail={user.email ?? ""}
          colors={(product.colors as string[] | null) || []}
          sizes={(product.sizes as string[] | null) || []}
        />
      </section>
    </>
  );
}
