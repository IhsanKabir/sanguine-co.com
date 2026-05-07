import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-utils";
import { db, schema } from "@/lib/db";
import { eq, desc, or, count } from "drizzle-orm";
import { formatBdt } from "@/lib/utils";
import { listMyAddresses } from "@/lib/actions/addresses";
import { ensureReferralCode } from "@/lib/actions/profile";
import AddressBook from "./AddressBook";
import ProfileEditor from "./ProfileEditor";
import AccountOrders from "./AccountOrders";
import LoyaltyCard from "./LoyaltyCard";
import StylePreferences from "./StylePreferences";
import NotificationPrefs from "./NotificationPrefs";
import ReferralCard from "./ReferralCard";
import RecentlyViewedStrip from "@/components/storefront/RecentlyViewedStrip";
import EmailVerificationBanner from "./EmailVerificationBanner";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

// ─── Loyalty tiers (mirrored from LoyaltyCard for header badge) ──────────────
const TIER_NAMES = [
  { min: 0,       name: "Maison Initié",     color: "var(--purple-400)" },
  { min: 10_000,  name: "Atelier Guest",      color: "var(--mauve)" },
  { min: 50_000,  name: "Patron de Maison",   color: "var(--gold)" },
  { min: 150_000, name: "Grand Élite",         color: "oklch(0.78 0.15 78)" },
];

function getTierName(spend: number) {
  for (let i = TIER_NAMES.length - 1; i >= 0; i--) {
    if (spend >= TIER_NAMES[i].min) return TIER_NAMES[i];
  }
  return TIER_NAMES[0];
}

