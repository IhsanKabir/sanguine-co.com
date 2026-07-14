-- Sanguine — deposit is a PAYMENT, not a discount (retro-review fix)
--
-- convertPreorderToOrder briefly recorded the prepaid bKash deposit in
-- coupon_discount_bdt. That made totalBdt exclude money the customer actually
-- paid, so: refunds capped below the true amount paid (OVER_REFUND on
-- returning the deposit), revenue reports silently dropped every deposit, and
-- the invoice mislabeled it "Discount". Dedicated column instead.

alter table orders
  add column if not exists deposit_paid_bdt integer not null default 0;

alter table orders drop constraint if exists orders_deposit_paid_chk;
alter table orders add constraint orders_deposit_paid_chk
  check (deposit_paid_bdt >= 0);

-- Repair any converted-preorder rows created under the old model.
update orders
set deposit_paid_bdt = coupon_discount_bdt,
    coupon_discount_bdt = 0
where number like 'SSG-PO-%'
  and coupon_discount_bdt > 0;
