"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";

type Segment = { id: string; name: string };

/**
 * Category strip with active-state awareness.
 *
 * The server-rendered TopNav can't read `usePathname`, so the chip rendering
 * is split out here. An animated underline draws in on hover (preview) and
 * stays drawn when the chip's segment matches the current route — same
 * oceanic motion grammar used by the section ornaments.
 */
export default function CatStrip({ segments }: { segments: Segment[] }) {
  const pathname = usePathname();
  return (
    <div className="cat-strip">
      <div className="cat-strip-inner">
        {segments.map((c) => {
          // pathname includes the locale prefix (e.g. "/en/shop/perfume").
          // We only care whether the segment slug appears in the path.
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
        })}
      </div>
    </div>
  );
}
