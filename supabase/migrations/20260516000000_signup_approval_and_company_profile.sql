-- Approval flag (default FALSE: nuovi utenti in attesa di approvazione admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Aggiungi campi azienda per intestazione preventivi
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_azienda TEXT,
  ADD COLUMN IF NOT EXISTS cap TEXT,
  ADD COLUMN IF NOT EXISTS citta TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT;

-- Aggiorna trigger di creazione profilo per riempire nome_completo, nome_azienda da metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, nome_azienda, approved)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'nome_azienda',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Approva automaticamente l'utente admin (per non bloccare il proprietario)
UPDATE public.profiles p
SET approved = TRUE
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- Funzione helper sicura per leggere lo stato approved dell'utente corrente
CREATE OR REPLACE FUNCTION public.is_current_user_approved()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT approved FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_approved() TO authenticated, anon;
