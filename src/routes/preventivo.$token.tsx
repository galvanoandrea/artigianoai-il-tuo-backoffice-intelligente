import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Check, X, Printer, CircleCheck, CircleX } from "lucide-react";

export const Route = createFileRoute("/preventivo/$token")({
  head: () => ({
    meta: [
      { title: "Il tuo preventivo — ArtigianoAI" },
      // Un link con token non deve finire sui motori di ricerca.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreventivoPubblico,
});

type Voce = {
  descrizione: string;
  quantita: number;
  unita?: string;
  prezzo_unitario?: number;
  prezzoUnitario?: number;
};
type Azienda = {
  nome: string;
  email: string;
  telefono: string;
  partitaIva: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
};
type Preventivo = {
  numero: string;
  data: string;
  titolo: string;
  descrizione: string;
  voci: Voce[];
  note: string;
  ivaPercentuale: number;
  stato: "inviato" | "accettato" | "rifiutato";
  rispostoIl: string | null;
  cliente: { ragioneSociale: string; referente: string } | null;
  azienda: Azienda | null;
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const prezzoDi = (v: Voce) => Number(v.prezzo_unitario ?? v.prezzoUnitario) || 0;

function PreventivoPubblico() {
  const { token } = Route.useParams();
  const [dati, setDati] = useState<Preventivo | null>(null);
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [invio, setInvio] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/quote-public?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) setErrore(j.error ?? "Questo preventivo non è disponibile.");
        else setDati(j);
      })
      .catch(() => vivo && setErrore("Connessione assente. Controlla la rete e riprova."))
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, [token]);

  const rispondi = async (azione: "accetta" | "rifiuta") => {
    setInvio(true);
    try {
      const r = await fetch("/api/quote-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, azione, nome }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrore(j.error ?? "Non è stato possibile registrare la risposta.");
        if (j.stato) setDati((d) => (d ? { ...d, stato: j.stato } : d));
      } else {
        setDati((d) => (d ? { ...d, stato: j.stato, rispostoIl: new Date().toISOString() } : d));
      }
    } catch {
      setErrore("Connessione assente. Controlla la rete e riprova.");
    } finally {
      setInvio(false);
    }
  };

  if (caricamento) {
    return (
      <Guscio>
        <p className="text-muted-foreground">Caricamento del preventivo…</p>
      </Guscio>
    );
  }

  if (errore && !dati) {
    return (
      <Guscio>
        <h1 className="text-2xl font-bold mb-2">Preventivo non disponibile</h1>
        <p className="text-muted-foreground">{errore}</p>
        <p className="text-muted-foreground mt-4 text-sm">
          Chiedi all'artigiano di inviarti di nuovo il link.
        </p>
      </Guscio>
    );
  }

  if (!dati) return null;

  const subtotale = dati.voci.reduce((s, v) => s + (Number(v.quantita) || 0) * prezzoDi(v), 0);
  const iva = subtotale * (dati.ivaPercentuale / 100);
  const totale = subtotale + iva;
  const a = dati.azienda;
  const rispostoGia = dati.stato === "accettato" || dati.stato === "rifiutato";

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl space-y-4">
        {rispostoGia && (
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 print:hidden ${
              dati.stato === "accettato"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {dati.stato === "accettato" ? (
              <CircleCheck className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
              <CircleX className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {dati.stato === "accettato" ? "Preventivo accettato" : "Preventivo rifiutato"}
              </p>
              <p className="text-sm opacity-90">
                {dati.stato === "accettato"
                  ? "Grazie. L'artigiano è stato avvisato e ti contatterà."
                  : "Abbiamo registrato la tua risposta. L'artigiano è stato avvisato."}
              </p>
            </div>
          </div>
        )}

        <div className="bg-background rounded-xl border p-6 md:p-8 space-y-6 print:border-0 print:p-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Preventivo</p>
              <h1 className="text-2xl font-bold">{dati.numero}</h1>
              <p className="text-sm text-muted-foreground">
                del {new Date(dati.data).toLocaleDateString("it-IT")}
              </p>
            </div>
            {a && (
              <div className="text-right text-sm">
                <p className="font-bold text-base">{a.nome}</p>
                {a.indirizzo && <p className="text-muted-foreground">{a.indirizzo}</p>}
                {(a.cap || a.citta) && (
                  <p className="text-muted-foreground">
                    {[a.cap, a.citta, a.provincia && `(${a.provincia})`].filter(Boolean).join(" ")}
                  </p>
                )}
                {a.partitaIva && <p className="text-muted-foreground">P.IVA {a.partitaIva}</p>}
                {a.telefono && <p className="text-muted-foreground">{a.telefono}</p>}
                {a.email && <p className="text-muted-foreground">{a.email}</p>}
              </div>
            )}
          </div>

          {dati.cliente && (
            <div className="border-t pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cliente</p>
              <p className="font-medium">{dati.cliente.ragioneSociale}</p>
              {dati.cliente.referente && (
                <p className="text-sm text-muted-foreground">{dati.cliente.referente}</p>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            {dati.titolo && <h2 className="text-lg font-semibold mb-1">{dati.titolo}</h2>}
            {dati.descrizione && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {dati.descrizione}
              </p>
            )}
          </div>

          {/* Su telefono la tabella scorre da sola invece di sfondare la pagina */}
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[30rem]">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 font-medium">Descrizione</th>
                  <th className="p-2 font-medium text-right w-20">Q.tà</th>
                  <th className="p-2 font-medium text-right w-28">Prezzo</th>
                  <th className="p-2 font-medium text-right w-28">Totale</th>
                </tr>
              </thead>
              <tbody>
                {dati.voci.map((v, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{v.descrizione}</td>
                    <td className="p-2 text-right">
                      {v.quantita} {v.unita ?? ""}
                    </td>
                    <td className="p-2 text-right">{euro(prezzoDi(v))}</td>
                    <td className="p-2 text-right font-medium">
                      {euro((Number(v.quantita) || 0) * prezzoDi(v))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotale</span>
                <span>{euro(subtotale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA {dati.ivaPercentuale}%</span>
                <span>{euro(iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Totale</span>
                <span>{euro(totale)}</span>
              </div>
            </div>
          </div>

          {dati.note && (
            <div className="border-t pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note</p>
              <p className="text-sm whitespace-pre-wrap">{dati.note}</p>
            </div>
          )}
        </div>

        {!rispostoGia && (
          <div className="bg-background rounded-xl border p-6 space-y-4 print:hidden">
            <div>
              <h2 className="font-semibold">Cosa vuoi fare?</h2>
              <p className="text-sm text-muted-foreground">
                La tua risposta arriva subito all'artigiano.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Il tuo nome (facoltativo)</Label>
              <Input
                id="nome"
                className="h-12"
                placeholder="Mario Rossi"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            {errore && <p className="text-sm text-red-600">{errore}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => rispondi("accetta")}
                disabled={invio}
                className="h-12 flex-1 bg-gradient-accent text-accent-foreground hover:opacity-90 text-base"
              >
                <Check className="w-5 h-5" /> Accetto il preventivo
              </Button>
              <Button
                onClick={() => rispondi("rifiuta")}
                disabled={invio}
                variant="outline"
                className="h-12 flex-1 text-base"
              >
                <X className="w-5 h-5" /> Non accetto
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-2 print:hidden">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Logo className="w-6 h-6" /> Creato con ArtigianoAI
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Stampa
          </Button>
        </div>
      </div>
    </div>
  );
}

function Guscio({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
