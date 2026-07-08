-- Sanguine — Notify-me-when-back-in-stock
--
-- A customer (or guest with an email) registers their interest in a sold-out
-- piece. When admin restocks (stock 0 → positive), an email is sent and the
-- row is marked notified. We keep notified rows for analytics — they reveal
-- which pieces have the most repressed demand.

create table if not exists stock_notifications (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  email text not null,
  created_at timestamptz default now() not null,
  notified_at timestamptz
);

create index if not exists idx_stock_notif_product on stock_notifications(product_id) where notified_at is null;
create index if not exists idx_stock_notif_email on stock_notifications(lower(email));

-- One pending registration per (product, email) — re-clicking "notify me"
-- should not duplicate.
create unique index if not exists uq_stock_notif_pending
  on stock_notifications(product_id, lower(email))
  where notified_at is null;

alter table stock_notifications enable row level security;
-- Service role only; customer-facing reads happen via server actions.
