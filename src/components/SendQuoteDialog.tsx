import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, MessageCircle, Mail } from "lucide-react";
import { setQuoteStatus, type Quote, calcTotals, formatEuro } from "@/lib/quotes-store";
import {
  generaPdfPreventivo,
  nomeFilePdf,
  type PdfAzienda,
  type PdfCliente,
} from "@/lib/quote-pdf";

/**
 * Invio del preventivo come PDF.
 *
 * Né wa.me né mailto: possono allegare un file: dal browser mandano solo testo.
 * L'unico modo per far partire il PDF come allegato vero è il foglio di
 * condivisione di sistema (navigator.share con files), che sul telefono elenca
 * WhatsApp, Mail e il resto. Dove non c'è — tipicamente su desktop — si scarica
 * il file e si aprono WhatsApp o l'email col messaggio già scritto, lasciando
 * all'artigiano il solo gesto di allegarlo.
 */
export function SendQuoteDialog({
  quote,
  clientName,
  clientEmail,
  clientPhone,
  cliente,
  azienda,
  open,
  onOpenChange,
}: {
  quote: Quote;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  cliente?: PdfCliente;
  azienda: PdfAzienda;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [lavorando, setLavorando] = useState(false);

  const totale = formatEuro(calcTotals(quote.voci, quote.ivaPercentuale).totale);
  const nomeFile = nomeFilePdf(quote, cliente);

  const messaggio =
    `Ciao${clientName ? ` ${clientName}` : ""}, ecco il preventivo ${quote.numero}` +
    `${quote.titolo ? ` per ${quote.titolo}` : ""} — totale ${totale}.` +
    `${azienda.nome ? `\n\n${azienda.nome}` : ""}`;

  /** Segna il preventivo come inviato: è il senso del gesto. */
  const segnaInviato = () => {
    if (quote.stato === "bozza") void setQuoteStatus(quote.id, "inviato");
  };

  const creaFile = async (): Promise<File | null> => {
    try {
      const blob = await generaPdfPreventivo(quote, azienda, cliente);
      return new File([blob], nomeFile, { type: "application/pdf" });
    } catch (e) {
      console.error("[SendQuoteDialog] pdf", e);
      toast.error("Non è stato possibile creare il PDF");
      return null;
    }
  };

  const scarica = async (file?: File | null) => {
    const f = file ?? (await creaFile());
    if (!f) return null;
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeFile;
    a.click();
    // Revoca ritardata: Safari annulla il download se l'URL sparisce subito.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return f;
  };

  const condividi = async () => {
    setLavorando(true);
    try {
      const file = await creaFile();
      if (!file) return;

      const puoCondividereFile =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (puoCondividereFile) {
        try {
          await navigator.share({
            files: [file],
            title: `Preventivo ${quote.numero}`,
            text: messaggio,
          });
          segnaInviato();
        } catch (e) {
          // L'utente che chiude il foglio di condivisione non è un errore.
          if ((e as Error)?.name !== "AbortError") {
            await scarica(file);
            toast.info("Condivisione non riuscita: il PDF è stato scaricato");
          }
        }
      } else {
        await scarica(file);
        segnaInviato();
        toast.success("PDF scaricato: ora allegalo al messaggio");
      }
    } finally {
      setLavorando(false);
    }
  };

  const viaWhatsApp = async () => {
    setLavorando(true);
    try {
      await scarica();
      segnaInviato();
      const num = (clientPhone ?? "").replace(/\D/g, "");
      window.open(
        `https://wa.me/${num}?text=${encodeURIComponent(messaggio)}`,
        "_blank",
        "noopener",
      );
      toast.info("Allega il PDF appena scaricato alla chat");
    } finally {
      setLavorando(false);
    }
  };

  const viaEmail = async () => {
    setLavorando(true);
    try {
      await scarica();
      segnaInviato();
      const oggetto = `Preventivo ${quote.numero}${quote.titolo ? ` — ${quote.titolo}` : ""}`;
      window.location.href =
        `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(oggetto)}` +
        `&body=${encodeURIComponent(messaggio)}`;
      toast.info("Allega il PDF appena scaricato all'email");
    } finally {
      setLavorando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invia il preventivo</DialogTitle>
          <DialogDescription>
            Dal telefono, "Condividi PDF" apre WhatsApp, Mail e il resto con il file già allegato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            onClick={condividi}
            disabled={lavorando}
            className="w-full h-14 text-base bg-gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Share2 className="w-5 h-5" />
            {lavorando ? "Preparazione del PDF…" : "Condividi PDF"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">oppure</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={viaWhatsApp} disabled={lavorando} variant="outline" className="h-12">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
            <Button onClick={viaEmail} disabled={lavorando} variant="outline" className="h-12">
              <Mail className="w-4 h-4" /> Email
            </Button>
          </div>

          <Button
            onClick={() => scarica()}
            disabled={lavorando}
            variant="ghost"
            className="w-full h-11"
          >
            <Download className="w-4 h-4" /> Scarica soltanto
          </Button>

          <p className="text-xs text-muted-foreground">
            WhatsApp ed Email dal browser non possono allegare file da soli: il PDF viene scaricato
            e lo alleghi tu al messaggio già pronto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
