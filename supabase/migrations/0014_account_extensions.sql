-- Account page extensions: style preferences, notifications, referral, birthday
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS birthday        text,
  ADD COLUMN IF NOT EXISTS anniversary     text,
  ADD COLUMN IF NOT EXISTS perfume_family  text,
  ADD COLUMN IF NOT EXISTS book_genre      text,
  ADD COLUMN IF NOT EXISTS flower_preference text,
  ADD COLUMN IF NOT EXISTS notify_email    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code   text UNIQUE;
