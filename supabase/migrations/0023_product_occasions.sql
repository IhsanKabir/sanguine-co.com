-- Shop by occasion: each product lists the occasions it suits (ids from
-- src/lib/occasions.ts). Additive and idempotent, safe to run before the deploy.
alter table products add column if not exists occasions jsonb not null default '[]'::jsonb;
create index if not exists idx_products_occasions on products using gin (occasions);
