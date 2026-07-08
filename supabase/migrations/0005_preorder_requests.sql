-- Sanguine — Pre-order (bespoke request) system
--
-- Two parts:
--   1) Per-segment toggles: stock_enabled + preorder_enabled (independent).
--      A segment with stock_enabled=false hides its product listings entirely
--      from the storefront. preorder_enabled=true reveals the bespoke request
--      CTA on that segment's page.
--
--   2) preorder_requests: the bespoke request form submissions. Each one is
--      a customer's free-form description of what they want, with attached
--      reference images/videos. Admin reviews → quotes a price → on agreement
--      converts to a real order in the orders table.
--
-- Files referenced by attachments[] live in Supabase Storage bucket
-- `preorder-attachments` (private). Customers can write to their own prefix
-- (auth.uid()/...) and read their own files. Admins use the service role
-- which bypasses RLS.

-- ─── Segment toggles ──────────────────────────────────────────────────
alter table segments
  add column if not exists stock_enabled    boolean default true  not null,
  add column if not exists preorder_enabled boolean default false not null;

-- ─── Pre-order requests table ─────────────────────────────────────────
create table if not exists preorder_requests (
  id              uuid primary key default gen_random_uuid(),
  segment_id      text not null references segments(id),
  customer_id     uuid not null references auth.users(id) on delete restrict,
  customer_email  text not null,
  customer_phone  text,
  customer_name   text,

  description     text not null,                 -- what they want, free-form
  quantity        int  default 1 not null check (quantity > 0),
  budget_hint_bdt int,                           -- optional budget signal
  target_date     date,                          -- when they need it

  delivery_address jsonb,                        -- {line1, area, city, ...}
  attachments     jsonb default '[]'::jsonb not null,
  -- attachments shape: [{ url, path, type ('image'|'video'), size_bytes, mime }]

  status          text default 'new' not null check (status in
    ('new', 'reviewing', 'quoted', 'confirmed', 'rejected', 'converted')),
  admin_notes     text,
  quoted_price_bdt int,
  rejection_reason text,
  converted_order_id uuid references orders(id) on delete set null,

  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists idx_preorder_status   on preorder_requests(status);
create index if not exists idx_preorder_customer on preorder_requests(customer_id);
create index if not exists idx_preorder_segment  on preorder_requests(segment_id);
create index if not exists idx_preorder_created  on preorder_requests(created_at desc);

drop trigger if exists trg_preorder_updated on preorder_requests;
create trigger trg_preorder_updated before update on preorder_requests
  for each row execute function set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table preorder_requests enable row level security;

-- Customers may insert their own requests and read their own back.
drop policy if exists "preorder_owner_insert" on preorder_requests;
create policy "preorder_owner_insert" on preorder_requests
  for insert to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "preorder_owner_read" on preorder_requests;
create policy "preorder_owner_read" on preorder_requests
  for select to authenticated
  using (customer_id = auth.uid());

-- Service role (admin server actions) bypasses RLS automatically.

-- ─── Storage bucket: preorder-attachments ────────────────────────────
-- Create the bucket if it doesn't exist. Private (no public read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'preorder-attachments',
  'preorder-attachments',
  false,
  10485760,                                      -- 10 MB per file
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS for storage.objects on this bucket.
-- Path convention enforced client-side: `{auth.uid()}/{request_uuid}/{filename}`
drop policy if exists "preorder_attachments_owner_insert" on storage.objects;
create policy "preorder_attachments_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'preorder-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "preorder_attachments_owner_read" on storage.objects;
create policy "preorder_attachments_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'preorder-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "preorder_attachments_owner_delete" on storage.objects;
create policy "preorder_attachments_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'preorder-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