function monogram(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  const loc = locale as "en" | "bn";

  // ── Data fetching with explicit error isolation ──────────────────────────
  type OrderSelect = typeof schema.orders.$inferSelect;
  type AddressSelect = typeof schema.addresses.$inferSelect;

  let orders: OrderSelect[] = [];
  let addresses: AddressSelect[] = [];
  let profileRows: (typeof schema.customerProfiles.$inferSelect)[] = [];
  let wishlistTotal = 0;

  try {
    orders = await db.select()
      .from(schema.orders)
      .where(or(
        eq(schema.orders.guestEmail, user.email ?? ""),
        eq(schema.orders.customerId, user.id as unknown as string),
      ))
      .orderBy(desc(schema.orders.createdAt))
      .limit(30);
  } catch (e) { console.error("[account] orders query failed:", e); }

  try {
    addresses = await listMyAddresses();
  } catch (e) { console.error("[account] addresses query failed:", e); }

  try {
    profileRows = await db.select()
      .from(schema.customerProfiles)
      .where(eq(schema.customerProfiles.id, user.id));
  } catch (e) { console.error("[account] customerProfiles query failed:", e); }

  try {
    const rows = await db.select({ total: count() })
      .from(schema.wishlists)
      .where(eq(schema.wishlists.customerId, user.id as unknown as string));
    wishlistTotal = Number(rows[0]?.total ?? 0);
  } catch (e) { console.error("[account] wishlists query failed:", e); }

  const profile = profileRows[0] ?? null;
  const lifetimeSpend = orders.reduce((s, o) => s + o.totalBdt, 0);
  const wishlistCount = wishlistTotal;
  const initials = monogram(profile?.fullName, user.email ?? "");
  const memberYear = user.created_at
    ? new Date(user.created_at).getFullYear()
    : new Date().getFullYear();
  const displayName = profile?.fullName || user.email || "Guest";
  const tier = getTierName(lifetimeSpend);

  // Ensure referral code exists (generates + saves on first visit)
  let referralCode: string | null = null;
  try {
    referralCode = await ensureReferralCode();
  } catch (e) { console.error("[account] ensureReferralCode failed:", e); }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 32px 80px" }}>

      {/* ─── Email verification banner ──────────────────────────────────── */}
      {!user.email_confirmed_at && user.email && (
        <EmailVerificationBanner email={user.email} />
      )}

      {/* ─── Profile header ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 24, padding: "32px 36px",
        background: "var(--purple-950)", borderRadius: 2, marginBottom: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, var(--mauve), var(--purple-800))",
            border: "1.5px solid oklch(0.85 0.13 85 / 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--serif)", fontSize: 22, color: "var(--cream)", fontWeight: 500,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--cream)", fontWeight: 500, lineHeight: 1.1 }}>
              {displayName}
            </div>
            {profile?.fullName && (
              <div style={{ fontSize: 12, color: "var(--purple-400)", marginTop: 3 }}>
                {user.email}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{
                background: "oklch(0.62 0.12 300 / 0.2)", border: `1px solid ${tier.color}`,
                color: tier.color, fontSize: 9, fontFamily: "var(--mono)",
                letterSpacing: ".2em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 2,
              }}>
                {tier.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--purple-400)", fontFamily: "var(--mono)" }}>
                since {memberYear}
              </span>
            </div>
          </div>
        </div>

        <SignOutButton />
      </div>

      {/* ─── Stats strip ────────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 2, marginBottom: 48, background: "var(--line)",
      }}>
        {[
          { k: "Orders placed",   v: String(orders.length) },
          { k: "Lifetime spend",  v: lifetimeSpend > 0 ? formatBdt(lifetimeSpend, loc) : "—" },
          { k: "Loyalty tier",    v: tier.name },
          { k: "Wishlist",        v: wishlistCount > 0 ? `${wishlistCount} piece${wishlistCount !== 1 ? "s" : ""}` : "Empty" },
        ].map(({ k, v }) => (
          <div key={k} style={{ background: "var(--cream)", padding: "22px 28px" }}>
            <div style={{
              fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase",
              color: "var(--ink-soft)", marginBottom: 6, fontFamily: "var(--mono)",
            }}>{k}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--purple-900)", fontWeight: 500 }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Orders ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontSize: 10, letterSpacing: ".18em", color: "var(--gold-text)",
              textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 4,
            }}>Order history</div>
            <h2 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
              Orders
            </h2>
          </div>
          <Link
            href="/wishlist"
            style={{
              fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
              color: "var(--purple-800)", borderBottom: "1px solid var(--gold)", paddingBottom: 2,
            }}
          >
            View wishlist →
          </Link>
        </div>

        <AccountOrders
          orders={orders.map((o) => ({
            id: o.id,
            number: o.number,
            status: o.status,
            totalBdt: o.totalBdt,
            createdAt: o.createdAt?.toISOString() ?? null,
            shippingCourier: o.shippingCourier ?? null,
            shippingTracking: o.shippingTracking ?? null,
          }))}
          locale={loc}
        />
      </section>

      {/* ─── Loyalty ─────────────────────────────────────────────────────── */}
      <LoyaltyCard lifetimeSpend={lifetimeSpend} locale={loc} />

      {/* ─── Profile editor ─────────────────────────────────────────────── */}
      <ProfileEditor
        initialName={profile?.fullName ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialMarketing={profile?.acceptsMarketing ?? false}
        initialBirthday={profile?.birthday ?? ""}
        initialAnniversary={profile?.anniversary ?? ""}
      />

      {/* ─── Style preferences ──────────────────────────────────────────── */}
      <StylePreferences
        initial={{
          perfumeFamily: profile?.perfumeFamily ?? null,
          bookGenre: profile?.bookGenre ?? null,
          flowerPreference: profile?.flowerPreference ?? null,
        }}
      />

      {/* ─── Notification preferences ───────────────────────────────────── */}
      <NotificationPrefs
        initialEmail={profile?.notifyEmail ?? true}
        initialSms={profile?.notifySms ?? false}
      />

      {/* ─── Referral ───────────────────────────────────────────────────── */}
      {referralCode && (
        <ReferralCard code={referralCode} locale={loc} />
      )}

      {/* ─── Address book ───────────────────────────────────────────────── */}
      <AddressBook
        addresses={addresses}
        profileName={profile?.fullName ?? ""}
        profilePhone={profile?.phone ?? ""}
      />

      {/* ─── Recently viewed ────────────────────────────────────────────── */}
      <div style={{ marginTop: 56, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--gold-text)", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 4 }}>
            Your browsing
          </div>
          <h2 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
            Recently Viewed
          </h2>
        </div>
        <RecentlyViewedStrip />
      </div>

    </div>
  );
}
