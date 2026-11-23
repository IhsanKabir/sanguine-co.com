"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setPersonalExpressFee } from "@/lib/actions/express-fees";
import type { ExpressOverrides } from "@/lib/express-fee-store";
import { formatBdt } from "@/lib/utils";

type Mode = "rules" | "free" | "custom";

const modeOf = (fee: number | null): Mode => (fee === null ? "rules" : fee === 0 ? "free" : "custom");
const describe = (fee: number | null, standard: number) =>
  fee === null ? `Follows the rules (standard ${formatBdt(standard)})` : fee === 0 ? "Free" : formatBdt(fee);

/** The three choices and the amount box, shared by both editors below. */
function FeeChoice({ id, mode, amount, onMode, onAmount, allowRules = true }: {
  id: string; mode: Mode; amount: string; onMode: (m: Mode) => void; onAmount: (v: string) => void;
  /** Adding someone to the list: "follow the rules" would mean not adding them, so it is left out. */
  allowRules?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Same-day express fee" style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "center" }}>
      {([["rules", "Follow the rules"], ["free", "Free"], ["custom", "Own fee"]] as const).filter(([m]) => allowRules || m !== "rules").map(([m, label]) => (
        <label key={m} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
          <input type="radio" name={`${id}-mode`} checked={mode === m} onChange={() => onMode(m)} />
          {label}
        </label>
      ))}
      {mode === "custom" && (
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          ৳ <input type="number" min={0} step={10} value={amount} onChange={(e) => onAmount(e.target.value)}
            aria-label="Own fee in taka" style={{ width: 100 }} />
        </label>
      )}
    </div>
  );
}

const toFee = (mode: Mode, amount: string): number | null | "bad" => {
  if (mode === "rules") return null;
  if (mode === "free") return 0;
  const n = Number(amount);
  return Number.isInteger(n) && n >= 0 ? n : "bad";
};

/**
 * One customer's same-day express fee (Admin, Customers, a customer's page): follow the rules
 * in Settings, free, or their own fee (higher or lower). Their own setting always wins.
 */
export function CustomerExpressFee({ email, initialFee, standardFee }: { email: string; initialFee: number | null; standardFee: number }) {
  const [saved, setSaved] = useState(initialFee);
  const [mode, setMode] = useState<Mode>(modeOf(initialFee));
  const [amount, setAmount] = useState(initialFee && initialFee > 0 ? String(initialFee) : String(standardFee));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    const fee = toFee(mode, amount);
    if (fee === "bad") { setMsg("Enter a whole number of taka."); return; }
    start(async () => {
      const res = await setPersonalExpressFee({ email, feeBdt: fee });
      if (res.ok) { setSaved(fee); setMsg(`Saved: ${describe(fee, standardFee)}. Their next request uses it.`); }
      else setMsg(res.error);
    });
  };

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <h3>Same-day express for this customer</h3>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.6 }}>
        Now: <b>{describe(saved, standardFee)}</b>. Their own setting always wins over the rules in{" "}
        <Link href="/admin/settings#express" style={{ color: "var(--purple-800)", borderBottom: "1px solid var(--gold)" }}>Settings</Link>.
        Requests already made keep the fee they were made with.
      </p>
      <FeeChoice id="customer-express" mode={mode} amount={amount} onMode={setMode} onAmount={setAmount} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {msg && <span role="status" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{msg}</span>}
      </div>
    </div>
  );
}

/**
 * Everyone with their own express fee (Admin, Settings, Same-day express), and a way to add
 * anyone by email: also customers with no order yet, who have no page in Customers.
 */
export function PersonalExpressFees({ initial, standardFee }: { initial: ExpressOverrides; standardFee: number }) {
  const [list, setList] = useState(initial);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("free");
  const [amount, setAmount] = useState(String(standardFee));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (target: string, fee: number | null) => start(async () => {
    const res = await setPersonalExpressFee({ email: target, feeBdt: fee });
    if (res.ok) { setList(res.overrides); setMsg(fee === null ? `Removed: ${target} follows the rules again.` : `Saved: ${target}, ${describe(fee, standardFee)}.`); }
    else setMsg(res.error);
  });

  const add = () => {
    const fee = toFee(mode, amount);
    if (fee === "bad" || fee === null) { setMsg("Choose Free or an own fee in whole taka."); return; }
    if (!email.includes("@")) { setMsg("Enter the customer's email."); return; }
    save(email.trim().toLowerCase(), fee);
    setEmail("");
  };

  const entries = Object.entries(list).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: ".06em" }}>Customers with their own fee ({entries.length})</h4>
      {entries.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px" }}>None yet. Everyone follows the rules above.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, fontSize: 13 }}>
          {entries.map(([who, fee]) => (
            <li key={who} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <Link href={`/admin/customers/${encodeURIComponent(who)}`} style={{ color: "var(--purple-900)" }}>{who}</Link>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <b>{describe(fee, standardFee)}</b>
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => save(who, null)}
                  aria-label={`Remove the own fee for ${who}`}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="field">
        <label htmlFor="personal-express-email">Add a customer by email</label>
        <input id="personal-express-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </div>
      <div style={{ marginTop: 8 }}>
        <FeeChoice id="personal-express-add" mode={mode} amount={amount} onMode={setMode} onAmount={setAmount} allowRules={false} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={add} disabled={pending}>{pending ? "Saving…" : "Add"}</button>
        {msg && <span role="status" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{msg}</span>}
      </div>
    </div>
  );
}
