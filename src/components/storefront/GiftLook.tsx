"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { Cutout } from "@/lib/cutouts";

export interface GiftPiece {
  key: string;
  name: string;
  note: string;
  /** The product's page; the card has none (it comes with the bouquet). */
  href: string | null;
  cutout: Cutout | null;
  photo: string | null;
  /** A flat printed piece (the card): shown as it is, tilted, not round. */
  flat?: boolean;
}

interface GiftLookProps {
  kicker: string;
  title: string;
  pieces: GiftPiece[];
}

/**
 * "Complete the gift", for occasion pages: the bouquet, the Sanguine card and the board game
 * picked for it in Admin ("Complete the look") stand together. Pointing at or tapping one
 * brings it forward and fades the others; the list beside them links each to its page.
 */
export default function GiftLook({ kicker, title, pieces }: GiftLookProps) {
  const [on, setOn] = useState<number | null>(null);
  const cls = (i: number) => "gift-piece" + (on === null ? "" : on === i ? " is-on" : " is-off");

  return (
    <section className="gift" aria-labelledby="gift-title">
      <div className="gift-scene" onMouseLeave={() => setOn(null)}>
        {pieces.map((p, i) => (
          <button key={p.key} type="button" className={cls(i)} aria-pressed={on === i}
            aria-label={p.name} onClick={() => setOn(on === i ? null : i)} onMouseEnter={() => setOn(i)}>
            {p.flat && p.photo ? (
              <Image src={p.photo} width={640} height={392} alt="" sizes="(max-width: 760px) 30vw, 220px" className="gift-flat" />
            ) : p.cutout ? (
              <Image src={p.cutout.small} width={Math.round(p.cutout.width / 2)} height={Math.round(p.cutout.height / 2)}
                alt="" sizes="(max-width: 760px) 30vw, 240px" className="gift-cut" />
            ) : p.photo ? (
              <Image src={p.photo} width={240} height={240} alt="" sizes="(max-width: 760px) 30vw, 200px" className="gift-photo" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="gift-list">
        <p className="stage-kicker">{kicker}</p>
        <h2 id="gift-title">{title}</h2>
        <ol>
          {pieces.map((p, i) => (
            <li key={p.key} className={on === i ? "is-on" : undefined} onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)}>
              <span className="gift-n">{String(i + 1).padStart(2, "0")}</span>
              <span>
                {p.href ? <Link href={p.href}>{p.name}</Link> : <b>{p.name}</b>}
                <small>{p.note}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
