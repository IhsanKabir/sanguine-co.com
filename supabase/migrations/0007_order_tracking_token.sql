-- Sanguine — Per-order tracking token for /order/[number]/track privacy
--
-- Without this, anyone who knows or guesses an SSG-XXXX number can see the
-- customer's name, address, and phone number on the public tracking page.
-- A random tracking token in the URL closes that hole; the token is included
-- in the order-confirmation + shipped emails and is the only way to open the
-- tracking page anonymously. Signed-in customers can still see their own
-- orders without a token.

alter table orders
  add column if not exists tracking_token text;

-- Backfill existing orders with a generated token so historical tracking links
-- continue to work after the gate is enabled.
update orders set tracking_token = encode(gen_random_bytes(16), 'hex')
where tracking_token is null;

-- Make required + indexed for fast lookups.
alter table orders
  alter column tracking_token set not null,
  alter column tracking_token set default encode(gen_random_bytes(16), 'hex');

create unique index if not exists idx_orders_tracking_token on orders(tracking_token);
