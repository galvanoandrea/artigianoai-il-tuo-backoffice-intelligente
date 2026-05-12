ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS cognome text,
  ADD COLUMN IF NOT EXISTS indirizzo text;