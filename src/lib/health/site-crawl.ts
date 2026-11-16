/**
 * Visits every page a customer can reach and reports any that break. Pure fetch, so the
 * admin Health board (live-checks.ts) and the terminal script (scripts/check-live.ts)
 * run the very same crawl.
 */
type Expect = "ok" | "redirect" | "noerror";

/** What Next.js prints when a page breaks (not words like "Something went wrong", which every page carries in its translations). */
const ERROR_MARKS = ["Application error: a server-side exception", "Application error: a client-side exception", "id=\"__next_error__\"", "<h2>Internal Server Error"];
const BATCH = 8;
const PAGE_TIMEOUT_MS = 10_000;

async function visit(site: string, path: string, expect: Expect): Promise<string | null> {
  const url = path.startsWith("http") ? path : site + path;
  try {
    const res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "sanguine-health-check" },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    const redirected = res.status >= 300 && res.status < 400;
    if (expect === "redirect") return redirected ? null : `${res.status} ${path} (expected a redirect)`;
    if (redirected && expect === "noerror") return null;
    if (res.status !== 200) return `${res.status} ${path}`;
    if ((res.headers.get("content-type") ?? "").includes("text/html")) {
      const html = await res.text();
      const mark = ERROR_MARKS.find((m) => html.includes(m));
      if (mark) return `error page on ${path}`;
    }
    return null;
  } catch (err) {
    return `no answer from ${path}: ${err instanceof Error ? err.message : "network error"}`;
  }
}

/** Every sitemap page, plus the flows that are not in it. Returns the pages checked and the problems. */
export async function crawlSite(site: string): Promise<{ checked: number; problems: string[] }> {
  const res = await fetch(`${site}/sitemap.xml`, { cache: "no-store", signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
  const xml = res.ok ? await res.text() : "";
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const slugs = [...new Set(urls.map((u) => u.match(/\/en\/product\/([^/?#]+)$/)?.[1]).filter((s): s is string => Boolean(s)))];
  const pages: [string, Expect][] = [
    ...urls.map((u): [string, Expect] => [u, "ok"]),
    ["/en?ref=SSG-ABCDEF", "ok"],
    ["/en/search?q=rose", "ok"],
    ["/en/sign-in", "ok"],
    ["/en/wishlist", "noerror"],
    ["/en/account", "redirect"],
    ["/en/admin", "redirect"],
    ["/robots.txt", "ok"],
    ["/moments/cats-anniversary.mp4", "ok"],
    ["/api/og?title=Sanguine", "noerror"],
    ...slugs.map((s): [string, Expect] => [`/en/preorder/product/${s}`, "noerror"]),
  ];
  const problems: string[] = urls.length ? [] : ["sitemap.xml lists no pages"];
  for (let i = 0; i < pages.length; i += BATCH) {
    const found = await Promise.all(pages.slice(i, i + BATCH).map(([p, e]) => visit(site, p, e)));
    problems.push(...found.filter((f): f is string => f !== null));
  }
  return { checked: pages.length, problems };
}
