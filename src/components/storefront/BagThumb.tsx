import Image from "next/image";
import type { CartItem } from "@/lib/cart-context";

/**
 * A bag line's picture (drawer, bag page, checkout): the cut-out standing on the cream, or the
 * first photo. A line saved before pictures were kept shows a plain tile with its initial,
 * never drawn placeholder art.
 */
export default function BagThumb({ item }: { item: Pick<CartItem, "name" | "image" | "imageIsCut"> }) {
  if (!item.image) {
    return <span className="bag-thumb" aria-hidden="true"><span className="bag-thumb-blank">{item.name.charAt(0)}</span></span>;
  }
  return (
    <span className={"bag-thumb" + (item.imageIsCut ? " is-cut" : "")}>
      <Image src={item.image} alt="" width={120} height={160} sizes="120px" />
    </span>
  );
}
