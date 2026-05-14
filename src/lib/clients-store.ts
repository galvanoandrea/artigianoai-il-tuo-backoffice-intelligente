import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClientStatus = "attivo" | "potenziale" | "inattivo";

export interface Client {
  id: string;
  ragioneSociale: string;
  referente: string;
  telefono: string;
  email: string;
  indirizzo: string;
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
      return;
    }
    clients = (data ?? []).map((r) => rowToClient(r as Row));
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

export async function addClient(data: Omit<Client, "id">) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { data: row, error } = await supabase
    .from("clients")
    .insert({ ...clientToRow(data), user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) {
    console.error("[clients-store] add error:", error);
    return;
  }
  clients = [rowToClient(row as Row), ...clients];
  emit();
}

export async function updateClient(id: string, data: Omit<Client, "id">) {
  const { data: row, error } = await supabase
    .from("clients")
    .update(clientToRow(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[clients-store] update error:", error);
    return;
  }
  clients = clients.map((c) => (c.id === id ? rowToClient(row as Row) : c));
  emit();
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    console.error("[clients-store] delete error:", error);
    return;
  }
  clients = clients.filter((c) => c.id !== id);
  emit();
}

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}
