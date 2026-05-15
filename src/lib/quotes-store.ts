import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type QuoteStatus = "bozza" | "inviato" | "accettato" | "rifiutato";

export interface QuoteItem {
  id: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
}

export interface Quote {
  id: string;
  numero: string;
  clienteId: string;
  data: string;
  titolo: string;
  descrizione: string;
  voci: QuoteItem[];
  note: string;
  ivaPercentuale: number;
  stato: QuoteStatus;
}

type Row = {
  id: string;
  numero: string;
  cliente_id: string | null;
  data: string;
  titolo: string;
  descrizione: string;
  voci: QuoteItem[] | null;
  note: string;
  iva_percentuale: number | string;
  stato: QuoteStatus;
};

const rowToQuote = (r: Row): Quote => ({
  id: r.id,
  numero: r.numero ?? "",
  clienteId: r.cliente_id ?? "",
  data: r.data,
  titolo: r.titolo ?? "",
  descrizione: r.descrizione ?? "",
  voci: (r.voci ?? []).map((v: any, i: number) => ({
    id: v.id || `v${r.id}-${i}-${Date.now()}`,
    descrizione: v.descrizione ?? "",
    quantita: Number(v.quantita) || 0,
    unita: v.unita ?? "cad",
    prezzoUnitario: Number(v.prezzo_unitario ?? v.prezzoUnitario) || 0,
  })),
  note: r.note ?? "",
  ivaPercentuale: typeof r.iva_percentuale === "string" ? parseFloat(r.iva_percentuale) : r.iva_percentuale,
  stato: r.stato,
});

const quoteToRow = (q: Omit<Quote, "id" | "numero">) => ({
  cliente_id: q.clienteId || null,
  data: q.data,
  titolo: q.titolo,
  descrizione: q.descrizione,
  voci: q.voci.map((v) => ({
    id: v.id,
    descrizione: v.descrizione,
    quantita: v.quantita,
    unita: (v as any).unita ?? "cad",
    prezzo_unitario: v.prezzoUnitario,
  })) as unknown as never,
  note: q.note,
  iva_percentuale: q.ivaPercentuale,
  stato: q.stato,
});

let quotes: Quote[] = [];
let loaded = false;
let loading = false;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => quotes;

export async function loadQuotes() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[quotes-store] load error:", error);
      toast.error(`Errore caricamento preventivi: ${error.message}`);
      return;
    }
    quotes = (data ?? []).map((r) => rowToQuote(r as Row));
    loaded = true;
    emit();
  } finally {
    loading = false;
  }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) loadQuotes();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      quotes = [];
      loaded = false;
      emit();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      loadQuotes();
    }
  });
}

export function useQuotes() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded && !loading) loadQuotes();
  }, []);
  return value;
}

function nextNumero(): string {
  const year = new Date().getFullYear();
  const sameYear = quotes.filter((q) => q.numero.startsWith(`${year}-`));
  const next = String(sameYear.length + 1).padStart(3, "0");
  return `${year}-${next}`;
}

export async function addQuote(data: Omit<Quote, "id" | "numero">): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    toast.error("Utente non autenticato");
    return false;
  }
  const numero = nextNumero();
  const { data: row, error } = await supabase
    .from("quotes")
    .insert({ ...quoteToRow(data), numero, user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) {
    console.error("[quotes-store] add error:", error);
    toast.error(`Errore salvataggio preventivo: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  quotes = [rowToQuote(row as Row), ...quotes];
  emit();
  return true;
}

export async function updateQuote(id: string, data: Omit<Quote, "id" | "numero">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("quotes")
    .update(quoteToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[quotes-store] update error:", error);
    toast.error(`Errore aggiornamento preventivo: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  quotes = quotes.map((q) => (q.id === id ? rowToQuote(row as Row) : q));
  emit();
  return true;
}

export async function setQuoteStatus(id: string, stato: QuoteStatus): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("quotes")
    .update({ stato })
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[quotes-store] setStatus error:", error);
    toast.error(`Errore cambio stato: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  quotes = quotes.map((q) => (q.id === id ? rowToQuote(row as Row) : q));
  emit();
  return true;
}

export async function deleteQuote(id: string): Promise<boolean> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) {
    console.error("[quotes-store] delete error:", error);
    toast.error(`Errore eliminazione preventivo: ${error.message}`);
    return false;
  }
  quotes = quotes.filter((q) => q.id !== id);
  emit();
  return true;
}

export function calcTotals(voci: QuoteItem[], ivaPercentuale: number) {
  const subtotale = voci.reduce((s, v) => s + v.quantita * v.prezzoUnitario, 0);
  const iva = subtotale * (ivaPercentuale / 100);
  const totale = subtotale + iva;
  return { subtotale, iva, totale };
}

export const formatEuro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
