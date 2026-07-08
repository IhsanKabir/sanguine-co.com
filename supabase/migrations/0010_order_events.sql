-- Sanguine — Append-only events log per order
--
-- One row per material thing that happens to an order: created, status change,
-- courier booked, refund issued, customer email sent, etc. Renders as a
-- timeline in the admin order drawer so the operator can see the full story.
--
-- Append-only by convention (no UPDATE / DELETE in app code). RLS service-role
-- only — admins read via server actions.

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  type text not null,
  -- 'created' | 'status_changed' | 'courier_booked' | 'refund_issued'
  -- | 'note_added' | 'email_sent' | 'sms_sent' | 'payment_received'
  payload jsonb default '{}'::jsonb not null,
  -- Free-form context: { from: 'cod_pending', to: 'shipped' } for status_changed,
  -- { courier: 'pathao', tracking: '...' } for courier_booked, etc.
  actor_id uuid references auth.users(id) on delete set null,
  -- null when the event is system-emitted (e.g. order_placed by customer)
  actor_email text,
  -- Snapshot the email at event time so deleted users still show "by alice@..."
  created_at timestamptz default now() not null
);

create index if not exists idx_order_events_order_created on order_events(order_id, created_at desc);
create index if not exists idx_order_events_type on order_events(type);

alter table order_events enable row level security;
-- Service role only.
