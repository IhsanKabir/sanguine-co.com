-- Sanguine — Refund workflow
--
-- Each refund is a row in `refunds`; refunds can be partial or full. We do not
-- mutate the order's totalBdt — the original total is preserved as a snapshot.
-- The order's status flips to 'refunded' when a refund is issued (admin can
-- decide whether to leave it 'delivered' for a partial refund).
--
-- `recipient_method` is how we send the money back: bKash to the customer,
-- bank transfer, or 'cash' if the courier simply did not collect (cancelled
-- before delivery).

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  amount_bdt int not null check (amount_bdt > 0),
  reason text not null,
  method text not null check (method in ('bkash', 'bank', 'cash', 'card')),
  recipient_info text,
  -- bKash number, bank account, etc. Free-form so we can support any reasonable channel.
  processed_by uuid references auth.users(id) on delete set null,
  processed_by_email text,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_refunds_order on refunds(order_id);
create index if not exists idx_refunds_created on refunds(created_at desc);

alter table refunds enable row level security;
-- Service role only.
