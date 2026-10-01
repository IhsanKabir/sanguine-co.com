"use client";

import { useTranslations } from "next-intl";
import { useWishlist } from "@/lib/wishlist-context";
import Icon from "./Icon";

export default function WishHeart({ productId, className }: { productId: string; className?: string }) {
  const t = useTranslations();
  const { has, toggle, hydrated } = useWishlist();
  if (!hydrated) return null;
  const on = has(productId);
  return (
    <button
      className={"heart-tick " + (on ? "on " : "") + (className || "")}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      aria-pressed={on}
      aria-label={on ? t("wishlist.remove") : t("wishlist.add")}
    >
      <Icon name="heart" size={14} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
