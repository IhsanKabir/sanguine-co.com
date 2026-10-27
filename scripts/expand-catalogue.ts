/**
 * Expand the catalogue with the 5 segments dropped from the curated launch.
 * All segments are HIDDEN (Draft): they appear in admin but NOT on the storefront.
 * Toggle live anytime via Admin → Segments → click the visibility icon.
 *
 * Idempotent: safe to run multiple times. Uses ON CONFLICT DO UPDATE so existing
 * data (including your test orders) is preserved.
 *
 * Usage:  npx tsx scripts/expand-catalogue.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ override: true });
import postgres from "postgres";

function toSessionPooler(url: string): string {
  const u = new URL(url);
  if (u.port === "6543") u.port = "5432";
  u.search = "";
  return u.toString();
}

const sql = postgres(toSessionPooler(process.env.DATABASE_URL!), { max: 1, prepare: false });

type Seg = { id: string; name: string; nameBn: string; tag: string; tagBn: string; blurb: string; blurbBn: string; sortOrder: number };

const segments: Seg[] = [
  { id: "books",      name: "Books",         nameBn: "বই",            tag: "Bibliotheca",  tagBn: "বিবলিওথেকা",   blurb: "Volumes bound and unbound",         blurbBn: "বাঁধা ও খোলা গ্রন্থ",      sortOrder: 5 },
  { id: "watches",    name: "Watches",       nameBn: "ঘড়ি",          tag: "Horologium",   tagBn: "হরোলোগিয়াম",   blurb: "Time, measured regally",            blurbBn: "রাজকীয় সময়",          sortOrder: 6 },
  { id: "anime",      name: "Anime & Manga", nameBn: "অ্যানিমে ও মাঙ্গা",  tag: "Collectanea",  tagBn: "সংগ্রহ",        blurb: "Imported volumes & figures",         blurbBn: "আমদানিকৃত খণ্ড ও ফিগার",    sortOrder: 7 },
  { id: "flowers",    name: "Flowers",       nameBn: "ফুল",           tag: "Florilegium",  tagBn: "ফ্লোরিলেজিয়াম",  blurb: "Bouquets arranged to order",         blurbBn: "অর্ডার অনুযায়ী সাজানো বুকে",     sortOrder: 8 },
  { id: "boardgames", name: "Boardgames",    nameBn: "বোর্ড গেম",     tag: "Ludothèque",   tagBn: "লুদোথেক",       blurb: "Games for long evenings",           blurbBn: "দীর্ঘ সন্ধ্যার জন্য খেলা",     sortOrder: 9 },
];

type P = {
  id: string; sku: string; slug: string; name: string; nameBn: string;
  segmentId: string; priceBdt: number; wasBdt: number | null;
  stock: number; tag: string | null; rating: number; reviewCount: number;
  description: string; descriptionBn: string;
  colors: string[]; sizes: string[];
};

const products: P[] = [
  // ─── Books ───
  { id: "p005", sku: "BOK-CRO-005", slug: "the-crown-of-violets",     name: "The Crown of Violets",        nameBn: "ভায়োলেটের মুকুট",         segmentId: "books",      priceBdt: 2400,  wasBdt: null, stock: 28, tag: "new",  rating: 4.9, reviewCount: 41,  description: "A debut novel of court intrigue and a quiet poisoning. First edition, cloth-bound.", descriptionBn: "দরবারের ষড়যন্ত্র ও নীরব বিষপানের একটি অভিষেক উপন্যাস।",  colors: ["Cloth","Leather"], sizes: [] },
  { id: "p006", sku: "BOK-LET-006", slug: "letters-from-the-rue-morgue", name: "Letters from the Rue Morgue", nameBn: "রু মর্গের চিঠি",            segmentId: "books",      priceBdt: 2000,  wasBdt: null, stock: 16, tag: null,   rating: 4.4, reviewCount: 19,  description: "Forty letters between two anatomists in 1870s Paris. Newly translated.",          descriptionBn: "১৮৭০ দশকের প্যারিসে দুই শারীরবিজ্ঞানীর মধ্যে চল্লিশটি চিঠি।",   colors: ["Paperback","Hardcover"], sizes: [] },
  { id: "p007", sku: "BOK-ATL-007", slug: "an-atlas-of-rare-flora",     name: "An Atlas of Rare Flora",       nameBn: "বিরল উদ্ভিদের অ্যাটলাস",    segmentId: "books",      priceBdt: 4500,  wasBdt: 5500, stock: 9,  tag: "sale", rating: 4.8, reviewCount: 7,   description: "Hand-lithographed plates of forty rare blooms. Linen slipcase.",                  descriptionBn: "চল্লিশটি বিরল ফুলের হাতে আঁকা প্লেট। লিনেন স্লিপকেস।",         colors: ["Linen"], sizes: [] },
  { id: "p008", sku: "BOK-PHI-008", slug: "the-philosophers-banquet",   name: "The Philosopher's Banquet",   nameBn: "দার্শনিকের ভোজ",            segmentId: "books",      priceBdt: 1700,  wasBdt: null, stock: 20, tag: null,   rating: 4.3, reviewCount: 15,  description: "A retelling of Plato's Symposium for a slow evening.",                            descriptionBn: "ধীর সন্ধ্যার জন্য প্লেটোর সিম্পোজিয়ামের পুনর্বর্ণনা।",       colors: ["Paperback"], sizes: [] },

  // ─── Watches ───
  { id: "p017", sku: "WAT-REG-017", slug: "regent-automatic-41",   name: "Regent Automatic 41",   nameBn: "রিজেন্ট অটোমেটিক ৪১",        segmentId: "watches",    priceBdt: 175000, wasBdt: null,   stock: 3, tag: "new",  rating: 4.9, reviewCount: 4,  description: "41mm steel case, in-house automatic movement, violet sunray dial.",            descriptionBn: "৪১ মিমি স্টিল কেস, ইন-হাউস অটোমেটিক মুভমেন্ট, ভায়োলেট ডায়াল।",  colors: ["Violet Dial","Onyx Dial"], sizes: [] },
  { id: "p018", sku: "WAT-BAR-018", slug: "baroque-chronograph",   name: "Baroque Chronograph",   nameBn: "বারোক ক্রনোগ্রাফ",          segmentId: "watches",    priceBdt: 135000, wasBdt: null,   stock: 5, tag: null,   rating: 4.7, reviewCount: 8,  description: "Three-register chronograph. Exhibition caseback. Made in our atelier.",        descriptionBn: "তিন-রেজিস্টার ক্রনোগ্রাফ। প্রদর্শনী কেসব্যাক।",                colors: ["Gold","Steel"], sizes: [] },
  { id: "p019", sku: "WAT-MIN-019", slug: "minuit-dress-watch",    name: "Minuit (Dress Watch", nameBn: "মিনুই) ড্রেস ঘড়ি",          segmentId: "watches",    priceBdt: 70000,  wasBdt: 82000, stock: 6, tag: "sale", rating: 4.8, reviewCount: 13, description: "A slim dress watch under a chemise sleeve. Cabochon crown.",                   descriptionBn: "একটি পাতলা ড্রেস ঘড়ি, ক্যাবোশন ক্রাউন।",                       colors: ["Amethyst"], sizes: [] },
  { id: "p020", sku: "WAT-CRO-020", slug: "crown-diver-300m",      name: "Crown Diver 300m",      nameBn: "ক্রাউন ডাইভার ৩০০মি",         segmentId: "watches",    priceBdt: 120000, wasBdt: null,   stock: 4, tag: null,   rating: 4.6, reviewCount: 7,  description: "300m water resistance. Ceramic bezel. Lume that holds through midnight.",       descriptionBn: "৩০০মি জল প্রতিরোধ। সিরামিক বেজেল।",                              colors: ["Violet","Noir"], sizes: [] },

  // ─── Anime ───
  { id: "p021", sku: "ANI-NIG-021", slug: "nightshade-volumes-1-5",   name: "Nightshade Volumes 1–5",   nameBn: "নাইটশেড খণ্ড ১–৫",            segmentId: "anime",      priceBdt: 4800, wasBdt: null, stock: 32, tag: null,   rating: 4.9, reviewCount: 38, description: "Box set of the cult shoujo classic. Original Japanese print run.",   descriptionBn: "শোজো ক্ল্যাসিকের বক্স সেট।",                colors: ["Box Set"], sizes: [] },
  { id: "p022", sku: "ANI-FIG-022", slug: "figurine-moon-sovereign",  name: "Figurine (Moon Sovereign", nameBn: "ফিগারিন) মুন সভরিন",        segmentId: "anime",      priceBdt: 10300, wasBdt: null, stock: 11, tag: "new",  rating: 4.8, reviewCount: 14, description: "30cm articulated figurine. Cloth robe, painted face.",               descriptionBn: "৩০ সেমি আর্টিকুলেটেড ফিগারিন।",            colors: ["Standard","Deluxe"], sizes: [] },
  { id: "p023", sku: "ANI-ART-023", slug: "art-of-the-violet-blade",  name: "Art of the Violet Blade",  nameBn: "ভায়োলেট ব্লেডের শিল্প",       segmentId: "anime",      priceBdt: 4100,  wasBdt: 5100, stock: 18, tag: "sale", rating: 4.7, reviewCount: 22, description: "Concept art and storyboards from the cult film.",                    descriptionBn: "কাল্ট চলচ্চিত্রের কনসেপ্ট আর্ট।",            colors: ["Hardcover"], sizes: [] },
  { id: "p024", sku: "ANI-RES-024", slug: "resin-statue-oracle",      name: "Resin Statue (Oracle",    nameBn: "রেজিন স্ট্যাচু) ওরাকল",       segmentId: "anime",      priceBdt: 20500, wasBdt: null, stock: 2,  tag: null,   rating: 4.9, reviewCount: 5,  description: "Limited 200-piece run. Numbered base, cold-cast resin.",             descriptionBn: "সীমিত ২০০ পিসের রান।",                       colors: ["Limited"], sizes: [] },

  // ─── Flowers (Dhaka-only when launched) ───
  { id: "p013", sku: "FLO-VIO-013", slug: "violet-noir-bouquet",    name: "Violet Noir Bouquet", nameBn: "ভায়োলেট নয়ার তোড়া",   segmentId: "flowers",    priceBdt: 7000,  wasBdt: null,  stock: 18, tag: "new",  rating: 4.9, reviewCount: 24, description: "Dark violets, black calla lily, sprig of rosemary. Hand-tied, wax-sealed card.", descriptionBn: "গাঢ় ভায়োলেট, কালো ক্যালা লিলি।",  colors: ["Small","Medium","Grand"], sizes: [] },
  { id: "p014", sku: "FLO-PEO-014", slug: "peonies-in-twilight",    name: "Peonies in Twilight", nameBn: "গোধূলির পেওনি",        segmentId: "flowers",    priceBdt: 8800,  wasBdt: null,  stock: 14, tag: null,   rating: 4.8, reviewCount: 17, description: "Garden peonies cut at sunset. Wrapped in silk paper.",                            descriptionBn: "সূর্যাস্তে কাটা পেওনি।",            colors: ["Medium","Grand"], sizes: [] },
  { id: "p015", sku: "FLO-QUE-015", slug: "queen-of-the-night",     name: "Queen of the Night",  nameBn: "নিশীথ রানি",            segmentId: "flowers",    priceBdt: 11000, wasBdt: 12800, stock: 5,  tag: "sale", rating: 4.7, reviewCount: 9,  description: "Black tulips and silver eucalyptus. Reserve at least 24 hours ahead.",            descriptionBn: "কালো টিউলিপ ও সিলভার ইউক্যালিপটাস।",  colors: ["Grand"], sizes: [] },
  { id: "p016", sku: "FLO-WIL-016", slug: "wild-lilac-and-thistle", name: "Wild Lilac & Thistle", nameBn: "বুনো লাইল্যাক ও থিসল",  segmentId: "flowers",    priceBdt: 5500,  wasBdt: null,  stock: 22, tag: null,   rating: 4.6, reviewCount: 11, description: "Wild lilac, Scottish thistle, foraged greens.",                                   descriptionBn: "বুনো লাইল্যাক, স্কটিশ থিসল।",       colors: ["Small","Medium"], sizes: [] },

  // ─── Boardgames ───
  { id: "p033", sku: "BRD-COU-033", slug: "courts-of-the-violet-throne",  name: "Courts of the Violet Throne", nameBn: "ভায়োলেট সিংহাসনের দরবার",  segmentId: "boardgames", priceBdt: 5500,  wasBdt: null, stock: 28, tag: "new",  rating: 4.9, reviewCount: 52, description: "A 2–6 player strategy game of court intrigue and slow betrayal. 90–120 mins.", descriptionBn: "২–৬ খেলোয়াড়ের কৌশল গেম।",  colors: ["Standard","Deluxe"], sizes: [] },
  { id: "p034", sku: "BRD-CAR-034", slug: "the-cartographers-dilemma",    name: "The Cartographer's Dilemma", nameBn: "মানচিত্রকারের দ্বিধা",      segmentId: "boardgames", priceBdt: 4400,  wasBdt: null, stock: 19, tag: null,   rating: 4.7, reviewCount: 33, description: "Solo or 2-player. Draw maps of imagined worlds. 45 mins per session.",          descriptionBn: "সলো বা ২-প্লেয়ার। কাল্পনিক জগতের মানচিত্র আঁকুন।", colors: ["Standard"], sizes: [] },
  { id: "p035", sku: "BRD-NOC-035", slug: "nocturne-card-game",           name: "Nocturne (Card Game",        nameBn: "নকটার্ন) কার্ড গেম",        segmentId: "boardgames", priceBdt: 2500,  wasBdt: 3200, stock: 38, tag: "sale", rating: 4.5, reviewCount: 71, description: "78-card trick-taking game. Beautiful suits.",                                  descriptionBn: "৭৮-কার্ড ট্রিক-টেকিং গেম।",   colors: ["Standard"], sizes: [] },
  { id: "p036", sku: "BRD-ORC-036", slug: "orchid-and-iron",              name: "Orchid & Iron",                nameBn: "অর্কিড ও লোহা",              segmentId: "boardgames", priceBdt: 6800,  wasBdt: null, stock: 9,  tag: null,   rating: 4.8, reviewCount: 14, description: "Asymmetric 2-player game. One side is the orchid, the other the iron.",        descriptionBn: "অসমমিতিক ২-প্লেয়ার গেম।",    colors: ["Collector"], sizes: [] },
];

(async () => {
  console.log(`→ Inserting/updating ${segments.length} hidden segments…`);
  for (const s of segments) {
    await sql`
      insert into segments (id, name, name_bn, tag, tag_bn, blurb, blurb_bn, hidden, sort_order)
      values (${s.id}, ${s.name}, ${s.nameBn}, ${s.tag}, ${s.tagBn}, ${s.blurb}, ${s.blurbBn}, true, ${s.sortOrder})
      on conflict (id) do update set
        name = excluded.name,
        name_bn = excluded.name_bn,
        tag = excluded.tag,
        tag_bn = excluded.tag_bn,
        blurb = excluded.blurb,
        blurb_bn = excluded.blurb_bn,
        hidden = true,
        sort_order = excluded.sort_order
    `;
  }

  console.log(`→ Inserting/updating ${products.length} products (status=live, but hidden via parent segment)…`);
  for (const p of products) {
    await sql`
      insert into products (
        id, sku, slug, name, name_bn, segment_id,
        price_bdt, was_bdt, stock, tag, rating, review_count,
        status, description, description_bn, colors, sizes
      ) values (
        ${p.id}, ${p.sku}, ${p.slug}, ${p.name}, ${p.nameBn}, ${p.segmentId},
        ${p.priceBdt}, ${p.wasBdt}, ${p.stock}, ${p.tag}, ${p.rating}, ${p.reviewCount},
        'live', ${p.description}, ${p.descriptionBn},
        ${JSON.stringify(p.colors)}::jsonb, ${JSON.stringify(p.sizes)}::jsonb
      )
      on conflict (id) do update set
        sku = excluded.sku, slug = excluded.slug,
        name = excluded.name, name_bn = excluded.name_bn,
        segment_id = excluded.segment_id,
        price_bdt = excluded.price_bdt, was_bdt = excluded.was_bdt,
        stock = excluded.stock, tag = excluded.tag,
        rating = excluded.rating, review_count = excluded.review_count,
        description = excluded.description, description_bn = excluded.description_bn,
        colors = excluded.colors, sizes = excluded.sizes
    `;
  }

  const [{ seg_count }] = await sql<[{ seg_count: number }]>`select count(*)::int as seg_count from segments`;
  const [{ prod_count }] = await sql<[{ prod_count: number }]>`select count(*)::int as prod_count from products`;
  console.log(`✓ Done. DB now has ${seg_count} segments and ${prod_count} products.`);
  console.log(`  All ${segments.length} new segments are HIDDEN: invisible on storefront.`);
  console.log(`  Toggle live anytime via Admin → Segments → click the visibility icon.`);
  await sql.end();
})().catch(async (e) => {
  console.error("✗ failed:", e);
  await sql.end().catch(() => {});
  process.exit(1);
});
