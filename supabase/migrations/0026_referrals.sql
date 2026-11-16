-- Referrals that actually pay out (owner, 2026-11-16): a friend's code takes 200 BDT off
-- their first bouquet; once that order is delivered, the friend who shared the code earns
-- 200 BDT off their own next order. Before this, the account page promised 500 BDT both
-- ways and nothing applied it.
-- Codes and credits belong to an email address, so guests take part without an account
-- and nobody has to sign in to use a credit (owner: as few steps as possible).
-- Apply BEFORE deploying the code that reads these tables.

-- One code per email. Account holders keep the code their account page already shows.
create table if not exists referral_codes (
  code text primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists referral_codes_email_key on referral_codes (lower(email));
insert into referral_codes (code, email)
  select p.referral_code, lower(u.email)
  from customer_profiles p join auth.users u on u.id = p.id
  where p.referral_code is not null and u.email is not null
on conflict do nothing;

-- On the request: the code the customer typed, and what the quote took off.
alter table preorder_requests add column if not exists referral_code text;
alter table preorder_requests add column if not exists referral_discount_bdt integer;
-- Set when the customer's own earned credit was used on this quote.
alter table preorder_requests add column if not exists referral_credit_id uuid;

-- One row per referred customer: the reward of the customer who shared the code.
-- pending (friend's order not yet delivered) | earned | used | void
create table if not exists referral_credits (
  id uuid primary key default gen_random_uuid(),
  referrer_email text not null,
  referred_email text not null,
  preorder_id uuid not null,
  order_id uuid,
  amount_bdt integer not null check (amount_bdt > 0),
  status text not null default 'pending' check (status in ('pending', 'earned', 'used', 'void')),
  used_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- A customer can be referred once.
create unique index if not exists referral_credits_referred_email_key on referral_credits (lower(referred_email));
create index if not exists referral_credits_referrer_idx on referral_credits (lower(referrer_email), status);
create index if not exists referral_credits_order_idx on referral_credits (order_id);
create index if not exists referral_credits_used_order_idx on referral_credits (used_order_id);

-- The database's own guard against two quotes taking the same discount at once:
-- a credit is held by one open quote at a time, and a friend's code gives one
-- discounted order per email, ever (code review, 16 Nov 2026).
create unique index if not exists preorder_requests_credit_held_key on preorder_requests (referral_credit_id)
  where referral_credit_id is not null and status in ('quoted', 'confirmed');
create unique index if not exists preorder_requests_friend_code_once_key on preorder_requests (lower(customer_email))
  where referral_credit_id is null and referral_discount_bdt > 0 and status in ('quoted', 'confirmed', 'converted');

alter table referral_codes enable row level security;
alter table referral_credits enable row level security;
-- Service role only; the site reaches both through server actions.
