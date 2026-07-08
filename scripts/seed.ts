/**
 * Curated 12-product seed for the Sanguine soft launch.
 * Run with: npm run db:seed
 *
 * Curates 4 segments × 3 products. Drops watches (price too high for unproven),
 * books, anime, boardgames (commodity), and flowers (fragile for nationwide).
 *
 * Prices in whole BDT — adjust before launch based on market research.
 */
import * as dotenv from "dotenv";
dotenv.config({ override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

type Cat = {
  id: string;
  name: string;
  name_bn: string;
  tag: string;
  tag_bn: string;
  blurb: string;
  blurb_bn: string;
  sort_order: number;
};

const segments: Cat[] = [
  { id: "clothing",    name: "Clothing",    name_bn: "পোশাক",        tag: "Atelier",     tag_bn: "অ্যাটেলিয়ার", blurb: "Garments cut with patience",       blurb_bn: "ধৈর্যে কাটা পোশাক",            sort_order: 1 },
  { id: "accessories", name: "Accessories", name_bn: "অনুষঙ্গ",      tag: "Adornments",  tag_bn: "অলঙ্কার",     blurb: "Objects of daily ceremony",         blurb_bn: "দৈনন্দিন আচারের সরঞ্জাম",       sort_order: 2 },
  { id: "perfume",     name: "Perfume",     name_bn: "সুগন্ধি",      tag: "Parfumerie",  tag_bn: "পারফিউমারি",  blurb: "Notes composed in glass",           blurb_bn: "কাঁচে রচিত সুরভি",              sort_order: 3 },
  { id: "jewelry",     name: "Jewelry",     name_bn: "অলঙ্কার",      tag: "Orfèvrerie",  tag_bn: "অর্ফেভ্রি",   blurb: "Gold, silver, stone",               blurb_bn: "সোনা, রূপা, পাথর",              sort_order: 4 },
];

type P = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  name_bn: string;
  segment_id: string;
  price_bdt: number;
  was_bdt: number | null;
  stock: number;
  tag: string | null;
  rating: number;
  review_count: number;
  description: string;
  description_bn: string;
  colors: string[];
  sizes: string[];
};

const products: P[] = [
  // ─── Clothing ───
  {
    id: "p001", sku: "CLO-VEL-001", slug: "velvet-opera-coat",
    name: "Velvet Opera Coat", name_bn: "ভেলভেট অপেরা কোট",
    segment_id: "clothing",
    price_bdt: 28000, was_bdt: 35000, stock: 8, tag: "new",
    rating: 4.8, review_count: 14,
    description: "A cropped opera coat cut from plum silk velvet. Hand-finished in the atelier. Lined in cream silk-cotton. Wear it open over a slip dress, or buttoned to the throat.",
    description_bn: "প্লাম রঙের সিল্ক ভেলভেটে তৈরি ক্রপড অপেরা কোট। অ্যাটেলিয়ারে হাতে সম্পন্ন। ক্রিম সিল্ক-কটনে আস্তরিত।",
    colors: ["Aubergine", "Obsidian", "Rose"],
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "p002", sku: "CLO-BIA-002", slug: "silk-bias-gown",
    name: "Silk Bias Gown", name_bn: "সিল্ক বায়াস গাউন",
    segment_id: "clothing",
    price_bdt: 18000, was_bdt: null, stock: 6, tag: null,
    rating: 4.6, review_count: 9,
    description: "A bias-cut silk gown that drapes like water. Fastened with three covered buttons at the small of the back. For evenings that ask for very little.",
    description_bn: "জলের মতো ঝরে পড়া বায়াস-কাট সিল্ক গাউন। পিঠে তিনটি ঢাকা বোতামে বন্ধ।",
    colors: ["Plum", "Ivory"],
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "p003", sku: "CLO-BLA-003", slug: "wool-crepe-blazer",
    name: "Wool Crepe Blazer", name_bn: "উলেন ক্রেপ ব্লেজার",
    segment_id: "clothing",
    price_bdt: 16000, was_bdt: 19500, stock: 12, tag: "sale",
    rating: 4.7, review_count: 21,
    description: "A double-breasted blazer in fine wool crepe. Soft shoulder, peak lapel, two welted pockets. Tailored close to the body.",
    description_bn: "মিহি উলেন ক্রেপে ডাবল-ব্রেস্টেড ব্লেজার। কোমল কাঁধ, পিক ল্যাপেল, দুটি পকেট।",
    colors: ["Charcoal", "Amethyst"],
    sizes: ["S", "M", "L", "XL"],
  },

  // ─── Accessories ───
  {
    id: "p004", sku: "ACC-SCA-004", slug: "silk-opera-scarf",
    name: "Silk Opera Scarf", name_bn: "সিল্ক অপেরা স্কার্ফ",
    segment_id: "accessories",
    price_bdt: 7500, was_bdt: null, stock: 18, tag: null,
    rating: 4.7, review_count: 13,
    description: "A long silk scarf hand-rolled at the edges. Worn around the throat, tied at the waist, or as a small turban. Three colourways, two metres.",
    description_bn: "প্রান্তে হাতে গোলানো লম্বা সিল্ক স্কার্ফ। গলায়, কোমরে বা পাগড়ির মতো পরা যায়।",
    colors: ["Iris", "Garnet", "Noir"],
    sizes: [],
  },
  {
    id: "p005", sku: "ACC-WAL-005", slug: "embossed-leather-wallet",
    name: "Embossed Leather Wallet", name_bn: "এমবসড লেদার ওয়ালেট",
    segment_id: "accessories",
    price_bdt: 9800, was_bdt: null, stock: 15, tag: "new",
    rating: 4.8, review_count: 8,
    description: "Bifold wallet in vegetable-tanned calf leather. The house monogram embossed at the corner. Six card slots, one note compartment.",
    description_bn: "ভেজিটেবল-ট্যানড কাফ লেদারে দুই-ভাঁজ ওয়ালেট। কোণে ঘরের মনোগ্রাম এমবসড।",
    colors: ["Aubergine", "Cognac"],
    sizes: [],
  },
  {
    id: "p006", sku: "ACC-POC-006", slug: "silk-pocket-square",
    name: "Silk Pocket Square", name_bn: "সিল্ক পকেট স্কোয়ার",
    segment_id: "accessories",
    price_bdt: 2800, was_bdt: null, stock: 30, tag: null,
    rating: 4.5, review_count: 22,
    description: "A 40cm silk square in three colourways. Hand-rolled hem. Folded as a TV-fold or tossed in carelessly — both are correct.",
    description_bn: "৪০ সেমি সিল্ক স্কোয়ার, তিনটি রঙে। হাতে গোলানো হেম।",
    colors: ["Damson", "Gold", "Smoke"],
    sizes: [],
  },

  // ─── Perfume ───
  {
    id: "p007", sku: "PER-NUI-007", slug: "nuit-de-velours",
    name: "Nuit de Velours 100ml", name_bn: "নুই দ্য ভেলুর ১০০মি.লি.",
    segment_id: "perfume",
    price_bdt: 14500, was_bdt: null, stock: 14, tag: "new",
    rating: 4.9, review_count: 19,
    description: "Top notes of plum and bergamot. Heart of iris, violet leaf, a thread of saffron. Base of vetiver, vanilla, and tonka bean. Eau de parfum.",
    description_bn: "উপরে প্লাম ও বার্গামট। কেন্দ্রে আইরিস, ভায়োলেট পাতা, এক ফোঁটা জাফরান। নিচে ভেটিভার, ভ্যানিলা।",
    colors: ["50ml", "100ml"],
    sizes: [],
  },
  {
    id: "p008", sku: "PER-IRI-008", slug: "iris-and-ember-edp",
    name: "Iris & Ember EDP", name_bn: "আইরিস অ্যান্ড এম্বার EDP",
    segment_id: "perfume",
    price_bdt: 9500, was_bdt: null, stock: 22, tag: null,
    rating: 4.7, review_count: 11,
    description: "Iris and ember, smoked through cedarwood. A perfume for late autumn, evening, the small fire that does not need to be tended.",
    description_bn: "আইরিস ও এম্বার, সিডারউডে ধোঁয়াটে। শেষ শরতের সন্ধ্যার জন্য একটি সুগন্ধি।",
    colors: ["50ml", "100ml"],
    sizes: [],
  },
  {
    id: "p009", sku: "PER-SMO-009", slug: "smoke-and-myrrh",
    name: "Smoke & Myrrh", name_bn: "স্মোক অ্যান্ড মার",
    segment_id: "perfume",
    price_bdt: 12500, was_bdt: null, stock: 11, tag: null,
    rating: 4.8, review_count: 7,
    description: "Frankincense, myrrh, a thread of pink pepper. Resinous, slow, cathedral-cool. Wear once and forget about your other perfumes.",
    description_bn: "ফ্র্যাঙ্কিনসেন্স, মার, একটু গোলাপি মরিচ। রজনময়, ধীর, ক্যাথেড্রালের মতো শীতল।",
    colors: ["50ml", "100ml"],
    sizes: [],
  },

  // ─── Jewelry ───
  {
    id: "p010", sku: "JEW-AME-010", slug: "amethyst-sovereign-ring",
    name: "Amethyst Sovereign Ring", name_bn: "অ্যামেথিস্ট সভরিন রিং",
    segment_id: "jewelry",
    price_bdt: 42000, was_bdt: null, stock: 4, tag: "new",
    rating: 4.9, review_count: 5,
    description: "An oval amethyst, cabochon-cut, set in 18k yellow gold. The shoulders engraved with the house violet. Made to order in five working days.",
    description_bn: "ডিম্বাকার অ্যামেথিস্ট, ক্যাবোশন কাট, ১৮ ক্যারেট হলুদ সোনায় বসানো।",
    colors: ["5", "6", "7", "8", "9"],
    sizes: [],
  },
  {
    id: "p011", sku: "JEW-PEA-011", slug: "pearl-chain-necklace",
    name: "Pearl Chain Necklace", name_bn: "পার্ল চেইন নেকলেস",
    segment_id: "jewelry",
    price_bdt: 28500, was_bdt: null, stock: 7, tag: null,
    rating: 4.7, review_count: 12,
    description: "Akoya pearls graduated through a fine 18k gold chain. Three lengths. The clasp engraved with the house mark. Comes in a velvet pouch.",
    description_bn: "১৮ ক্যারেট সোনার চেইনে আকোয়া মুক্তা। তিনটি দৈর্ঘ্যে। ক্ল্যাস্পে ঘরের চিহ্ন খোদাই।",
    colors: ["16\"", "18\"", "20\""],
    sizes: [],
  },
  {
    id: "p012", sku: "JEW-SIG-012", slug: "signet-house-of-violet",
    name: "Signet — House of Violet", name_bn: "সিগনেট — হাউস অফ ভায়োলেট",
    segment_id: "jewelry",
    price_bdt: 22500, was_bdt: null, stock: 6, tag: null,
    rating: 4.6, review_count: 9,
    description: "A traditional signet ring engraved with the house violet. Cushion face, smooth shoulders. Made to order, stamped with your initials on request.",
    description_bn: "ঘরের ভায়োলেট খোদাই করা প্রথাগত সিগনেট রিং। কুশন ফেস, মসৃণ কাঁধ। অর্ডার করে তৈরি।",
    colors: ["Gold", "Silver"],
    sizes: ["6", "7", "8", "9"],
  },
];

async function seed() {
  console.log("→ Wiping existing seed data");
  await sql`delete from product_images`;
  await sql`delete from products`;
  await sql`delete from segments`;

  console.log("→ Inserting segments");
  for (const s of segments) {
    await sql`
      insert into segments (id, name, name_bn, tag, tag_bn, blurb, blurb_bn, sort_order)
      values (${s.id}, ${s.name}, ${s.name_bn}, ${s.tag}, ${s.tag_bn}, ${s.blurb}, ${s.blurb_bn}, ${s.sort_order})
    `;
  }

  console.log("→ Inserting products");
  for (const p of products) {
    await sql`
      insert into products (
        id, sku, slug, name, name_bn, segment_id,
        price_bdt, was_bdt, stock, tag, rating, review_count,
        description, description_bn, colors, sizes
      ) values (
        ${p.id}, ${p.sku}, ${p.slug}, ${p.name}, ${p.name_bn}, ${p.segment_id},
        ${p.price_bdt}, ${p.was_bdt}, ${p.stock}, ${p.tag}, ${p.rating}, ${p.review_count},
        ${p.description}, ${p.description_bn},
        ${JSON.stringify(p.colors)}::jsonb, ${JSON.stringify(p.sizes)}::jsonb
      )
    `;
  }

  console.log(`✓ Seeded ${segments.length} segments, ${products.length} products`);
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
