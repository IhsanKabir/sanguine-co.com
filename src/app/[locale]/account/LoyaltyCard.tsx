"use client";

type Tier = {
  key: string;
  name: string;
  badge: string;
  color: string;
  min: number;
  max: number | null;
  perks: string[];
};

const TIERS: Tier[] = [
  {
    key: "initie",
    name: "Maison Initié",
    badge: "I",
    color: "var(--purple-400)",
    min: 0,
    max: 9999,
    perks: [
      "Free shipping over ৳3,000",
      "Saanguine seasonal newsletter",
      "Member-only sale access",
    ],
  },
  {
    key: "atelier",
    name: "Atelier Guest",
    badge: "AG",
    color: "var(--mauve)",
    min: 10000,
    max: 49999,
    perks: [
      "All Maison Initié perks",
      "Early access to new arrivals",
      "5% birthday discount",
    ],
  },
  {
    key: "patron",
    name: "Patron de Maison",
    badge: "PM",
    color: "var(--gold)",
    min: 50000,
    max: 149999,
    perks: [
      "All Atelier Guest perks",
      "Complimentary gift wrapping",
      "Priority concierge",
      "10% birthday discount",
    ],
  },
  {
    key: "elite",
    name: "Grand Élite",
    badge: "GÉ",
    color: "oklch(0.78 0.15 78)",
    min: 150000,
    max: null,
    perks: [
      "All Patron de Maison perks",
      "Personal styling consultation",
      "Exclusive pre-releases",
      "15% birthday discount",
      "Annual curated gift",
    ],
  },
];

type Props = {
  lifetimeSpend: number;
  locale: "en" | "bn";
};

function getCurrentTier(spend: number): { current: Tier; currentIndex: number } {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (spend >= TIERS[i].min) {
      return { current: TIERS[i], currentIndex: i };
    }
  }
  return { current: TIERS[0], currentIndex: 0 };
}

export default function LoyaltyCard({ lifetimeSpend, locale }: Props) {
  const formatter = new Intl.NumberFormat("en-IN");
  const { current, currentIndex } = getCurrentTier(lifetimeSpend);
  const next = currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;

  const progressPct = (() => {
    if (!next) return 100;
    const span = next.min - current.min;
    const into = lifetimeSpend - current.min;
    return Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  })();

  const remaining = next ? Math.max(0, next.min - lifetimeSpend) : 0;
  const heading = locale === "bn" ? "Membership / Loyalty" : "Membership / Loyalty";

  return (
    <section style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".18em",
            color: "var(--gold-text)",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
            marginBottom: 4,
          }}
        >
          {heading.split(" / ")[0]}
        </div>
        <h2
          className="serif"
          style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}
        >
          {heading.split(" / ")[1] ?? "Loyalty"}
        </h2>
      </div>

      <div
        style={{
          background: "var(--purple-950)",
          color: "var(--cream)",
          padding: 32,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 32,
          alignItems: "flex-start",
          borderRadius: 2,
        }}
      >
        {/* LEFT: Tier badge */}
        <div
          aria-hidden
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${current.color}, color-mix(in oklab, ${current.color} 40%, var(--purple-950)))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--serif)",
            fontSize: 22,
            color: "var(--cream)",
            border: "1px solid color-mix(in oklab, var(--cream) 20%, transparent)",
            boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--cream) 8%, transparent)",
          }}
        >
          {current.badge}
        </div>

        {/* CENTER: Tier name + progress + perks */}
        <div style={{ minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: 22, color: "var(--cream)", marginBottom: 4, fontWeight: 500 }}
          >
            {current.name}
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: ".12em",
              fontFamily: "var(--mono)",
              color: "var(--purple-300)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            ৳{formatter.format(lifetimeSpend)} lifetime
          </div>

          {next ? (
            <>
              <div
                style={{
                  position: "relative",
                  height: 3,
                  background: "color-mix(in oklab, var(--cream) 12%, transparent)",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${progressPct}%`,
                    background: `linear-gradient(to right, ${current.color}, ${next.color})`,
                    borderRadius: 999,
                    transition: "width 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  color: "var(--purple-300)",
                  letterSpacing: ".08em",
                  marginBottom: 18,
                }}
              >
                <span>{progressPct}%</span>
                <span>৳{formatter.format(remaining)} to {next.name}</span>
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                letterSpacing: ".18em",
                fontFamily: "var(--mono)",
                color: "var(--gold)",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              ✦ Pinnacle of the Maison
            </div>
          )}

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {current.perks.map((perk) => (
              <li
                key={perk}
                style={{
                  fontSize: 12,
                  color: "var(--purple-300)",
                  letterSpacing: ".02em",
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: current.color,
                    flexShrink: 0,
                    transform: "translateY(-2px)",
                  }}
                />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: Tier ladder */}
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderLeft: "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
            paddingLeft: 20,
            minWidth: 160,
          }}
          aria-label="Tier ladder"
        >
          {TIERS.map((tier, i) => {
            const achieved = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <li
                key={tier.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: achieved ? "var(--cream)" : "var(--purple-400)",
                  opacity: achieved ? 1 : 0.55,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: isCurrent ? 10 : 8,
                    height: isCurrent ? 10 : 8,
                    borderRadius: "50%",
                    background: achieved ? tier.color : "transparent",
                    border: achieved ? "none" : "1px solid var(--purple-400)",
                    flexShrink: 0,
                    boxShadow: isCurrent
                      ? `0 0 0 3px color-mix(in oklab, ${tier.color} 25%, transparent)`
                      : "none",
                  }}
                />
                {tier.name}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
