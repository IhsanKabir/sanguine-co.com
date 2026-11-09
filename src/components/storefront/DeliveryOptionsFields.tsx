"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { deliveryDateBounds, GIFT_MESSAGE_MAX } from "@/lib/delivery";

type Props = {
  date: string;
  onDate: (v: string) => void;
  gift: string;
  onGift: (v: string) => void;
};

/**
 * "Deliver on" date and card message, shared by checkout and the preorder
 * form. Both optional: an empty date means the earliest delivery.
 */
export default function DeliveryOptionsFields({ date, onDate, gift, onGift }: Props) {
  const t = useTranslations();
  const { min, max } = useMemo(() => deliveryDateBounds(new Date()), []);

  return (
    <div className="row">
      <div className="field">
        <label htmlFor="delivery-date">{t("checkout.deliveryDateLabel")}</label>
        <input id="delivery-date" type="date" min={min} max={max} value={date} onChange={(e) => onDate(e.target.value)} />
        <span style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>{t("checkout.deliveryDateHint")}</span>
      </div>
      <div className="field">
        <label htmlFor="gift-message">{t("checkout.giftMessageLabel")}</label>
        <textarea
          id="gift-message"
          rows={2}
          maxLength={GIFT_MESSAGE_MAX}
          value={gift}
          onChange={(e) => onGift(e.target.value)}
          placeholder={t("checkout.giftMessagePlaceholder")}
        />
      </div>
    </div>
  );
}
