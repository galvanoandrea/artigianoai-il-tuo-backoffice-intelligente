-- Condivisione del preventivo con il cliente.
--
-- Il cliente riceve un link con un token casuale e non ha un account: la lettura
-- e la risposta passano da una funzione serverless che usa il service role, così
-- le policy RLS delle quotes restano invariate (solo il proprietario vede le
-- proprie righe con la chiave anon).

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS share_token   TEXT,
  ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_by  TEXT;

-- Il token è la sola credenziale del link: deve essere univoco.
CREATE UNIQUE INDEX IF NOT EXISTS quotes_share_token_key
  ON public.quotes (share_token)
  WHERE share_token IS NOT NULL;
