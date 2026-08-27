-- Tracks when the admin manually activated a user's annual subscription
-- (after receiving payment outside the platform), so the app can count
-- down the remaining days of the 1-year period.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
