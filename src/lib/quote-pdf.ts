import type { Quote } from "@/lib/quotes-store";
import { calcTotals } from "@/lib/quotes-store";

export type PdfAzienda = {
  nome: string;
  indirizzo: string;
  partitaIva: string;
  telefono: string;
  email: string;
};

export type PdfCliente = {
  ragioneSociale: string;
  referente?: string;
  indirizzo?: string;
  partitaIva?: string;
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const dataIt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT");
};

/** Nome file leggibile: "Preventivo 2026-014 - Bar Centrale.pdf" */
export function nomeFilePdf(quote: Quote, cliente?: PdfCliente): string {
  const pezzi = ["Preventivo", quote.numero, cliente?.ragioneSociale].filter(Boolean).join(" - ");
  // Caratteri che i sistemi operativi rifiutano nei nomi file.
  return `${pezzi.replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}

/**
 * Costruisce il PDF del preventivo. jsPDF viene caricato solo qui, con un
 * import dinamico: pesa parecchio e non deve entrare nel bundle iniziale di
 * chi apre la landing.
 */
export async function generaPdfPreventivo(
  quote: Quote,
  azienda: PdfAzienda,
  cliente?: PdfCliente,
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15; // margine
  const larghezza = doc.internal.pageSize.getWidth();
  let y = M;

  // ── Intestazione azienda ──
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text(azienda.nome || "—", M, y);
  y += 5;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
  for (const riga of [
    azienda.indirizzo,
    azienda.partitaIva && `P.IVA ${azienda.partitaIva}`,
    [azienda.telefono, azienda.email].filter(Boolean).join(" · "),
  ].filter(Boolean)) {
    doc.text(String(riga), M, y);
    y += 4;
  }

  // ── Numero e data, a destra ──
  doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(18);
  doc.text("PREVENTIVO", larghezza - M, M, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(110);
  doc.text(`N. ${quote.numero}`, larghezza - M, M + 6, { align: "right" });
  doc.text(`del ${dataIt(quote.data)}`, larghezza - M, M + 11, { align: "right" });

  y = Math.max(y, M + 16) + 6;
  doc.setDrawColor(220).line(M, y, larghezza - M, y);
  y += 8;

  // ── Cliente ──
  if (cliente) {
    doc.setTextColor(110).setFontSize(8).setFont("helvetica", "bold");
    doc.text("CLIENTE", M, y);
    y += 5;
    doc.setTextColor(0).setFontSize(11);
    doc.text(cliente.ragioneSociale || "—", M, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
    for (const riga of [
      cliente.referente,
      cliente.indirizzo,
      cliente.partitaIva && `P.IVA ${cliente.partitaIva}`,
    ].filter(Boolean)) {
      doc.text(String(riga), M, y);
      y += 4;
    }
    y += 4;
  }

  // ── Titolo e descrizione ──
  doc.setTextColor(0);
  if (quote.titolo) {
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text(quote.titolo, M, y);
    y += 6;
  }
  if (quote.descrizione) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
    const righe = doc.splitTextToSize(quote.descrizione, larghezza - M * 2);
    doc.text(righe, M, y);
    y += righe.length * 4 + 2;
  }

  // ── Voci ──
  autoTable(doc, {
    startY: y + 2,
    margin: { left: M, right: M },
    head: [["Descrizione", "Q.tà", "Prezzo", "Totale"]],
    body: quote.voci.map((v) => [
      v.descrizione,
      `${v.quantita}${(v as { unita?: string }).unita ? ` ${(v as { unita?: string }).unita}` : ""}`,
      euro(v.prezzoUnitario),
      euro(v.quantita * v.prezzoUnitario),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [10, 36, 71], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 30 },
    },
  });

  const t = calcTotals(quote.voci, quote.ivaPercentuale);
  // @ts-expect-error lastAutoTable è aggiunto dal plugin, non è nei tipi di jsPDF
  let yt = (doc.lastAutoTable?.finalY ?? y) + 8;

  const xEtichetta = larghezza - M - 60;
  const riga = (etichetta: string, valore: string, grassetto = false) => {
    doc.setFont("helvetica", grassetto ? "bold" : "normal").setFontSize(grassetto ? 11 : 9);
    doc.setTextColor(grassetto ? 0 : 110);
    doc.text(etichetta, xEtichetta, yt);
    doc.setTextColor(0);
    doc.text(valore, larghezza - M, yt, { align: "right" });
    yt += grassetto ? 7 : 5;
  };
  riga("Subtotale", euro(t.subtotale));
  riga(`IVA ${quote.ivaPercentuale}%`, euro(t.iva));
  doc.setDrawColor(220).line(xEtichetta, yt - 3, larghezza - M, yt - 3);
  yt += 1;
  riga("Totale", euro(t.totale), true);

  // ── Note ──
  if (quote.note) {
    yt += 4;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(110);
    doc.text("NOTE", M, yt);
    yt += 5;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(60);
    doc.text(doc.splitTextToSize(quote.note, larghezza - M * 2), M, yt);
  }

  return doc.output("blob");
}
