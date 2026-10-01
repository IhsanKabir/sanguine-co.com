"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/lib/actions/profile";

type Props = {
  initialName: string;
  initialPhone: string;
  initialMarketing: boolean;
  initialBirthday: string;
  initialAnniversary: string;
};

export default function ProfileEditor({
  initialName,
  initialPhone,
  initialMarketing,
  initialBirthday,
  initialAnniversary,
}: Props) {
  const t = useTranslations();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [marketing, setMarketing] = useState(initialMarketing);
  const [birthday, setBirthday] = useState(initialBirthday);
  const [anniversary, setAnniversary] = useState(initialAnniversary);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    if (!name.trim()) { setError(t("profile.nameRequired")); return; }
    setError(null);
    startTransition(async () => {
      const r = await updateProfile({
        fullName: name.trim(),
        phone: phone.trim(),
        acceptsMarketing: marketing,
        birthday: birthday || null,
        anniversary: anniversary || null,
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(t("profile.saveError"));
    });
  };

  return (
    <section style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--gold-text)", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 4 }}>
          {t("profile.kicker")}
        </div>
        <h2 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
          {t("profile.title")}
        </h2>
      </div>

      <div className="row">
        <div className="field">
          <label>{t("addresses.fullName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.namePlaceholder")} />
        </div>
        <div className="field">
          <label>{t("common.phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>{t("profile.birthday")}</label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            style={{ colorScheme: "light" }}
          />
          <span style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4, display: "block" }}>
            {t("profile.birthdayNote")}
          </span>
        </div>
        <div className="field">
          <label>{t("profile.anniversary")}</label>
          <input
            type="date"
            value={anniversary}
            onChange={(e) => setAnniversary(e.target.value)}
            style={{ colorScheme: "light" }}
          />
          <span style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4, display: "block" }}>
            {t("profile.anniversaryNote")}
          </span>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}>
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          style={{ accentColor: "var(--mauve)", width: 16, height: 16 }}
        />
        {t("profile.marketing")}
      </label>

      {error && (
        <p style={{ color: "var(--err)", fontSize: 12, marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={pending}
          style={{ minWidth: 140 }}
        >
          {saved ? t("profile.saved") : pending ? t("profile.saving") : t("profile.save")}
        </button>
      </div>
    </section>
  );
}
