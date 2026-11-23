import type { ReactNode } from "react";

interface StageHeadProps {
  /** The big faint word behind the heading. */
  ghost: string;
  /** Scene number, e.g. "01"; left out where the page numbers its own steps. */
  n?: string;
  /** The small line above the title. */
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  /** Anything that belongs in the header (a button, a status line). */
  children?: ReactNode;
  /** "center" for short, single-purpose pages (sign-in, not found, order confirmed). */
  align?: "start" | "center";
}

/**
 * The heading of a content page on the warm stage (owner 23 Nov 2026, group 4): a word faint
 * behind, the numbered kicker, the serif title and a short lede, in the same language as the
 * shop and product stages.
 */
export default function StageHead({ ghost, n, kicker, title, lede, children, align = "start" }: StageHeadProps) {
  return (
    <header className={"page-stage" + (align === "center" ? " is-center" : "")}>
      <div className="stage-ghost" aria-hidden="true" data-ghost={ghost} />
      <div className="stage-kicker">{n && <span>{n}</span>}{kicker}</div>
      <h1 className="page-stage-title">{title}</h1>
      {lede && <p className="page-stage-lede">{lede}</p>}
      {children}
    </header>
  );
}
