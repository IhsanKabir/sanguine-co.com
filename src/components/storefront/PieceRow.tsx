import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { StageItem } from "@/lib/stage-items";

interface PieceRowProps {
  /** Scene number, e.g. "03". */
  n: string;
  title: string;
  items: StageItem[];
}

/**
 * A numbered scene of pieces standing on the page (cut-outs, or real photos shown round), each a
 * link to its page. Used under the product page for "Complete the look" and "More like this";
 * a piece with neither a cut-out nor a photo is left out rather than shown as a placeholder.
 */
export default function PieceRow({ n, title, items }: PieceRowProps) {
  const shown = items.filter((i) => i.cutout || i.photo);
  if (shown.length === 0) return null;
  const titleId = `piece-row-${n}`;
  return (
    <section className="piece-row" aria-labelledby={titleId}>
      <div className="stage-kicker"><span>{n}</span><h2 id={titleId}>{title}</h2></div>
      <ul className="piece-row-list">
        {shown.map((it) => (
          <li key={it.id}>
            <Link href={`/product/${it.slug}`} className="stage-item">
              {it.cutout ? (
                <Image src={it.cutout.small} width={Math.round(it.cutout.width / 2)} height={Math.round(it.cutout.height / 2)}
                  alt="" className="stage-cut" sizes="(max-width: 760px) 45vw, 220px" />
              ) : (
                <Image src={it.photo!} width={240} height={240} alt="" className="stage-disc" sizes="(max-width: 760px) 45vw, 220px" />
              )}
              <span className="stage-cap"><b>{it.name}</b>{it.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
