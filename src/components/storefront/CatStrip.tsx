"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";

type Segment = { id: string; name: string };

/**
 * Category strip with active-state awareness.
 *
 * Supports two rendering modes:
 * - Default: full-width strip below the nav (legacy / standalone use)
 * - `inline`: compact flex row for embedding inside the nav-inner row
 *
 * The server-rendered TopNav can't read `usePathname`, so the chip rendering
 * is split out here. An animated underline draws in on hover (preview) and
 * stays drawn when the chip's segment matches the current route — same
 * oceanic motion grammar used by the section ornaments.
 */
export default function CatStrip({
  segments,
  inline = false,
}: {
  segments: Segment[];
  inline?: boolean;
}) {
  const pathname = usePathname();
  const chips = segments.map((c) => {
    const isActive = pathname.includes(`/shop/${c.id}`);
    return (
      <Link
        key={c.id}
        href={`/shop/${c.id}`}
        className={"cat-chip" + (isActive ? " active" : "")}
        aria-current={isActive ? "page" : undefined}
      >
        {c.name}
      </Link>
    );
  });

  if (inline) {
    return <div className="nav-cats">{chips}</div>;
  }

  return (
    <div className="cat-strip">
      <div className="cat-strip-inner">{chips}</div>
    </div>
  );
}
