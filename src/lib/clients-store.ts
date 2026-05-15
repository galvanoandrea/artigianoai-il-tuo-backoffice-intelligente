import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ClientStatus = "attivo" | "potenziale" | "inattivo";

export interface Client {
  id: string;
  ragioneSociale: string;
  referente: string;
  telefono: string;
  email: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partitaIva: string;
  note: string;
  stato: ClientStatus;
}

type Row = {
  id: string;
  ragione_sociale: string;
  referente: string;
  telefono: string;
  email: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partita_iva: string;
  note: string;
  stato: ClientStatus;
};

const rowToClient = (r: Row): Client => ({
  id: r.id,
  ragioneSociale: r.ragione_sociale ?? "",
  referente: r.referente ?? "",
  telefono: r.telefono ?? "",
  email: r.email ?? "",
  indirizzo: r.indirizzo ?? "",
  cap: r.cap ?? "",
  citta: r.citta ?? "",
  provincia: r.provincia ?? "",
  partitaIva: r.partita_iva ?? "",
  note: r.note ?? "",
  stato: r.stato ?? "attivo",
});

const clientToRow = (c: Omit<Client, "id">) => ({
  ragione_sociale: c.ragioneSociale,
  referente: c.referente,
  telefono: c.telefono,
  email: c.email,
  indirizzo: c.indirizzo,
  cap: c.cap,
  citta: c.citta,
  provincia: c.provincia,
  partita_iva: c.partitaIva,
  note: c.note,
  stato: c.stato,
});

let clients: Client[] = [];
let loaded = false;
let loading = false;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => clients;

export async function loadClients() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[clients-store] load error:", error);
      toast.error(`Errore caricamento clienti: ${error.message}`);
      return;
    }
    clients = (data ?? []).map((r) => rowToClient(r as unknown as Row));
    loaded = true;
    emit();
  } finally {
    loading = false;
  }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) loadClients();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      clients = [];
      loaded = false;
      emit();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      loadClients();
    }
  });
}

export function useClients() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded && !loading) loadClients();
  }, []);
  return value;
}

export async function addClient(data: Omit<Client, "id">): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    toast.error("Utente non autenticato");
    return false;
  }
  const { data: row, error } = await supabase
    .from("clients")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ ...(clientToRow(data) as any), user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) {
    console.error("[clients-store] add error:", error);
    toast.error(`Errore salvataggio cliente: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  clients = [rowToClient(row as unknown as Row), ...clients];
  emit();
  return true;
}

export async function updateClient(id: string, data: Omit<Client, "id">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("clients")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(clientToRow(data) as any)
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[clients-store] update error:", error);
    toast.error(`Errore aggiornamento cliente: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  clients = clients.map((c) => (c.id === id ? rowToClient(row as unknown as Row) : c));
  emit();
  return true;
}

export async function deleteClient(id: string): Promise<boolean> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    console.error("[clients-store] delete error:", error);
    toast.error(`Errore eliminazione cliente: ${error.message}`);
    return false;
  }
  clients = clients.filter((c) => c.id !== id);
  emit();
  return true;
}

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}
