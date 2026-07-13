import * as dotenv from "dotenv";
dotenv.config({ override: true });

const main = async () => {
  const { db } = await import("../src/lib/db");
  const { sql } = await import("drizzle-orm");

  const Q = {
    segments: sql`
      select s.id, count(p.id)::int as n
      from segments s
      left join products p on p.segment_id = s.id and p.status = 'live'
      where s.hidden = false
      group by s.id
    `,
    reviews: sql`
      select p.slug
      from products p
      left join (
        select product_id, count(*)::int as n from reviews where status = 'approved' group by product_id
      ) r on r.product_id = p.id
      where coalesce(r.n, 0) <> p.review_count
    `,
    returns: sql`
      select count(*)::int as open,
             count(*) filter (where updated_at < now() - interval '7 days')::int as stale
      from orders where status = 'return_requested'
    `,
  };

  const timed = (name: string, q: unknown) => {
    const t0 = Date.now();
    return Promise.race([
      db.execute(q as never).then(() => `${name}: OK ${Date.now() - t0}ms`),
      new Promise<string>((res) => setTimeout(() => res(`${name}: TIMEOUT 5000ms`), 5000)),
    ]);
  };

  console.log("— all three concurrently —");
  console.log((await Promise.all(Object.entries(Q).map(([n, q]) => timed(n, q)))).join("\n"));

  console.log("— returns alone —");
  console.log(await timed("returns-alone", Q.returns));

  console.log("— returns × 3 concurrently —");
  console.log((await Promise.all([1, 2, 3].map((i) => timed(`returns-${i}`, Q.returns)))).join("\n"));

  process.exit(0);
};
main().catch((e) => { console.error("ERR:", e instanceof Error ? e.message : e); process.exit(1); });
