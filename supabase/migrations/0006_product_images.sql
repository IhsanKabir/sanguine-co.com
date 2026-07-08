-- Sanguine — Product image upload (admin-managed)
--
-- Two parts:
--   1) Add `path` column to product_images so we can remove the file from
--      Storage when the row is deleted (otherwise we'd leak orphan blobs).
--   2) Create the `product-images` Storage bucket with RLS that lets
--      admin-tier users upload/delete from the browser using their session
--      JWT, and lets anyone (anon) read so storefront <Image> tags work.

-- ─── Schema: add storage path on product_images ───────────────────────
alter table product_images
  add column if not exists path text;

-- ─── Storage bucket: product-images ───────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,                                   -- public read so <Image> works without signed URLs
  8388608,                                -- 8 MB per file (high-quality product photos)
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── RLS policies on storage.objects for this bucket ─────────────────
-- Admin-tier users (owner / admin / subadmin with `products` permission)
-- can write to the bucket directly from the browser using their JWT.
-- The role check reads app_metadata.role from the JWT.

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin', 'subadmin')
  );

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin', 'subadmin')
  );

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin', 'subadmin')
  );

-- Public read is implicit because the bucket is public; the storefront
-- <Image> tags hit the public CDN URL with no auth required.
