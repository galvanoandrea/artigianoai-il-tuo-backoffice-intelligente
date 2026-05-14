-- Business data tables (per-user) with Row Level Security
-- Clients, suppliers (fornitori), quotes, payments (pagamenti)

-- Helper trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- ============ CLIENTS ============
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ragione_sociale TEXT NOT NULL DEFAULT '',
  referente TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  indirizzo TEXT NOT NULL DEFAULT '',
  partita_iva TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','potenziale','inattivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_own" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_own" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete_own" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FORNITORI ============
CREATE TABLE IF NOT EXISTS public.fornitori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ragione_sociale TEXT NOT NULL DEFAULT '',
  referente TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  partita_iva TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fornitori_user_id ON public.fornitori(user_id);
ALTER TABLE public.fornitori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornitori_select_own" ON public.fornitori FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fornitori_insert_own" ON public.fornitori FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fornitori_update_own" ON public.fornitori FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fornitori_delete_own" ON public.fornitori FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_fornitori_updated_at BEFORE UPDATE ON public.fornitori
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUOTES ============
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL DEFAULT '',
  cliente_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  titolo TEXT NOT NULL DEFAULT '',
  descrizione TEXT NOT NULL DEFAULT '',
  voci JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT NOT NULL DEFAULT '',
  iva_percentuale NUMERIC(5,2) NOT NULL DEFAULT 22,
  stato TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza','inviato','accettato','rifiutato')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_cliente_id ON public.quotes(cliente_id);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select_own" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert_own" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update_own" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete_own" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAGAMENTI ============
CREATE TABLE IF NOT EXISTS public.pagamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornitore_id UUID REFERENCES public.fornitori(id) ON DELETE SET NULL,
  descrizione TEXT NOT NULL DEFAULT '',
  importo NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_scadenza DATE NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento DATE,
  stato TEXT NOT NULL DEFAULT 'da_pagare' CHECK (stato IN ('da_pagare','pagato')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagamenti_user_id ON public.pagamenti(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamenti_fornitore_id ON public.pagamenti(fornitore_id);
ALTER TABLE public.pagamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagamenti_select_own" ON public.pagamenti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pagamenti_insert_own" ON public.pagamenti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pagamenti_update_own" ON public.pagamenti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pagamenti_delete_own" ON public.pagamenti FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_pagamenti_updated_at BEFORE UPDATE ON public.pagamenti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
