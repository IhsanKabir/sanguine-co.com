-- Step D: a one-time SMS code before cash-on-delivery orders.
--
-- One row per code sent. The code itself is never stored, only a SHA-256
-- of it with the row id, so a database read can't be replayed as a code.
-- attempts caps guesses per code; the send-rate limit counts rows per phone
-- and per IP. A row whose SMS failed (status 'send_failed') lets that one
-- checkout through unverified, and the order is marked so in its timeline.
-- Apply BEFORE deploying the code that reads this table.

create table if not exists phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                       -- normalised 8801XXXXXXXXX
  code_hash text not null,
  status text not null default 'sent',       -- 'sent' | 'send_failed'
  attempts integer not null default 0,
  ip text,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_phone_verifications_phone on phone_verifications(phone, created_at desc);
create index if not exists idx_phone_verifications_ip on phone_verifications(ip, created_at desc);

alter table phone_verifications enable row level security;
-- Service role only; checkout reaches it through server actions.
