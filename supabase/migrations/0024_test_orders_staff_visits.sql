-- 0024: test orders and the shop's own visits (13 Nov 2026).
-- Additive and safe to run twice. Run it in the Supabase SQL editor BEFORE
-- merging the PR that reads these columns: the app selects them by name.

-- 1. Test orders. A flag, not a delete: they stay in Admin, Orders with a
--    "Test" label, and every revenue figure and order count leaves them out
--    (src/lib/revenue.ts). The owner confirmed on 13 Nov that every order so
--    far was a test.
alter table orders add column if not exists is_test boolean not null default false;

update orders set is_test = true
where number in (
  'SSG-RF7XO2UE', 'SSG-RK6XRWU4', 'SSG-SD7JP8MC', 'SSG-P49EU4M2',
  'SSG-RRT0X3SI', 'SSG-87Z8JVN3', 'SSG-1AX2X9LJ', 'SSG-PO-MRKFG27B'
);

-- 2. The shop's own visits. A browser that opens Admin gets a cookie, and its
--    storefront events are written with is_staff = true; Admin, Behaviour
--    leaves them out. Past events are flagged here by browser: the session id
--    lives in a 30-day cookie, so a browser that ever opened Admin is ours.
alter table events add column if not exists is_staff boolean not null default false;

update events set is_staff = true
where session_id in (
  select distinct session_id from events
  where path like '/admin%' and session_id is not null
);
