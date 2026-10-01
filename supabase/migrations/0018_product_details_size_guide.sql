-- Step 4 (product page): materials & care per product, size guide per segment.
-- All nullable text; the storefront shows each block only when it is filled.
-- Apply BEFORE deploying the code that reads these columns.
alter table products add column if not exists details text;
alter table products add column if not exists details_bn text;
alter table products add column if not exists care text;
alter table products add column if not exists care_bn text;
alter table segments add column if not exists size_guide text;
alter table segments add column if not exists size_guide_bn text;
