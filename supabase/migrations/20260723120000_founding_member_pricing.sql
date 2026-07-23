-- Founding member pricing: track membership + chosen billing interval,
-- plus an atomic slot counter for the first 5 founding spots.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT;

CREATE TABLE IF NOT EXISTS public.founding_member_slots (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  slots_used INT NOT NULL DEFAULT 0,
  slots_total INT NOT NULL DEFAULT 5
);

INSERT INTO public.founding_member_slots (id, slots_used, slots_total)
VALUES (1, 0, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.founding_member_slots ENABLE ROW LEVEL SECURITY;

-- Atomically claims one of the 5 founding slots. Returns true if claimed.
CREATE OR REPLACE FUNCTION public.claim_founding_slot()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.founding_member_slots
  SET slots_used = slots_used + 1
  WHERE id = 1 AND slots_used < slots_total;
  RETURN FOUND;
END;
$$;

-- Releases a previously claimed slot (checkout abandoned/expired before payment).
CREATE OR REPLACE FUNCTION public.release_founding_slot()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.founding_member_slots
  SET slots_used = GREATEST(slots_used - 1, 0)
  WHERE id = 1;
END;
$$;

-- Public read-only count of remaining slots, for UI display.
CREATE OR REPLACE FUNCTION public.founding_slots_remaining()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT GREATEST(slots_total - slots_used, 0) FROM public.founding_member_slots WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.claim_founding_slot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_founding_slot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_founding_slot() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_founding_slot() TO service_role;
GRANT EXECUTE ON FUNCTION public.founding_slots_remaining() TO authenticated, anon;
