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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Mail, MessageCircle, Check } from "lucide-react";
import { prepareQuoteLink, type Quote, calcTotals, formatEuro } from "@/lib/quotes-store";

/**
 * L'email parte dal programma di posta dell'artigiano (mailto:) invece che dal
 * server: così arriva al cliente dal suo indirizzo vero, non da quello di
 * servizio di ArtigianoAI, e la risposta torna a lui.
 */
export function SendQuoteDialog({
  quote,
  clientName,
  clientEmail,
  clientPhone,
  azienda,
  open,
  onOpenChange,
}: {
  quote: Quote;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  azienda?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [copiato, setCopiato] = useState(false);

  const totale = formatEuro(calcTotals(quote.voci, quote.ivaPercentuale).totale);

  const assicuraLink = async (): Promise<string | null> => {
    if (link) return link;
    setPreparando(true);
    const url = await prepareQuoteLink(quote.id);
    setPreparando(false);
    if (url) setLink(url);
    return url;
  };

  const testo = (url: string) =>
    `Ciao${clientName ? ` ${clientName}` : ""}, ecco il preventivo ${quote.numero}` +
    `${quote.titolo ? ` per ${quote.titolo}` : ""} — totale ${totale}.\n\n` +
    `Puoi vederlo e accettarlo qui:\n${url}` +
    `${azienda ? `\n\n${azienda}` : ""}`;

  const copia = async () => {
    const url = await assicuraLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
      toast.success("Link copiato");
    } catch {
      toast.error("Copia non riuscita: seleziona il link e copialo a mano");
    }
  };

  const viaWhatsApp = async () => {
    const url = await assicuraLink();
    if (!url) return;
    const num = (clientPhone ?? "").replace(/[^\d]/g, "");
    const base = num ? `https://wa.me/${num}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(testo(url))}`, "_blank", "noopener");
  };

  const viaEmail = async () => {
    const url = await assicuraLink();
    if (!url) return;
    const oggetto = `Preventivo ${quote.numero}${quote.titolo ? ` — ${quote.titolo}` : ""}`;
    window.location.href =
      `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(oggetto)}` +
      `&body=${encodeURIComponent(testo(url))}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invia il preventivo al cliente</DialogTitle>
          <DialogDescription>
            Il cliente apre il link, vede il preventivo e può accettarlo. Quando risponde, lo stato
            qui si aggiorna da solo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={viaWhatsApp}
              disabled={preparando}
              className="h-12 bg-gradient-accent text-accent-foreground hover:opacity-90"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
            <Button onClick={viaEmail} disabled={preparando} variant="outline" className="h-12">
              <Mail className="w-4 h-4" /> Email
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-preventivo">Oppure copia il link</Label>
            <div className="flex gap-2">
              <Input
                id="link-preventivo"
                readOnly
                value={link ?? ""}
                placeholder={preparando ? "Creazione del link…" : "Premi Copia per generarlo"}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 text-xs"
              />
              <Button
                onClick={copia}
                disabled={preparando}
                variant="outline"
                className="h-11 shrink-0"
              >
                {copiato ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Chiunque abbia il link può vedere il preventivo: mandalo solo al tuo cliente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
