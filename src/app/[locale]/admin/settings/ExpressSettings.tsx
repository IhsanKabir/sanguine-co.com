"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { updateCommerceSettings } from "@/lib/actions/admin";
import type { CommerceSettings } from "@/lib/commerce";
import {
  EXPRESS_CUTOFF_EARLIEST_MIN, EXPRESS_CUTOFF_LATEST_MIN, EXPRESS_CUTOFF_STEP_MIN, MAX_EXPRESS_FEE_BDT, expressCutoffLabel,
} from "@/lib/delivery";
import { TIERS, type TierName } from "@/lib/loyalty";
import { formatBdt } from "@/lib/utils";
import type { ExpressOverrides } from "@/lib/express-fee-store";
import { PersonalExpressFees } from "../customers/ExpressFeeEditor";

const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const ORDER_CHOICES = [2, 3, 4, 5, 6, 8, 10];
const ordinal = (n: number) => `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/**
 * Admin, Settings, Same-day express: the last order time, the fee, and when it is free (every
 * order from the Nth, a loyalty tier and above). One customer's own fee is set on their page
 * in Customers, and always wins over these rules (lib/express-fee.ts).
 */
export default function ExpressSettings({ initial, personal }: { initial: CommerceSettings; personal: ExpressOverrides | null }) {
  const [cutoff, setCutoff] = useState(toTime(initial.expressCutoffMin));
  const [fee, setFee] = useState(String(initial.expressFeeBdt));
  const [fromOrder, setFromOrder] = useState<string>(initial.expressFreeFromOrder ? String(initial.expressFreeFromOrder) : "");
  const [tier, setTier] = useState<string>(initial.expressFreeTier ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    const [h, m] = cutoff.split(":").map(Number);
    const min = h * 60 + m;
    if (!Number.isInteger(min) || min < EXPRESS_CUTOFF_EARLIEST_MIN || min > EXPRESS_CUTOFF_LATEST_MIN || min % EXPRESS_CUTOFF_STEP_MIN !== 0) {
      setMsg(`Choose a time between ${toTime(EXPRESS_CUTOFF_EARLIEST_MIN)} and ${toTime(EXPRESS_CUTOFF_LATEST_MIN)}, on the quarter hour.`);
      return;
    }
    const feeBdt = Number(fee);
    if (!Number.isInteger(feeBdt) || feeBdt < 0 || feeBdt > MAX_EXPRESS_FEE_BDT) {
      setMsg(`The fee must be a whole number of taka, 0 to ${MAX_EXPRESS_FEE_BDT.toLocaleString("en")}.`);
      return;
    }
    setMsg(null);
    start(async () => {
      const res = await updateCommerceSettings({
        expressCutoffMin: min,
        expressFeeBdt: feeBdt,
        expressFreeFromOrder: fromOrder ? Number(fromOrder) : null,
        expressFreeTier: (tier || null) as TierName | null,
      });
      setMsg(res.ok ? `Saved: ${formatBdt(feeBdt)}, order by ${expressCutoffLabel("en", min)}. New requests use it at once.` : "Save failed.");
    });
  };

  const summary = [
    fromOrder ? `free from a customer's ${ordinal(Number(fromOrder))} order` : null,
    tier ? `free for ${tier}${tier === TIERS[TIERS.length - 1].name ? "" : " and above"}` : null,
  ].filter(Boolean);

  return (
    <div className="panel" id="express">
      <h3>Same-day express</h3>
      <div className="row">
        <div className="field">
          <label htmlFor="express-fee">Fee (৳)</label>
          <input id="express-fee" type="number" min={0} max={MAX_EXPRESS_FEE_BDT} step={10} value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="express-cutoff">Last order time (Dhaka)</label>
          <input id="express-cutoff" type="time" step={EXPRESS_CUTOFF_STEP_MIN * 60} min={toTime(EXPRESS_CUTOFF_EARLIEST_MIN)} max={toTime(EXPRESS_CUTOFF_LATEST_MIN)} value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="express-from-order">Free from a customer&apos;s</label>
          <select id="express-from-order" value={fromOrder} onChange={(e) => setFromOrder(e.target.value)}>
            <option value="">Never (off)</option>
            {ORDER_CHOICES.map((n) => <option key={n} value={n}>{ordinal(n)} order on</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="express-tier">Free for loyalty tier</label>
          <select id="express-tier" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">No tier (off)</option>
            {TIERS.slice(1).map((t) => (
              <option key={t.name} value={t.name}>{t.name} ({formatBdt(t.min)}+ spent){t === TIERS[TIERS.length - 1] ? "" : " and above"}</option>
            ))}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
        {summary.length > 0 ? <>Express is <b>{summary.join(", or ")}</b>; everyone else pays the fee. </> : "Everyone pays the fee. "}
        One customer&apos;s own fee (free, lower or higher) is set on their page in{" "}
        <Link href="/admin/customers" style={{ color: "var(--purple-800)", borderBottom: "1px solid var(--gold)" }}>Customers</Link>,
        and always wins over these rules. Orders that were cancelled, refunded or never paid do not count.
        The site, the order form and the FAQ follow these settings; videos and captions already posted do not.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {msg && <span role="status" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{msg}</span>}
      </div>
      {personal && <PersonalExpressFees initial={personal} standardFee={initial.expressFeeBdt} />}
    </div>
  );
}
