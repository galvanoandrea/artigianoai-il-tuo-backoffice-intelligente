import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, MoreVertical, Pencil, Trash2, Eye, FileText, Printer, X, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/lib/clients-store";
import { useNavigate } from "@tanstack/react-router";
import {
  useQuotes, addQuote, updateQuote, deleteQuote, setQuoteStatus,
  calcTotals, formatEuro, formatDate,
  type Quote, type QuoteStatus,
} from "@/lib/quotes-store";
import { QuoteForm } from "@/components/QuoteForm";

export const Route = createFileRoute("/dashboard/preventivi")({
  component: PreventiviPage,
});

const statusVariant: Record<QuoteStatus, { label: string; className: string }> = {
  bozza: { label: "Bozza", className: "bg-muted text-muted-foreground border-transparent" },
  inviato: { label: "Inviato", className: "bg-primary/15 text-primary border-transparent" },
  accettato: { label: "Accettato", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent" },
  rifiutato: { label: "Rifiutato", className: "bg-destructive/15 text-destructive border-transparent" },
};

type CompanyProfile = {
  nome: string;
  indirizzo: string;
  partitaIva: string;
  telefono: string;
  email: string;
};

function PreventiviPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quotes = useQuotes();
  const clients = useClients();
  const [search, setSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState<QuoteStatus | "all">("all");
  const [company, setCompany] = useState<CompanyProfile>({ nome: "", indirizzo: "", partitaIva: "", telefono: "", email: "" });
  const loadedRef = useRef(false);
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [viewing, setViewing] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      // Query only columns guaranteed to exist; new columns (email_azienda, cap, citta, provincia) added by migration
      const { data: base } = await supabase
        .from("profiles")
        .select("nome_completo, nome_azienda, telefono, partita_iva, indirizzo")
        .eq("id", user.id)
        .maybeSingle();
      if (!base) return;
      const d = base as any;

      // Try to load extended columns added by pending migration — safe to fail
      const { data: ext } = await supabase
        .from("profiles")
        .select("email_azienda, cap, citta, provincia")
        .eq("id", user.id)
        .maybeSingle()
        .then((r) => r, () => ({ data: null, error: null }));
      const x = (ext as any) ?? {};

      const addrParts = [d.indirizzo, x.cap && x.citta ? `${x.cap} ${x.citta}` : x.citta, x.provincia ? `(${x.provincia})` : ""].filter(Boolean);
      setCompany({
        nome: d.nome_azienda || d.nome_completo || user.email || "",
        indirizzo: addrParts.join(", "),
        partitaIva: d.partita_iva || "",
        telefono: d.telefono || "",
        email: x.email_azienda || user.email || "",
      });
    })();
  }, [user]);

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.ragioneSociale ?? "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((qt) => {
      if (statoFilter !== "all" && qt.stato !== statoFilter) return false;
      if (clienteFilter !== "all" && qt.clienteId !== clienteFilter) return false;
      if (!q) return true;
      return [qt.numero, qt.titolo, clientName(qt.clienteId)].some((f) =>
        f.toLowerCase().includes(q),
      );
    });
  }, [quotes, search, statoFilter, clienteFilter, clients]);

  const hasFilters = !!search || statoFilter !== "all" || clienteFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatoFilter("all"); setClienteFilter("all"); };

  const handleCreate = async (data: Omit<Quote, "id" | "numero">): Promise<void> => {
    const ok = await addQuote(data);
    if (!ok) return;
    setCreateOpen(false);
    toast.success("Preventivo creato con successo");
  };

  const handleUpdate = async (data: Omit<Quote, "id" | "numero">): Promise<void> => {
    if (!editing) return;
    const ok = await updateQuote(editing.id, data);
    if (!ok) return;
    setEditing(null);
    setViewing(null);
    toast.success("Modifiche salvate con successo");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteQuote(deleteTarget.id);
    if (!ok) return;
    toast.success("Preventivo eliminato");
    setDeleteTarget(null);
  };

  const handleStatusChange = async (q: Quote, stato: QuoteStatus) => {
    const ok = await setQuoteStatus(q.id, stato);
    if (!ok) return;
    if (viewing?.id === q.id) setViewing({ ...q, stato });
    toast.success(`Stato aggiornato: ${statusVariant[stato].label}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Preventivi</h1>
          <p className="text-muted-foreground text-sm mt-1">Crea e gestisci i tuoi preventivi.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-11"
        >
          <Plus className="h-5 w-5" />
          Nuovo preventivo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per numero, cliente, titolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={statoFilter} onValueChange={(v) => setStatoFilter(v as QuoteStatus | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="bozza">Bozza</SelectItem>
            <SelectItem value="inviato">Inviato</SelectItem>
            <SelectItem value="accettato">Accettato</SelectItem>
            <SelectItem value="rifiutato">Rifiutato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="h-11 w-full sm:w-52">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.ragioneSociale}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters} className="h-11">
            <X className="h-4 w-4" /> Pulisci
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-60" />
              <p className="font-medium">
                {quotes.length === 0 ? "Nessun preventivo ancora" : "Nessun preventivo trovato"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {quotes.length === 0
                  ? "Crea il tuo primo preventivo per iniziare."
                  : "Prova a modificare i termini di ricerca."}
              </p>
              {quotes.length === 0 && (
                <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-gradient-accent text-accent-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" /> Nuovo preventivo
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => {
                  const totals = calcTotals(q.voci, q.ivaPercentuale);
                  return (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => setViewing(q)}>
                      <TableCell className="font-medium">{q.numero}</TableCell>
                      <TableCell>
                        <div className="font-medium">{clientName(q.clienteId)}</div>
                        <div className="md:hidden text-xs text-muted-foreground mt-0.5">{formatDate(q.data)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(q.data)}</TableCell>
                      <TableCell className="text-right font-medium">{formatEuro(totals.totale)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant[q.stato].className}>
                          {statusVariant[q.stato].label}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewing(q)}>
                              <Eye className="h-4 w-4 mr-2" /> Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(q)}>
                              <Pencil className="h-4 w-4 mr-2" /> Modifica
                            </DropdownMenuItem>
                            {q.stato === "accettato" && (
                              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/fatture", search: { da: q.id } })}>
                                <Receipt className="h-4 w-4 mr-2" /> Crea fattura
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(q)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo preventivo</DialogTitle>
            <DialogDescription>Compila i dati del preventivo.</DialogDescription>
          </DialogHeader>
          <QuoteForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Crea preventivo" />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica preventivo {editing?.numero}</DialogTitle>
            <DialogDescription>Aggiorna le informazioni del preventivo.</DialogDescription>
          </DialogHeader>
          {editing && (
            <QuoteForm
              initial={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              submitLabel="Salva modifiche"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          {viewing && (
            <QuoteDetail
              quote={viewing}
              clientName={clientName(viewing.clienteId)}
              clientFull={clients.find((c) => c.id === viewing.clienteId)}
              company={company}
              onEdit={() => setEditing(viewing)}
              onStatusChange={(s) => handleStatusChange(viewing, s)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo preventivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare il preventivo <strong>{deleteTarget?.numero}</strong>. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuoteDetail({
  quote, clientName, clientFull, company, onEdit, onStatusChange,
}: {
  quote: Quote;
  clientName: string;
  clientFull?: { ragioneSociale: string; referente: string; indirizzo: string; partitaIva: string; email: string; telefono: string };
  company: CompanyProfile;
  onEdit: () => void;
  onStatusChange: (s: QuoteStatus) => void;
}) {
  const totals = calcTotals(quote.voci, quote.ivaPercentuale);

  return (
    <>
      <DialogHeader className="print:hidden">
        <DialogTitle className="flex items-center gap-2">
          Preventivo {quote.numero}
          <Badge variant="outline" className={statusVariant[quote.stato].className}>
            {statusVariant[quote.stato].label}
          </Badge>
        </DialogTitle>
        <DialogDescription>Dettaglio preventivo professionale</DialogDescription>
      </DialogHeader>

      <div className="border rounded-lg p-6 bg-card print:border-0 print:p-0 space-y-6">
        <div className="flex justify-between items-start gap-4 border-b pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Da</p>
            <p className="font-bold text-lg">{company.nome}</p>
            {company.indirizzo && <p className="text-sm text-muted-foreground">{company.indirizzo}</p>}
            {company.partitaIva && <p className="text-sm text-muted-foreground">P.IVA {company.partitaIva}</p>}
            {(company.telefono || company.email) && <p className="text-sm text-muted-foreground">{[company.telefono, company.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Preventivo</p>
            <p className="font-bold text-lg">N° {quote.numero}</p>
            <p className="text-sm text-muted-foreground">Data: {formatDate(quote.data)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cliente</p>
          <p className="font-semibold">{clientName}</p>
          {clientFull && (
            <div className="text-sm text-muted-foreground">
              {clientFull.referente && <p>{clientFull.referente}</p>}
              {clientFull.indirizzo && <p>{clientFull.indirizzo}</p>}
              {clientFull.partitaIva && <p>P.IVA {clientFull.partitaIva}</p>}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Oggetto</p>
          <p className="font-semibold">{quote.titolo}</p>
          {quote.descrizione && <p className="text-sm text-muted-foreground mt-1">{quote.descrizione}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium">Descrizione</th>
                <th className="text-right p-2 font-medium w-20">Q.tà</th>
                <th className="text-right p-2 font-medium w-28">Prezzo</th>
                <th className="text-right p-2 font-medium w-28">Totale</th>
              </tr>
            </thead>
            <tbody>
              {quote.voci.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="p-2">{v.descrizione}</td>
                  <td className="p-2 text-right">{v.quantita}</td>
                  <td className="p-2 text-right">{formatEuro(v.prezzoUnitario)}</td>
                  <td className="p-2 text-right font-medium">{formatEuro(v.quantita * v.prezzoUnitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotale</span><span>{formatEuro(totals.subtotale)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA {quote.ivaPercentuale}%</span><span>{formatEuro(totals.iva)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Totale</span><span>{formatEuro(totals.totale)}</span></div>
          </div>
        </div>

        {quote.note && (
          <div className="border-t pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note</p>
            <p className="text-sm whitespace-pre-wrap">{quote.note}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2 print:hidden">
        <Button variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Modifica
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Cambia stato</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Stato preventivo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["bozza", "inviato", "accettato", "rifiutato"] as QuoteStatus[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <Badge variant="outline" className={`${statusVariant[s].className} mr-2`}>{statusVariant[s].label}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => window.print()} className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          <Printer className="h-4 w-4" /> Stampa / PDF
        </Button>
      </div>
    </>
  );
}
