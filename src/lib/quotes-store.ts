import { useSyncExternalStore } from "react";

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

let quotes: Quote[] = [
  {
    id: "q1",
    numero: "2025-001",
    clienteId: "c1",
    data: "2025-04-12",
    titolo: "Installazione impianto elettrico",
    descrizione: "Rifacimento completo impianto elettrico appartamento 90mq.",
    voci: [
      { id: "v1", descrizione: "Fornitura quadro elettrico con interruttori", quantita: 1, prezzoUnitario: 480 },
      { id: "v2", descrizione: "Punto luce con cablaggio", quantita: 18, prezzoUnitario: 45 },
      { id: "v3", descrizione: "Manodopera elettricista", quantita: 32, prezzoUnitario: 35 },
    ],
    note: "Validità preventivo 30 giorni. Pagamento 50% all'inizio lavori, 50% al termine.",
    ivaPercentuale: 22,
    stato: "accettato",
  },
  {
    id: "q2",
    numero: "2025-002",
    clienteId: "c2",
    data: "2025-04-25",
    titolo: "Sostituzione tubature bagno",
    descrizione: "Sostituzione completa tubature acqua calda/fredda e scarichi bagno principale.",
    voci: [
      { id: "v1", descrizione: "Tubazioni multistrato e raccordi", quantita: 1, prezzoUnitario: 320 },
      { id: "v2", descrizione: "Smontaggio sanitari esistenti", quantita: 1, prezzoUnitario: 150 },
      { id: "v3", descrizione: "Manodopera idraulico", quantita: 16, prezzoUnitario: 38 },
    ],
    note: "Garanzia 24 mesi su materiali e installazione.",
    ivaPercentuale: 22,
    stato: "inviato",
  },
  {
    id: "q3",
    numero: "2025-003",
    clienteId: "c3",
    data: "2025-05-02",
    titolo: "Ristrutturazione uffici",
    descrizione: "Tinteggiatura e rifacimento pavimenti uffici 120mq.",
    voci: [
      { id: "v1", descrizione: "Tinteggiatura pareti e soffitti", quantita: 280, prezzoUnitario: 12 },
      { id: "v2", descrizione: "Pavimento PVC effetto legno", quantita: 120, prezzoUnitario: 28 },
      { id: "v3", descrizione: "Smaltimento materiali", quantita: 1, prezzoUnitario: 250 },
    ],
    note: "Tempi di esecuzione stimati: 10 giorni lavorativi.",
    ivaPercentuale: 22,
    stato: "bozza",
  },
  {
    id: "q4",
    numero: "2025-004",
    clienteId: "c4",
    data: "2025-03-18",
    titolo: "Installazione caldaia a condensazione",
    descrizione: "Fornitura e installazione caldaia a condensazione 24 kW con smontaggio della precedente.",
    voci: [
      { id: "v1", descrizione: "Caldaia a condensazione 24 kW", quantita: 1, prezzoUnitario: 1450 },
      { id: "v2", descrizione: "Kit fumi e accessori", quantita: 1, prezzoUnitario: 180 },
      { id: "v3", descrizione: "Manodopera installazione e collaudo", quantita: 8, prezzoUnitario: 40 },
    ],
    note: "Comprensivo di pratica ENEA per detrazione fiscale.",
    ivaPercentuale: 22,
    stato: "rifiutato",
  },
];

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => quotes;

export function useQuotes() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addQuote(data: Omit<Quote, "id" | "numero">) {
  const year = new Date().getFullYear();
  const sameYear = quotes.filter((q) => q.numero.startsWith(`${year}-`));
  const next = String(sameYear.length + 1).padStart(3, "0");
  quotes = [{ ...data, id: `q${Date.now()}`, numero: `${year}-${next}` }, ...quotes];
  emit();
}

export function updateQuote(id: string, data: Omit<Quote, "id" | "numero">) {
  quotes = quotes.map((q) => (q.id === id ? { ...data, id, numero: q.numero } : q));
  emit();
}

export function setQuoteStatus(id: string, stato: QuoteStatus) {
  quotes = quotes.map((q) => (q.id === id ? { ...q, stato } : q));
  emit();
}

export function deleteQuote(id: string) {
  quotes = quotes.filter((q) => q.id !== id);
  emit();
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
