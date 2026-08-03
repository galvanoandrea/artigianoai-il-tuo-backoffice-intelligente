import { useEffect, useSyncExternalStore } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
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
  shareToken: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
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
  // Aggiunte dalla migrazione 20260803090000: assenti finché non viene eseguita.
  share_token?: string | null;
  sent_at?: string | null;
  responded_at?: string | null;
  responded_by?: string | null;
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
  shareToken: r.share_token ?? null,
  sentAt: r.sent_at ?? null,
  respondedAt: r.responded_at ?? null,
  respondedBy: r.responded_by ?? null,
});

const quoteToRow = (q: QuoteDraft) => ({
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

/** Quello che un form compila: i campi di condivisione li imposta lo store. */
export type QuoteDraft = Omit<Quote, "id" | "numero" | "shareToken" | "sentAt" | "respondedAt" | "respondedBy">;

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
      toast.error(`Errore caricamento preventivi: ${authErrorMessage(error)}`);
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

export async function addQuote(data: QuoteDraft): Promise<boolean> {
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
    toast.error(`Errore salvataggio preventivo: ${authErrorMessage(error, "risposta vuota")}`);
    return false;
  }
  quotes = [rowToQuote(row as Row), ...quotes];
  emit();
  return true;
}

export async function updateQuote(id: string, data: QuoteDraft): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("quotes")
    .update(quoteToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[quotes-store] update error:", error);
    toast.error(`Errore aggiornamento preventivo: ${authErrorMessage(error, "risposta vuota")}`);
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
    toast.error(`Errore cambio stato: ${authErrorMessage(error, "risposta vuota")}`);
    return false;
  }
  quotes = quotes.map((q) => (q.id === id ? rowToQuote(row as Row) : q));
  emit();
  return true;
}

/**
 * Prepara il link da mandare al cliente. Il token è la sola credenziale del
 * link, quindi si genera una volta e poi si riusa: rigenerarlo a ogni invio
 * spegnerebbe i link già mandati.
 *
 * Contestualmente il preventivo passa in "inviato": è lo stato che l'endpoint
 * pubblico richiede per mostrarlo e per accettare una risposta.
 */
export async function prepareQuoteLink(id: string): Promise<string | null> {
  const q = quotes.find((x) => x.id === id);
  if (!q) return null;

  if (q.shareToken && q.stato !== "bozza") return quoteShareUrl(q.shareToken);

  const token = q.shareToken ?? nuovoToken();
  const patch: Record<string, unknown> = { share_token: token };
  if (!q.sentAt) patch.sent_at = new Date().toISOString();
  if (q.stato === "bozza") patch.stato = "inviato";

  const { data: row, error } = await supabase
    .from("quotes")
    .update(patch as never)
    .eq("id", id)
    .select()
    .single();

  if (error || !row) {
    console.error("[quotes-store] prepareLink error:", error);
    toast.error(`Impossibile creare il link: ${authErrorMessage(error, "risposta vuota")}`);
    return null;
  }
  quotes = quotes.map((x) => (x.id === id ? rowToQuote(row as Row) : x));
  emit();
  return quoteShareUrl(token);
}

export function quoteShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/preventivo/${token}`;
}

function nuovoToken(): string {
  // 32 caratteri esadecimali da una sorgente crittografica: non indovinabile.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function deleteQuote(id: string): Promise<boolean> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) {
    console.error("[quotes-store] delete error:", error);
    toast.error(`Errore eliminazione preventivo: ${authErrorMessage(error)}`);
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
