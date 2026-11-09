-- Flowers are bought for a day: customers choose a delivery date and add a
-- card message. Both optional. preorder_requests already has target_date.
-- Apply BEFORE deploying the code that writes these columns.

alter table orders add column if not exists delivery_date date;
alter table orders add column if not exists gift_message text;
alter table preorder_requests add column if not exists gift_message text;
