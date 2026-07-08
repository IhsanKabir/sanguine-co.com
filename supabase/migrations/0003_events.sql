-- Sanguine — events table for behavior analytics
-- Lightweight event tracking. Server-side, fire-and-forget. Read by admin reports.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  -- 'session_start' | 'page_view' | 'product_view' | 'search'
  -- | 'add_to_cart' | 'wishlist_toggle' | 'checkout_start'
  -- | 'order_placed' | 'order_paid' | 'admin_action'
  session_id text,
  customer_id uuid references auth.users(id) on delete set null,
  product_id text references products(id) on delete set null,
  payload jsonb default '{}'::jsonb,
  -- e.g. {"query":"velvet"} for search, {"qty":2,"color":"Aubergine"} for ATC
  ua text,
  referrer text,
  path text,
  ip text,
  created_at timestamptz default now() not null
);

create index if not exists idx_events_type    on events(type);
create index if not exists idx_events_created on events(created_at desc);
create index if not exists idx_events_session on events(session_id);
create index if not exists idx_events_product on events(product_id);
create index if not exists idx_events_customer on events(customer_id);

-- Public/anon clients should NOT see events. Server-side queries via service-role bypass RLS.
alter table events enable row level security;
-- No SELECT policy → service-role only.

-- Helpful aggregates view (optional, simplifies admin queries)
create or replace view event_funnel_30d as
  select
    count(*) filter (where type = 'session_start')   as sessions,
    count(*) filter (where type = 'product_view')    as product_views,
    count(*) filter (where type = 'add_to_cart')     as adds_to_cart,
    count(*) filter (where type = 'checkout_start')  as checkout_starts,
    count(*) filter (where type = 'order_placed')    as orders_placed
  from events
  where created_at > now() - interval '30 days';
