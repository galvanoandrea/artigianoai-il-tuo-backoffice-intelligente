-- Fix: UPDATE su clients/fornitori/quotes/pagamenti falliva perché il trigger
-- BEFORE UPDATE chiama update_updated_at_column() ma EXECUTE era stato
-- revocato da authenticated/anon nella migration precedente.
--
-- Rendiamo la funzione SECURITY DEFINER così gira come owner senza richiedere
-- EXECUTE all'utente chiamante, e in ogni caso ripristiniamo EXECUTE.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, anon, service_role;
