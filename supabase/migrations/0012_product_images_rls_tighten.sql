-- Sanguine — Tighten product-images bucket RLS to require the `products`
-- permission, not just admin tier.
--
-- Original policies in 0006 allowed any role in ('owner','admin','subadmin')
-- to write the bucket. That meant a sub-admin granted only `orders` or
-- `reports` could still upload product images directly from the browser.
-- This migration replaces those policies so the JWT must explicitly carry
-- `products` in its app_metadata.permissions array (or be owner/admin who
-- have all permissions).

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'products'
      )
    )
  );

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'products'
      )
    )
  );

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'products'
      )
    )
  );
