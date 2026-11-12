"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { CustomerPrefill } from "@/lib/customer-prefill";
import { readRememberedContact, rememberContact } from "@/lib/remembered-contact";
import { useLocale, useTranslations } from "next-intl";
import { colorLabel, sizeLabel } from "@/lib/option-labels";
import { Link } from "@/i18n/routing";
import DeliveryOptionsFields from "@/components/storefront/DeliveryOptionsFields";
import { createProductPreorderRequest } from "@/lib/actions/preorders";

type Props = {
  productId: string;
  productName: string;
  /** Empty for a guest, who types an email for the quote instead. */
  userEmail: string;
  /** Saved details of a signed-in customer; empty strings for a guest. */
  prefill: CustomerPrefill;
  signInHref: string;
  colors: string[];
  sizes: string[];
};

export default function ProductPreorderForm({
  productName,
  productId,
  userEmail,
  prefill,
  signInHref,
  colors,
  sizes,
}: Props) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const [name, setName] = useState(prefill.fullName);
  const [phone, setPhone] = useState(prefill.phone);
  const [guestEmail, setGuestEmail] = useState("");
  // Honeypot: hidden from people, so only scripts ever fill it in.
  const [trap, setTrap] = useState("");
  const isGuest = !userEmail;
  const contactEmail = userEmail || guestEmail.trim();
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState(sizes[0] ?? "");
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [line1, setLine1] = useState(prefill.line1);
  const [area, setArea] = useState(prefill.area);
  const [city, setCity] = useState(prefill.city);
  const [postcode, setPostcode] = useState(prefill.postcode);

  // Details this browser used last time fill whatever is still empty. Read
  // after mount: the server cannot see them, and saved details win.
  useEffect(() => {
    const saved = readRememberedContact();
    setName((v) => v || saved.name || "");
    setPhone((v) => v || saved.phone || "");
    setGuestEmail((v) => v || saved.email || "");
    setLine1((v) => v || saved.line1 || "");
    setArea((v) => v || saved.area || "");
    setPostcode((v) => v || saved.postcode || "");
    if (!prefill.line1 && saved.city) setCity(saved.city);
  }, [prefill.line1]);

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createProductPreorderRequest({
          productId,
          quantity: Math.max(1, Math.min(50, quantity)),
          color: colors.length > 0 ? color || null : null,
          size: sizes.length > 0 ? size || null : null,
          notes: notes.trim() || null,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: isGuest ? guestEmail.trim() : null,
          trap,
          targetDate: deliveryDate || null,
          giftMessage: giftMessage.trim() || null,
          deliveryAddress: line1.trim()
            ? { line1: line1.trim(), area: area.trim() || null, city: city.trim(), postcode: postcode.trim() || null }
            : null,
        });
        if (result.ok) {
          rememberContact({ name, phone, email: guestEmail, line1, area, city, postcode });
          setDone(true);
        } else setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.genericError"));
      }
    });
  };

  if (done) {
    return (
      <div style={{ padding: 32, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
        <h2 className="serif" style={{ fontSize: 32, color: "var(--purple-900)", margin: 0 }}>{t("preorderForm.doneTitle")}</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, margin: "12px 0 0" }}>
          {t.rich("preorderForm.doneBody", { product: productName, email: contactEmail, em: (c) => <em>{c}</em>, b: (c) => <b>{c}</b> })}
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>{t("preorderForm.doneNote")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this field empty
          <input name="ssg_trap" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <div className="field">
          <label>{t("preorderForm.yourName")}</label>
          <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} placeholder={t("preorderForm.namePlaceholder")} />
        </div>
        <div className="field">
          <label>{t("preorderForm.phoneWhatsApp")}</label>
          <input type="tel" name="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={6} maxLength={40} placeholder="01XXXXXXXXX" />
        </div>
      </div>

      {isGuest && (
        <div className="field">
          <label>{t("common.email")}</label>
          <input
            type="email"
            name="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            required
            maxLength={200}
            autoComplete="email"
            placeholder={t("common.emailPlaceholder")}
          />
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
            {t.rich("preorderForm.guestEmailNote", {
              a: (c) => <Link href={signInHref} style={{ color: "var(--purple-900)", textDecoration: "underline" }}>{c}</Link>,
            })}
          </div>
        </div>
      )}

      <div className="row" style={{ gridTemplateColumns: colors.length > 0 && sizes.length > 0 ? "1fr 1fr 1fr" : colors.length > 0 || sizes.length > 0 ? "1fr 1fr" : "1fr" }}>
        <div className="field">
          <label>{t("common.quantity")}</label>
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
        </div>
        {colors.length > 0 && (
          <div className="field">
            <label>{t("common.colour")}</label>
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {colors.map((c) => <option key={c} value={c}>{colorLabel(c, locale)}</option>)}
            </select>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="field">
            <label>{t("common.size")}</label>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {sizes.map((s) => <option key={s} value={s}>{sizeLabel(s, locale)}</option>)}
            </select>
          </div>
        )}
      </div>

      <DeliveryOptionsFields date={deliveryDate} onDate={setDeliveryDate} gift={giftMessage} onGift={setGiftMessage} />

      <div className="field">
        <label>{t("preorderForm.notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t("preorderForm.notesPlaceholder")}
          style={{ width: "100%", padding: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, border: "1px solid var(--line)", background: "white", resize: "vertical" }}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>{t("preorderForm.addressOptionalConfirm")}</label>
        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          <div className="field">
            <input name="address-line1" autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder={t("preorderForm.line1Placeholder")} />
          </div>
          <div className="row">
            <div className="field">
              <input name="address-level3" autoComplete="address-level3" value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("preorderForm.areaPlaceholder")} />
            </div>
            <div className="field">
              <input name="address-level2" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("preorderForm.cityPlaceholder")} />
            </div>
            <div className="field">
              <input name="postal-code" autoComplete="postal-code" inputMode="numeric" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder={t("preorderForm.postcodePlaceholder")} />
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          {t("preorderForm.payNote")}
        </p>
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ minWidth: 200 }}>
          {pending ? t("preorderForm.sending") : t("preorderForm.place")}
        </button>
      </div>
    </form>
  );
}
