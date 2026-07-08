-- Sanguine — discount codes (coupons)
-- Three discount types: percent off, fixed BDT off, free shipping.
-- Server-side validation only — never trust client price calculations.

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- 'EID2026', case-insensitive lookup
  description text,
  type text not null check (type in ('percent', 'fixed', 'free_shipping')),
  value int not null default 0,               -- 0-100 for percent, BDT for fixed, ignored for free_shipping
  min_subtotal_bdt int default 0,             -- minimum cart subtotal to qualify
  max_uses int,                               -- null = unlimited
  used_count int default 0 not null,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_coupons_code   on coupons(lower(code));
create index if not exists idx_coupons_active on coupons(is_active) where is_active = true;

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text,
  discount_bdt int not null,
  redeemed_at timestamptz default now() not null
);

create index if not exists idx_redemptions_coupon  on coupon_redemptions(coupon_id);
create index if not exists idx_redemptions_email   on coupon_redemptions(customer_email);

-- Add coupon columns on orders so the discount is preserved as a snapshot.
alter table orders
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_bdt int default 0 not null;

-- Trigger: keep updated_at fresh
drop trigger if exists trg_coupons_updated on coupons;
create trigger trg_coupons_updated before update on coupons
  for each row execute function set_updated_at();

-- RLS — service-role only
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
-- (no public policies — server-side validation only)
