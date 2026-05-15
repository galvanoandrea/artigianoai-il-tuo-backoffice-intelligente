import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface Fornitore {
  id: string;
  ragioneSociale: string;
  referente: string;
  telefono: string;
  email: string;
  partitaIva: string;
  note: string;
}

export type PagamentoStato = "da_pagare" | "pagato";

export interface Pagamento {
  id: string;
  fornitoreId: string;
  descrizione: string;
  importo: number;
  dataScadenza: string;
  dataPagamento: string;
  stato: PagamentoStato;
  note: string;
}

type FRow = {
  id: string;
  ragione_sociale: string;
  referente: string;
  telefono: string;
  email: string;
  partita_iva: string;
  note: string;
};

type PRow = {
  id: string;
  fornitore_id: string | null;
  descrizione: string;
  importo: number | string;
  data_scadenza: string;
  data_pagamento: string | null;
  stato: PagamentoStato;
  note: string;
};

const rowToFornitore = (r: FRow): Fornitore => ({
  id: r.id,
  ragioneSociale: r.ragione_sociale ?? "",
  referente: r.referente ?? "",
  telefono: r.telefono ?? "",
  email: r.email ?? "",
  partitaIva: r.partita_iva ?? "",
  note: r.note ?? "",
});

const fornitoreToRow = (f: Omit<Fornitore, "id">) => ({
  ragione_sociale: f.ragioneSociale,
  referente: f.referente,
  telefono: f.telefono,
  email: f.email,
  partita_iva: f.partitaIva,
  note: f.note,
});

const rowToPagamento = (r: PRow): Pagamento => ({
  id: r.id,
  fornitoreId: r.fornitore_id ?? "",
  descrizione: r.descrizione ?? "",
  importo: typeof r.importo === "string" ? parseFloat(r.importo) : r.importo,
  dataScadenza: r.data_scadenza,
  dataPagamento: r.data_pagamento ?? "",
  stato: r.stato,
  note: r.note ?? "",
});

const pagamentoToRow = (p: Omit<Pagamento, "id">) => ({
  fornitore_id: p.fornitoreId || null,
  descrizione: p.descrizione,
  importo: p.importo,
  data_scadenza: p.dataScadenza,
  data_pagamento: p.dataPagamento || null,
  stato: p.stato,
  note: p.note,
});

let fornitori: Fornitore[] = [];
let pagamenti: Pagamento[] = [];
let loadedF = false;
let loadedP = false;
let loadingF = false;
let loadingP = false;

const fListeners = new Set<() => void>();
const pListeners = new Set<() => void>();
const subscribeF = (cb: () => void) => { fListeners.add(cb); return () => fListeners.delete(cb); };
const subscribeP = (cb: () => void) => { pListeners.add(cb); return () => pListeners.delete(cb); };
const emitF = () => fListeners.forEach((l) => l());
const emitP = () => pListeners.forEach((l) => l());
const snapshotF = () => fornitori;
const snapshotP = () => pagamenti;

export async function loadFornitori() {
  if (loadingF) return;
  loadingF = true;
  try {
    const { data, error } = await supabase
      .from("fornitori")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("[fornitori-store] load F error:", error); toast.error(`Errore caricamento fornitori: ${error.message}`); return; }
    fornitori = (data ?? []).map((r) => rowToFornitore(r as FRow));
    loadedF = true;
    emitF();
  } finally { loadingF = false; }
}

export async function loadPagamenti() {
  if (loadingP) return;
  loadingP = true;
  try {
    const { data, error } = await supabase
      .from("pagamenti")
      .select("*")
      .order("data_scadenza", { ascending: true });
    if (error) { console.error("[fornitori-store] load P error:", error); toast.error(`Errore caricamento pagamenti: ${error.message}`); return; }
    pagamenti = (data ?? []).map((r) => rowToPagamento(r as PRow));
    loadedP = true;
    emitP();
  } finally { loadingP = false; }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) { loadFornitori(); loadPagamenti(); }
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      fornitori = []; pagamenti = [];
      loadedF = false; loadedP = false;
      emitF(); emitP();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      loadFornitori(); loadPagamenti();
    }
  });
}

