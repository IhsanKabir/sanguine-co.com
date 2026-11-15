-- Same-day express for flowers in Dhaka (owner, 2026-11-15): the customer pays a
-- fixed fee to get the bouquet the same day. Null means standard delivery.
-- Apply BEFORE deploying the code that writes this column.

alter table preorder_requests add column if not exists express_fee_bdt integer;
