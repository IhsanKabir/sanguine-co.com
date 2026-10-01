-- Step C: stock per size / colour.
--
-- One row per option a product sells (a colour, a size, or a colour+size
-- pair). A product with NO rows keeps the old single stock number; a product
-- with rows is "tracked per option": its products.stock is kept equal to the
-- sum of its rows by the app, so every page that shows a stock number still
-- shows the right total. Empty string, not null, means "no colour" / "no
-- size", so the unique key below holds for size-only and colour-only pieces.
--
-- Nothing is copied in: how existing stock splits across sizes is only known
-- to whoever counts it. Admin → Inventory → Per option fills these rows.
-- Apply BEFORE deploying the code that reads this table.

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  color text not null default '',
  size text not null default '',
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (product_id, color, size)
);

create index if not exists idx_product_variants_product on product_variants(product_id);

alter table product_variants enable row level security;
-- Service role only; the storefront reads stock through server code.
