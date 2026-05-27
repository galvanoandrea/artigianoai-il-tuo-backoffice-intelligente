import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus, Search, MoreVertical, Pencil, Trash2, Eye, Receipt, Printer, X,
} from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/lib/clients-store";
import { useQuotes, calcTotals, formatEuro, formatDate, type QuoteItem } from "@/lib/quotes-store";
import {
  useFatture, addFattura, updateFattura, deleteFattura, setFatturaStatus,
  type Fattura, type FatturaStatus,
} from "@/lib/fatture-store";

export const Route = createFileRoute("/dashboard/fatture")({
  component: FatturePage,
});

// ─── Status styling ────────────────────────────────────────────────────────────
const statusVariant: Record<FatturaStatus, { label: string; className: string }> = {
  bozza:   { label: "Bozza",   className: "bg-muted text-muted-foreground border-transparent" },
  inviata: { label: "Inviata", className: "bg-primary/15 text-primary border-transparent" },
  pagata:  { label: "Pagata",  className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent" },
  scaduta: { label: "Scaduta", className: "bg-destructive/15 text-destructive border-transparent" },
};

// ─── Company profile ───────────────────────────────────────────────────────────
type CompanyProfile = { nome: string; indirizzo: string; partitaIva: string; telefono: string; email: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────
const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const newRow = (): QuoteItem => ({
  id: `v${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  descrizione: "",
  quantita: 1,
  prezzoUnitario: 0,
});

// ─── Main page ─────────────────────────────────────────────────────────────────
function FatturePage() {
  const { user } = useAuth();
  const fatture = useFatture();
  const clients = useClients();
  const quotes = useQuotes();
  const [searchText, setSearchText] = useState("");
  const [statoFilter, setStatoFilter] = useState<FatturaStatus | "all">("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [initPreventivoId, setInitPreventivoId] = useState("");
  const [editing, setEditing] = useState<Fattura | null>(null);
  const [viewing, setViewing] = useState<Fattura | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fattura | null>(null);
  const [company, setCompany] = useState<CompanyProfile>({ nome: "", indirizzo: "", partitaIva: "", telefono: "", email: "" });
  const loadedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data: base } = await supabase
        .from("profiles")
        .select("nome_completo, nome_azienda, telefono, partita_iva, indirizzo")
        .eq("id", user.id)
        .maybeSingle();
      if (!base) return;
      const d = base as any;
      const { data: ext } = await supabase
        .from("profiles")
        .select("email_azienda, cap, citta, provincia")
        .eq("id", user.id)
        .maybeSingle()
        .then((r) => r, () => ({ data: null }));
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

  // Open create dialog pre-filled if ?da=<preventivoId> is in the URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const da = new URLSearchParams(window.location.search).get("da") ?? "";
    if (da) {
      setInitPreventivoId(da);
      setCreateOpen(true);
    }
  }, []);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.ragioneSociale ?? "—";

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return fatture.filter((f) => {
      if (statoFilter !== "all" && f.stato !== statoFilter) return false;
      if (clienteFilter !== "all" && f.clienteId !== clienteFilter) return false;
      if (!q) return true;
      return [f.numero, clientName(f.clienteId)].some((s) => s.toLowerCase().includes(q));
    });
  }, [fatture, searchText, statoFilter, clienteFilter, clients]);

  const hasFilters = !!searchText || statoFilter !== "all" || clienteFilter !== "all";

  const handleCreate = async (data: Omit<Fattura, "id" | "numero">) => {
    const f = await addFattura(data);
    if (!f) return;
    setCreateOpen(false);
    setInitPreventivoId("");
    toast.success(`Fattura ${f.numero} creata con successo`);
  };

  const handleUpdate = async (data: Omit<Fattura, "id" | "numero">) => {
    if (!editing) return;
    const ok = await updateFattura(editing.id, data);
    if (!ok) return;
    setEditing(null);
    setViewing(null);
    toast.success("Modifiche salvate con successo");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteFattura(deleteTarget.id);
    if (!ok) return;
    toast.success("Fattura eliminata");
    setDeleteTarget(null);
    setViewing(null);
  };

  const handleStatusChange = async (f: Fattura, stato: FatturaStatus) => {
    const ok = await setFatturaStatus(f.id, stato);
    if (!ok) return;
    if (viewing?.id === f.id) setViewing({ ...f, stato });
    toast.success(`Stato aggiornato: ${statusVariant[stato].label}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fatture</h1>
          <p className="text-muted-foreground text-sm mt-1">Crea e gestisci le tue fatture.</p>
        </div>
        <Button
          onClick={() => { setInitPreventivoId(""); setCreateOpen(true); }}
          className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-11"
        >
          <Plus className="h-5 w-5" /> Nuova fattura
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per numero, cliente…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={statoFilter} onValueChange={(v) => setStatoFilter(v as FatturaStatus | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-40"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="bozza">Bozza</SelectItem>
            <SelectItem value="inviata">Inviata</SelectItem>
            <SelectItem value="pagata">Pagata</SelectItem>
            <SelectItem value="scaduta">Scaduta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="h-11 w-full sm:w-52"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.ragioneSociale}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" onClick={() => { setSearchText(""); setStatoFilter("all"); setClienteFilter("all"); }} className="h-11">
            <X className="h-4 w-4" /> Pulisci
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-60" />
              <p className="font-medium">
                {fatture.length === 0 ? "Nessuna fattura ancora" : "Nessuna fattura trovata"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fatture.length === 0 ? "Crea la tua prima fattura per iniziare." : "Prova a modificare i filtri."}
              </p>
              {fatture.length === 0 && (
                <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-gradient-accent text-accent-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" /> Nuova fattura
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Emissione</TableHead>
                  <TableHead className="hidden md:table-cell">Scadenza</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const totals = calcTotals(f.voci, f.ivaPercentuale);
                  return (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setViewing(f)}>
                      <TableCell className="font-medium">{f.numero}</TableCell>
                      <TableCell>
                        <div className="font-medium">{clientName(f.clienteId)}</div>
                        <div className="md:hidden text-xs text-muted-foreground mt-0.5">{formatDate(f.dataEmissione)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(f.dataEmissione)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(f.dataScadenza)}</TableCell>
                      <TableCell className="text-right font-medium">{formatEuro(totals.totale)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant[f.stato].className}>
                          {statusVariant[f.stato].label}
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
                            <DropdownMenuItem onClick={() => setViewing(f)}>
                              <Eye className="h-4 w-4 mr-2" /> Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(f)}>
                              <Pencil className="h-4 w-4 mr-2" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(f)} className="text-destructive focus:text-destructive">
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
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setInitPreventivoId(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova fattura</DialogTitle>
            <DialogDescription>Compila i dati della fattura.</DialogDescription>
          </DialogHeader>
          <FatturaForm
            key={`create-${initPreventivoId}`}
            initPreventivoId={initPreventivoId}
            clients={clients}
            quotes={quotes}
            onSubmit={handleCreate}
            onCancel={() => { setCreateOpen(false); setInitPreventivoId(""); }}
            submitLabel="Crea fattura"
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica fattura {editing?.numero}</DialogTitle>
            <DialogDescription>Aggiorna le informazioni della fattura.</DialogDescription>
          </DialogHeader>
          {editing && (
            <FatturaForm
              key={`edit-${editing.id}`}
              initial={editing}
              clients={clients}
              quotes={quotes}
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
            <FatturaDetail
              fattura={viewing}
              clientFull={clients.find((c) => c.id === viewing.clienteId)}
              company={company}
              onEdit={() => setEditing(viewing)}
              onStatusChange={(s) => handleStatusChange(viewing, s)}
              onDelete={() => setDeleteTarget(viewing)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa fattura?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la fattura <strong>{deleteTarget?.numero}</strong>. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Fattura Form ──────────────────────────────────────────────────────────────
type FatturaFormData = Omit<Fattura, "id" | "numero">;

function FatturaForm({
  initial,
  initPreventivoId = "",
  clients,
  quotes,
  onSubmit,
  onCancel,
  submitLabel = "Salva",
}: {
  initial?: Fattura;
  initPreventivoId?: string;
  clients: ReturnType<typeof useClients>;
  quotes: ReturnType<typeof useQuotes>;
  onSubmit: (data: FatturaFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const accettati = useMemo(() => quotes.filter((q) => q.stato === "accettato"), [quotes]);

  const emptyForm = (): FatturaFormData => {
    if (initPreventivoId) {
      const q = quotes.find((q) => q.id === initPreventivoId);
      if (q) {
        return {
          clienteId: q.clienteId,
          preventivoId: q.id,
          dataEmissione: todayIso(),
          dataScadenza: plusDays(30),
          stato: "bozza",
          voci: q.voci.map((v) => ({ ...v })),
          ivaPercentuale: q.ivaPercentuale,
          note: q.note,
        };
      }
    }
    return {
      clienteId: "",
      preventivoId: "",
      dataEmissione: todayIso(),
      dataScadenza: plusDays(30),
      stato: "bozza",
      voci: [newRow()],
      ivaPercentuale: 22,
      note: "",
    };
  };

  const [data, setData] = useState<FatturaFormData>(() => {
    if (initial) {
      const { id: _id, numero: _n, ...rest } = initial;
      return rest;
    }
    return emptyForm();
  });
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const update = <K extends keyof FatturaFormData>(k: K, v: FatturaFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handlePreventivoChange = (prevId: string) => {
    if (!prevId || prevId === "__none__") {
      update("preventivoId", "");
      return;
    }
    const q = quotes.find((q) => q.id === prevId);
    if (!q) return;
    setData((d) => ({
      ...d,
      preventivoId: prevId,
      clienteId: q.clienteId,
      voci: q.voci.map((v) => ({ ...v })),
      ivaPercentuale: q.ivaPercentuale,
      note: q.note,
    }));
  };

  const updateRow = (id: string, patch: Partial<QuoteItem>) =>
    setData((d) => ({ ...d, voci: d.voci.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
  const addRow = () => setData((d) => ({ ...d, voci: [...d.voci, newRow()] }));
  const removeRow = (id: string) =>
    setData((d) => ({ ...d, voci: d.voci.length > 1 ? d.voci.filter((v) => v.id !== id) : d.voci }));

  const totals = calcTotals(data.voci, data.ivaPercentuale);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.clienteId) return;
    setSubmitting(true);
    try { await onSubmit(data); } finally { if (mountedRef.current) setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preventivo source */}
      {!initial && accettati.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="preventivo">Da preventivo accettato (opzionale)</Label>
          <Select value={data.preventivoId || "__none__"} onValueChange={handlePreventivoChange}>
            <SelectTrigger id="preventivo"><SelectValue placeholder="Seleziona preventivo…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— nessuno —</SelectItem>
              {accettati.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.numero} · {clients.find((c) => c.id === q.clienteId)?.ragioneSociale ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select value={data.clienteId} onValueChange={(v) => update("clienteId", v)} required>
            <SelectTrigger id="cliente"><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.ragioneSociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stato">Stato</Label>
          <Select value={data.stato} onValueChange={(v) => update("stato", v as FatturaStatus)}>
            <SelectTrigger id="stato"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bozza">Bozza</SelectItem>
              <SelectItem value="inviata">Inviata</SelectItem>
              <SelectItem value="pagata">Pagata</SelectItem>
              <SelectItem value="scaduta">Scaduta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_emissione">Data emissione</Label>
          <Input id="data_emissione" type="date" value={data.dataEmissione} onChange={(e) => update("dataEmissione", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_scadenza">Data scadenza</Label>
          <Input id="data_scadenza" type="date" value={data.dataScadenza} onChange={(e) => update("dataScadenza", e.target.value)} />
        </div>
      </div>

      {/* Voci */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Voci fattura</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Aggiungi voce
          </Button>
        </div>
        <div className="space-y-2">
          {data.voci.map((v) => (
            <div key={v.id} className="grid gap-2 sm:grid-cols-12 items-end border rounded-md p-3 bg-muted/30">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs">Descrizione</Label>
                <Input value={v.descrizione} onChange={(e) => updateRow(v.id, { descrizione: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Quantità</Label>
                <Input type="number" min={0} step="0.01" value={v.quantita}
                  onChange={(e) => updateRow(v.id, { quantita: Number(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Prezzo unit.</Label>
                <Input type="number" min={0} step="0.01" value={v.prezzoUnitario}
                  onChange={(e) => updateRow(v.id, { prezzoUnitario: Number(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-1 space-y-1">
                <Label className="text-xs">Totale</Label>
                <div className="h-9 flex items-center text-sm font-medium">{formatEuro(v.quantita * v.prezzoUnitario)}</div>
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                  onClick={() => removeRow(v.id)} disabled={data.voci.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="iva">IVA (%)</Label>
          <Input id="iva" type="number" min={0} max={100} step="0.01" value={data.ivaPercentuale}
            onChange={(e) => update("ivaPercentuale", Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" rows={2} value={data.note} onChange={(e) => update("note", e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border bg-muted/40 p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotale</span><span>{formatEuro(totals.subtotale)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">IVA {data.ivaPercentuale}%</span><span>{formatEuro(totals.iva)}</span></div>
        <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Totale</span><span>{formatEuro(totals.totale)}</span></div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annulla</Button>
        <Button type="submit" disabled={submitting || !data.clienteId} className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          {submitting ? "Salvataggio…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ─── Fattura Detail (print-ready) ──────────────────────────────────────────────
function FatturaDetail({
  fattura, clientFull, company, onEdit, onStatusChange, onDelete,
}: {
  fattura: Fattura;
  clientFull?: { ragioneSociale: string; referente: string; indirizzo: string; partitaIva: string; email: string; telefono: string };
  company: CompanyProfile;
  onEdit: () => void;
  onStatusChange: (s: FatturaStatus) => void;
  onDelete: () => void;
}) {
  const totals = calcTotals(fattura.voci, fattura.ivaPercentuale);

  return (
    <>
      <DialogHeader className="print:hidden">
        <DialogTitle className="flex items-center gap-2">
          Fattura {fattura.numero}
          <Badge variant="outline" className={statusVariant[fattura.stato].className}>
            {statusVariant[fattura.stato].label}
          </Badge>
        </DialogTitle>
        <DialogDescription>Dettaglio fattura professionale</DialogDescription>
      </DialogHeader>

      <div className="border rounded-lg p-6 bg-card print:border-0 print:p-0 space-y-6">
        {/* Header: mittente + numero */}
        <div className="flex justify-between items-start gap-4 border-b pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Da</p>
            <p className="font-bold text-lg">{company.nome}</p>
            {company.indirizzo && <p className="text-sm text-muted-foreground">{company.indirizzo}</p>}
            {company.partitaIva && <p className="text-sm text-muted-foreground">P.IVA {company.partitaIva}</p>}
            {(company.telefono || company.email) && (
              <p className="text-sm text-muted-foreground">{[company.telefono, company.email].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fattura</p>
            <p className="font-bold text-lg">N° {fattura.numero}</p>
            <p className="text-sm text-muted-foreground">Emissione: {formatDate(fattura.dataEmissione)}</p>
            <p className="text-sm text-muted-foreground">Scadenza: {formatDate(fattura.dataScadenza)}</p>
          </div>
        </div>

        {/* Cliente */}
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cliente</p>
          <p className="font-semibold">{clientFull?.ragioneSociale ?? "—"}</p>
          {clientFull && (
            <div className="text-sm text-muted-foreground">
              {clientFull.referente && <p>{clientFull.referente}</p>}
              {clientFull.indirizzo && <p>{clientFull.indirizzo}</p>}
              {clientFull.partitaIva && <p>P.IVA {clientFull.partitaIva}</p>}
              {clientFull.email && <p>{clientFull.email}</p>}
            </div>
          )}
        </div>

        {/* Voci */}
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
              {fattura.voci.map((v) => (
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

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotale</span><span>{formatEuro(totals.subtotale)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA {fattura.ivaPercentuale}%</span><span>{formatEuro(totals.iva)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Totale</span><span>{formatEuro(totals.totale)}</span></div>
          </div>
        </div>

        {fattura.note && (
          <div className="border-t pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note</p>
            <p className="text-sm whitespace-pre-wrap">{fattura.note}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-2 pt-2 print:hidden">
        <Button variant="outline" onClick={onEdit}><Pencil className="h-4 w-4" /> Modifica</Button>
        <Button variant="outline" onClick={onDelete} className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Elimina
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Cambia stato</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Stato fattura</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["bozza", "inviata", "pagata", "scaduta"] as FatturaStatus[]).map((s) => (
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
