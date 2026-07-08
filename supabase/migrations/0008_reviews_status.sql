-- Sanguine — Review moderation
--
-- Add a status column so the maison can vet reviews before they appear on
-- public PDPs. Default 'pending' for any new submission; admin approves
-- (or rejects) from /admin/reviews. Existing rows are auto-approved on
-- backfill — they were inserted by seed/admin before moderation existed.

alter table reviews
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists rejection_reason text;

-- Backfill any existing rows as approved so seed/demo data still shows.
update reviews set status = 'approved' where status = 'pending';

create index if not exists idx_reviews_product_status on reviews(product_id, status);
create index if not exists idx_reviews_status_created on reviews(status, created_at desc);
