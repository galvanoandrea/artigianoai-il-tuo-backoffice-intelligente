import { useSyncExternalStore } from "react";

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

let fornitori: Fornitore[] = [
  {
    id: "f1",
    ragioneSociale: "Ferramenta Lombardi",
    referente: "Giovanni Lombardi",
    telefono: "+39 02 3456789",
    email: "info@ferramantalombardi.it",
    partitaIva: "IT11223344556",
    note: "Fornitore principale materiali edili.",
  },
  {
    id: "f2",
    ragioneSociale: "Elettro Supply S.r.l.",
    referente: "Carla Ricci",
    telefono: "+39 011 9876543",
    email: "ordini@elettrosupply.it",
    partitaIva: "IT99887766554",
    note: "Componenti elettrici e cavi.",
  },
];

let pagamenti: Pagamento[] = [
  {
    id: "p1",
    fornitoreId: "f1",
    descrizione: "Fornitura mattoni e cemento — cantiere Via Roma",
    importo: 2400,
    dataScadenza: "2026-06-15",
    dataPagamento: "",
    stato: "da_pagare",
    note: "Fattura n. 2026/043",
  },
  {
    id: "p2",
    fornitoreId: "f1",
    descrizione: "Piastrelle bagno — ordine marzo",
    importo: 1850,
    dataScadenza: "2026-05-01",
    dataPagamento: "2026-05-02",
    stato: "pagato",
    note: "",
  },
  {
    id: "p3",
    fornitoreId: "f2",
    descrizione: "Cavi MT + quadro elettrico",
    importo: 3200,
    dataScadenza: "2026-07-30",
    dataPagamento: "",
    stato: "da_pagare",
    note: "Pagamento 30gg dalla consegna",
  },
];

const fornitoriListeners = new Set<() => void>();
const pagamentiListeners = new Set<() => void>();

const subscribeF = (cb: () => void) => { fornitoriListeners.add(cb); return () => fornitoriListeners.delete(cb); };
const subscribeP = (cb: () => void) => { pagamentiListeners.add(cb); return () => pagamentiListeners.delete(cb); };
const emitF = () => fornitoriListeners.forEach((l) => l());
const emitP = () => pagamentiListeners.forEach((l) => l());
const getSnapshotF = () => fornitori;
const getSnapshotP = () => pagamenti;

export function useFornitori() {
  return useSyncExternalStore(subscribeF, getSnapshotF, getSnapshotF);
}

export function usePagamenti() {
  return useSyncExternalStore(subscribeP, getSnapshotP, getSnapshotP);
}

export function addFornitore(data: Omit<Fornitore, "id">) {
  fornitori = [{ ...data, id: `f${Date.now()}` }, ...fornitori];
  emitF();
}

export function updateFornitore(id: string, data: Omit<Fornitore, "id">) {
  fornitori = fornitori.map((f) => (f.id === id ? { ...data, id } : f));
  emitF();
}

export function deleteFornitore(id: string) {
  fornitori = fornitori.filter((f) => f.id !== id);
  pagamenti = pagamenti.filter((p) => p.fornitoreId !== id);
  emitF();
  emitP();
}

export function getFornitore(id: string) {
  return fornitori.find((f) => f.id === id);
}

export function addPagamento(data: Omit<Pagamento, "id">) {
  pagamenti = [{ ...data, id: `p${Date.now()}` }, ...pagamenti];
  emitP();
}

export function updatePagamento(id: string, data: Omit<Pagamento, "id">) {
  pagamenti = pagamenti.map((p) => (p.id === id ? { ...data, id } : p));
  emitP();
}

export function deletePagamento(id: string) {
  pagamenti = pagamenti.filter((p) => p.id !== id);
  emitP();
}

export function segnaComePagato(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  pagamenti = pagamenti.map((p) =>
    p.id === id ? { ...p, stato: "pagato", dataPagamento: today } : p,
  );
  emitP();
}

export function formatEuroF(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDateF(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
