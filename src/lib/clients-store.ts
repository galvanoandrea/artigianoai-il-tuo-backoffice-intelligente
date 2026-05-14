import { useSyncExternalStore } from "react";

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

let clients: Client[] = [
  {
    id: "c1",
    ragioneSociale: "Edilizia Rossi S.r.l.",
    referente: "Marco Rossi",
    telefono: "+39 333 1234567",
    email: "marco@ediliziarossi.it",
    indirizzo: "Via Garibaldi 12, 20121 Milano (MI)",
    partitaIva: "IT01234567890",
    note: "Cliente storico, paga sempre puntuale.",
    stato: "attivo",
  },
  {
    id: "c2",
    ragioneSociale: "Impianti Bianchi",
    referente: "Luca Bianchi",
    telefono: "+39 347 9876543",
    email: "info@impiantibianchi.it",
    indirizzo: "Via Roma 45, 00184 Roma (RM)",
    partitaIva: "IT09876543210",
    note: "Preferisce contatto via WhatsApp.",
    stato: "attivo",
  },
  {
    id: "c3",
    ragioneSociale: "Costruzioni Esposito S.n.c.",
    referente: "Giuseppe Esposito",
    telefono: "+39 320 5556677",
    email: "g.esposito@costruzioniesposito.it",
    indirizzo: "Corso Umberto I 88, 80138 Napoli (NA)",
    partitaIva: "IT05566778899",
    note: "Interessato a preventivo per ristrutturazione uffici.",
    stato: "potenziale",
  },
  {
    id: "c4",
    ragioneSociale: "Termoidraulica Verdi",
    referente: "Anna Verdi",
    telefono: "+39 339 4445566",
    email: "anna.verdi@termoverdi.it",
    indirizzo: "Via Mazzini 7, 50123 Firenze (FI)",
    partitaIva: "IT04445566778",
    note: "",
    stato: "inattivo",
  },
];

const STORAGE_KEY = "artigianoai:clients";

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) clients = JSON.parse(raw);
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {}
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => { persist(); listeners.forEach((l) => l()); };
const getSnapshot = () => clients;

export function useClients() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addClient(data: Omit<Client, "id">) {
  clients = [{ ...data, id: `c${Date.now()}` }, ...clients];
  emit();
}

export function updateClient(id: string, data: Omit<Client, "id">) {
  clients = clients.map((c) => (c.id === id ? { ...data, id } : c));
  emit();
}

export function deleteClient(id: string) {
  clients = clients.filter((c) => c.id !== id);
  emit();
}

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}