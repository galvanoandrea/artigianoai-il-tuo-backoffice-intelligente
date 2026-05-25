-- Add approved_at timestamp to track trial start date
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill: approved users without a date get now() as a safe default
UPDATE public.profiles
SET approved_at = now()
WHERE approved = true AND approved_at IS NULL;