export function useFornitori() {
  const value = useSyncExternalStore(subscribeF, snapshotF, snapshotF);
  useEffect(() => { if (!loadedF && !loadingF) loadFornitori(); }, []);
  return value;
}

export function usePagamenti() {
  const value = useSyncExternalStore(subscribeP, snapshotP, snapshotP);
  useEffect(() => { if (!loadedP && !loadingP) loadPagamenti(); }, []);
  return value;
}

export async function addFornitore(data: Omit<Fornitore, "id">): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) { toast.error("Utente non autenticato"); return false; }
  const { data: row, error } = await supabase
    .from("fornitori")
    .insert({ ...fornitoreToRow(data), user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) { console.error("[fornitori-store] add F error:", error); toast.error(`Errore salvataggio fornitore: ${error?.message ?? "risposta vuota"}`); return false; }
  fornitori = [rowToFornitore(row as FRow), ...fornitori];
  emitF();
  return true;
}

export async function updateFornitore(id: string, data: Omit<Fornitore, "id">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("fornitori")
    .update(fornitoreToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) { console.error("[fornitori-store] update F error:", error); toast.error(`Errore aggiornamento fornitore: ${error?.message ?? "risposta vuota"}`); return false; }
  fornitori = fornitori.map((f) => (f.id === id ? rowToFornitore(row as FRow) : f));
  emitF();
  return true;
}

export async function deleteFornitore(id: string): Promise<boolean> {
  const { error } = await supabase.from("fornitori").delete().eq("id", id);
  if (error) { console.error("[fornitori-store] delete F error:", error); toast.error(`Errore eliminazione fornitore: ${error.message}`); return false; }
  fornitori = fornitori.filter((f) => f.id !== id);
  pagamenti = pagamenti.filter((p) => p.fornitoreId !== id);
  emitF(); emitP();
  return true;
}

export function getFornitore(id: string) {
  return fornitori.find((f) => f.id === id);
}

export async function addPagamento(data: Omit<Pagamento, "id">): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) { toast.error("Utente non autenticato"); return false; }
  const { data: row, error } = await supabase
    .from("pagamenti")
    .insert({ ...pagamentoToRow(data), user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) { console.error("[fornitori-store] add P error:", error); toast.error(`Errore salvataggio pagamento: ${error?.message ?? "risposta vuota"}`); return false; }
  pagamenti = [rowToPagamento(row as PRow), ...pagamenti];
  emitP();
  return true;
}

export async function updatePagamento(id: string, data: Omit<Pagamento, "id">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("pagamenti")
    .update(pagamentoToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) { console.error("[fornitori-store] update P error:", error); toast.error(`Errore aggiornamento pagamento: ${error?.message ?? "risposta vuota"}`); return false; }
  pagamenti = pagamenti.map((p) => (p.id === id ? rowToPagamento(row as PRow) : p));
  emitP();
  return true;
}

export async function deletePagamento(id: string): Promise<boolean> {
  const { error } = await supabase.from("pagamenti").delete().eq("id", id);
  if (error) { console.error("[fornitori-store] delete P error:", error); toast.error(`Errore eliminazione pagamento: ${error.message}`); return false; }
  pagamenti = pagamenti.filter((p) => p.id !== id);
  emitP();
  return true;
}

export async function segnaComePagato(id: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: row, error } = await supabase
    .from("pagamenti")
    .update({ stato: "pagato", data_pagamento: today })
    .eq("id", id)
    .select()
    .single();
  if (error || !row) { console.error("[fornitori-store] segna pagato error:", error); toast.error(`Errore: ${error?.message ?? "risposta vuota"}`); return false; }
  pagamenti = pagamenti.map((p) => (p.id === id ? rowToPagamento(row as PRow) : p));
  emitP();
  return true;
}

export function formatEuroF(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDateF(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
