import { useEffect, useSyncExternalStore } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type QuoteItem } from "./quotes-store";

export type FatturaStatus = "bozza" | "inviata" | "pagata" | "scaduta";

export interface Fattura {
  id: string;
  numero: string;
  clienteId: string;
  preventivoId: string;
  dataEmissione: string;
  dataScadenza: string;
  stato: FatturaStatus;
  voci: QuoteItem[];
  ivaPercentuale: number;
  note: string;
}

type Row = {
  id: string;
  numero: string;
  cliente_id: string | null;
  preventivo_id: string | null;
  data_emissione: string;
  data_scadenza: string;
  stato: FatturaStatus;
  voci: unknown[];
  iva_percentuale: number | string;
  note: string | null;
};

function effectiveStato(stato: FatturaStatus, dataScadenza: string): FatturaStatus {
  if (stato === "inviata" && new Date(dataScadenza) < new Date()) return "scaduta";
  return stato;
}

const rowToFattura = (r: Row): Fattura => ({
  id: r.id,
  numero: r.numero ?? "",
  clienteId: r.cliente_id ?? "",
  preventivoId: r.preventivo_id ?? "",
  dataEmissione: r.data_emissione,
  dataScadenza: r.data_scadenza,
  stato: effectiveStato(r.stato, r.data_scadenza),
  voci: (r.voci ?? []).map((v: any, i: number) => ({
    id: v.id || `v${r.id}-${i}`,
    descrizione: v.descrizione ?? "",
    quantita: Number(v.quantita) || 0,
    prezzoUnitario: Number(v.prezzo_unitario ?? v.prezzoUnitario) || 0,
  })),
  ivaPercentuale: typeof r.iva_percentuale === "string" ? parseFloat(r.iva_percentuale) : r.iva_percentuale,
  note: r.note ?? "",
});

const fatturaToRow = (f: Omit<Fattura, "id" | "numero">) => ({
  cliente_id: f.clienteId || null,
  preventivo_id: f.preventivoId || null,
  data_emissione: f.dataEmissione,
  data_scadenza: f.dataScadenza,
  stato: f.stato,
  voci: f.voci.map((v) => ({
    id: v.id,
    descrizione: v.descrizione,
    quantita: v.quantita,
    prezzo_unitario: v.prezzoUnitario,
  })),
  iva_percentuale: f.ivaPercentuale,
  note: f.note || null,
});

let fatture: Fattura[] = [];
let loaded = false;
let loading = false;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => fatture;

export async function loadFatture() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from("fatture")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[fatture-store] load error:", error);
      toast.error(`Errore caricamento fatture: ${authErrorMessage(error)}`);
      return;
    }
    fatture = (data ?? []).map((r) => rowToFattura(r as unknown as Row));
    loaded = true;
    emit();
  } finally {
    loading = false;
  }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) loadFatture();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      fatture = [];
      loaded = false;
      emit();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      loadFatture();
    }
  });
}

export function useFatture() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded && !loading) loadFatture();
  }, []);
  return value;
}

function nextNumero(): string {
  const year = new Date().getFullYear();
  const sameYear = fatture.filter((f) => f.numero.startsWith(`FAT-${year}-`));
  const next = String(sameYear.length + 1).padStart(3, "0");
  return `FAT-${year}-${next}`;
}

export async function addFattura(data: Omit<Fattura, "id" | "numero">): Promise<Fattura | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) { toast.error("Utente non autenticato"); return null; }
  const numero = nextNumero();
  const { data: row, error } = await supabase
    .from("fatture")
    .insert({ ...fatturaToRow(data), numero, user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) {
    toast.error(`Errore salvataggio fattura: ${authErrorMessage(error, "risposta vuota")}`);
    return null;
  }
  const f = rowToFattura(row as unknown as Row);
  fatture = [f, ...fatture];
  emit();
  return f;
}

export async function updateFattura(id: string, data: Omit<Fattura, "id" | "numero">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("fatture")
    .update(fatturaToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    toast.error(`Errore aggiornamento fattura: ${authErrorMessage(error, "risposta vuota")}`);
    return false;
  }
  fatture = fatture.map((f) => (f.id === id ? rowToFattura(row as unknown as Row) : f));
  emit();
  return true;
}

export async function setFatturaStatus(id: string, stato: FatturaStatus): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("fatture")
    .update({ stato })
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    toast.error(`Errore cambio stato: ${authErrorMessage(error, "risposta vuota")}`);
    return false;
  }
  fatture = fatture.map((f) => (f.id === id ? rowToFattura(row as unknown as Row) : f));
  emit();
  return true;
}

export async function deleteFattura(id: string): Promise<boolean> {
  const { error } = await supabase.from("fatture").delete().eq("id", id);
  if (error) {
    toast.error(`Errore eliminazione fattura: ${authErrorMessage(error)}`);
    return false;
  }
  fatture = fatture.filter((f) => f.id !== id);
  emit();
  return true;
}
