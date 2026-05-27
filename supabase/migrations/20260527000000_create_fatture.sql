-- Create fatture (invoices) table
CREATE TABLE IF NOT EXISTS public.fatture (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id       UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  preventivo_id    UUID        REFERENCES public.quotes(id) ON DELETE SET NULL,
  numero           TEXT        NOT NULL,
  data_emissione   DATE        NOT NULL,
  data_scadenza    DATE        NOT NULL,
  stato            TEXT        NOT NULL DEFAULT 'bozza'
                               CHECK (stato IN ('bozza', 'inviata', 'pagata', 'scaduta')),
  voci             JSONB       NOT NULL DEFAULT '[]',
  iva_percentuale  NUMERIC     NOT NULL DEFAULT 22,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fatture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatture_owner" ON public.fatture
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER fatture_updated_at
  BEFORE UPDATE ON public.fatture
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
