-- Sanguine — quotation-driven pricing model (IMPROVEMENT-PLAN Phase 1)
--
-- Owner decision (2026-07-13): the actual selling price of a preorder piece is
-- established by quotation after research. Until then the catalogue can carry
-- at most an ESTIMATED RANGE. The preorder prepayment ("deposit") is a
-- configurable PERCENTAGE of the quoted actual price — global default lives in
-- site_settings.commerce (key/jsonb, no schema change), overridable per product.
-- Return window: 7-day default, overridable per product.
--
-- products.preorder_price_bdt is DEPRECATED by this model (it conflated
-- "estimate" with "deposit"). Existing values are the owner's price estimates,
-- so they migrate into price_max_bdt below; the column stays for rollback
-- safety and is no longer read by the app.

alter table products
  add column if not exists price_min_bdt integer,
  add column if not exists price_max_bdt integer,
  add column if not exists preorder_deposit_pct integer,
  add column if not exists return_window_days integer;

alter table products drop constraint if exists products_price_range_chk;
alter table products add constraint products_price_range_chk
  check (
    price_min_bdt is null or price_max_bdt is null
    or (price_min_bdt >= 1 and price_min_bdt <= price_max_bdt)
  );

alter table products drop constraint if exists products_deposit_pct_chk;
alter table products add constraint products_deposit_pct_chk
  check (preorder_deposit_pct is null or (preorder_deposit_pct between 1 and 100));

alter table products drop constraint if exists products_return_window_chk;
alter table products add constraint products_return_window_chk
  check (return_window_days is null or (return_window_days between 0 and 365));

-- Preorder requests snapshot what the customer was shown at request time, and
-- the deposit computed at quote time (deposit = quoted unit price × pct / 100).
alter table preorder_requests
  add column if not exists advertised_min_bdt integer,
  add column if not exists advertised_max_bdt integer,
  add column if not exists advertised_deposit_pct integer,
  add column if not exists deposit_bdt integer;

-- Data repair: zero-priced preorder rows carry the owner's estimate in the
-- deprecated preorder_price_bdt — surface it as the range ceiling so nothing
-- customer-facing ever renders ৳0 again.
update products
set price_max_bdt = preorder_price_bdt
where price_bdt = 0
  and preorder_price_bdt is not null
  and price_max_bdt is null;
