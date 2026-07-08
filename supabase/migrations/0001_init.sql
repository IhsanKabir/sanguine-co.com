-- Sanguine — initial schema
-- Run via Supabase SQL editor OR `npm run db:migrate` after `db:generate`.

-- ─── Catalogue ─────────────────────────────────────────────────────────
create table if not exists segments (
  id text primary key,
  name text not null,
  name_bn text,
  tag text,
  tag_bn text,
  blurb text,
  blurb_bn text,
  hidden boolean default false not null,
  sort_order int default 0 not null,
  created_at timestamptz default now() not null
);

create table if not exists products (
  id text primary key,
  sku text unique not null,
  name text not null,
  name_bn text,
  slug text unique not null,
  segment_id text references segments(id),
  price_bdt int not null,
  was_bdt int,
  stock int default 0 not null,
  tag text,
  rating numeric(2,1) default 0,
  review_count int default 0 not null,
  status text default 'live' not null,
  description text,
  description_bn text,
  colors jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')), 'A')
    || setweight(to_tsvector('simple', coalesce(description,'')), 'B')
  ) stored,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_products_segment on products(segment_id);
create index if not exists idx_products_status  on products(status);
create index if not exists idx_products_search  on products using gin(search_tsv);
create index if not exists idx_products_slug    on products(slug);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int default 0 not null
);
create index if not exists idx_product_images_product on product_images(product_id, sort_order);

-- ─── Customers (Supabase Auth owns auth.users) ─────────────────────────
create table if not exists customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  accepts_marketing boolean default false not null,
  preferred_locale text default 'en',
  created_at timestamptz default now() not null
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  label text,
  full_name text,
  phone text,
  line1 text,
  line2 text,
  area text,
  city text,
  district text,
  division text,
  postcode text,
  country text default 'Bangladesh',
  is_default boolean default false not null
);
create index if not exists idx_addresses_customer on addresses(customer_id);

-- ─── Orders ────────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  customer_id uuid references auth.users(id) on delete set null,
  guest_email text,
  guest_phone text,
  status text default 'pending' not null,
  payment_method text not null,
  payment_ref text,
  subtotal_bdt int not null,
  shipping_bdt int default 0 not null,
  cod_fee_bdt int default 0 not null,
  total_bdt int not null,
  shipping_address jsonb not null,
  shipping_courier text,
  shipping_tracking text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status   on orders(status);
create index if not exists idx_orders_created  on orders(created_at desc);

create table if not exists order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text references products(id),
  name_snapshot text not null,
  sku_snapshot text not null,
  color text,
  size text,
  qty int not null,
  unit_price_bdt int not null,
  line_total_bdt int not null
);
create index if not exists idx_order_lines_order on order_lines(order_id);

-- ─── Reviews & Wishlist ────────────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  photo_urls jsonb default '[]'::jsonb,
  helpful_count int default 0 not null,
  created_at timestamptz default now() not null
);
create index if not exists idx_reviews_product on reviews(product_id);

create table if not exists wishlists (
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (customer_id, product_id)
);

-- ─── Audit + Inventory log ─────────────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  payload jsonb,
  ip text,
  ua text,
  created_at timestamptz default now() not null
);

create table if not exists inventory_log (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id),
  delta int not null,
  reason text not null,
  reference_id text,
  actor_id uuid,
  created_at timestamptz default now() not null
);

-- ─── Site settings ─────────────────────────────────────────────────────
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now() not null
);

-- ─── Row-Level Security ────────────────────────────────────────────────
-- Catalogue is public-readable.
alter table segments        enable row level security;
alter table products        enable row level security;
alter table product_images  enable row level security;

drop policy if exists "public reads visible segments" on segments;
create policy "public reads visible segments" on segments
  for select to anon, authenticated using (hidden = false);

drop policy if exists "public reads live products" on products;
create policy "public reads live products" on products
  for select to anon, authenticated using (status = 'live');

drop policy if exists "public reads product images" on product_images;
create policy "public reads product images" on product_images
  for select to anon, authenticated using (true);

-- Customer-owned data: users see only their own.
alter table customer_profiles enable row level security;
alter table addresses         enable row level security;
alter table orders            enable row level security;
alter table order_lines       enable row level security;
alter table wishlists         enable row level security;

drop policy if exists "own profile"    on customer_profiles;
create policy "own profile"    on customer_profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own addresses"  on addresses;
create policy "own addresses"  on addresses
  for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists "own orders"     on orders;
create policy "own orders"     on orders
  for select to authenticated using (customer_id = auth.uid());

drop policy if exists "own order lines" on order_lines;
create policy "own order lines" on order_lines
  for select to authenticated using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

drop policy if exists "own wishlist"    on wishlists;
create policy "own wishlist"    on wishlists
  for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Reviews: anyone reads, only authenticated can write
alter table reviews enable row level security;
drop policy if exists "public reads reviews" on reviews;
create policy "public reads reviews" on reviews for select to anon, authenticated using (true);
drop policy if exists "auth writes reviews"   on reviews;
create policy "auth writes reviews"  on reviews
  for insert to authenticated with check (customer_id = auth.uid());

-- Server (service-role key) bypasses RLS for admin mutations.

-- ─── Triggers: updated_at ──────────────────────────────────────────────
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
