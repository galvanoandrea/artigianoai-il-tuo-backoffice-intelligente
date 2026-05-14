import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, MoreVertical, Pencil, Trash2, CheckCircle2,
  Wallet, Building2, Clock, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useFornitori, usePagamenti,
  addFornitore, updateFornitore, deleteFornitore,
  addPagamento, updatePagamento, deletePagamento, segnaComePagato,
  formatEuroF, formatDateF,
  type Fornitore, type Pagamento, type PagamentoStato,
} from "@/lib/fornitori-store";

export const Route = createFileRoute("/dashboard/fornitori")({
  component: FornitoriPage,
});

const emptyF = (): Omit<Fornitore, "id"> => ({
  ragioneSociale: "",
  referente: "",
  telefono: "",
  email: "",
  partitaIva: "",
  note: "",
});

const emptyP = (fornitoreId = ""): Omit<Pagamento, "id"> => ({
  fornitoreId,
  descrizione: "",
  importo: 0,
  dataScadenza: new Date().toISOString().slice(0, 10),
  dataPagamento: "",
  stato: "da_pagare",
  note: "",
});

function FornitoriPage() {
  const fornitori = useFornitori();
  const pagamenti = usePagamenti();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("da_pagare");

  // fornitore dialog
  const [fOpen, setFOpen] = useState(false);
  const [fEditing, setFEditing] = useState<Fornitore | null>(null);
  const [fData, setFData] = useState(emptyF());

  // pagamento dialog
  const [pOpen, setPOpen] = useState(false);
  const [pEditing, setPEditing] = useState<Pagamento | null>(null);
  const [pData, setPData] = useState(emptyP());

  // delete confirms
  const [deleteF, setDeleteF] = useState<Fornitore | null>(null);
  const [deleteP, setDeleteP] = useState<Pagamento | null>(null);

  const filteredF = useMemo(() =>
    fornitori.filter((f) => {
      const q = search.toLowerCase();
      return !q ||
        f.ragioneSociale.toLowerCase().includes(q) ||
        f.referente.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.partitaIva.toLowerCase().includes(q);
    }), [fornitori, search]);

  const daPagare = useMemo(() => pagamenti.filter((p) => p.stato === "da_pagare"), [pagamenti]);
  const pagati = useMemo(() => pagamenti.filter((p) => p.stato === "pagato"), [pagamenti]);
  const totaleDaPagare = daPagare.reduce((s, p) => s + p.importo, 0);
  const totalePagato = pagati.reduce((s, p) => s + p.importo, 0);

  const pagamentiFiltered = (tab === "da_pagare" ? daPagare : pagati).filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const f = fornitori.find((f) => f.id === p.fornitoreId);
    return (
      p.descrizione.toLowerCase().includes(q) ||
      (f?.ragioneSociale ?? "").toLowerCase().includes(q)
    );
  });

  const fornitoreNome = (id: string) =>
    fornitori.find((f) => f.id === id)?.ragioneSociale ?? "—";

  // --- fornitore handlers ---
  const openNewF = () => { setFEditing(null); setFData(emptyF()); setFOpen(true); };
  const openEditF = (f: Fornitore) => { setFEditing(f); setFData({ ...f }); setFOpen(true); };
  const saveF = () => {
    if (!fData.ragioneSociale.trim()) { toast.error("Inserisci la ragione sociale"); return; }
    if (fEditing) {
      updateFornitore(fEditing.id, fData);
      toast.success("Fornitore aggiornato");
    } else {
      addFornitore(fData);
      toast.success("Fornitore aggiunto");
    }
    setFOpen(false);
  };
  const confirmDeleteF = () => {
    if (!deleteF) return;
    deleteFornitore(deleteF.id);
    toast.success("Fornitore eliminato");
    setDeleteF(null);
  };

  // --- pagamento handlers ---
  const openNewP = (fornitoreId = "") => {
    setPEditing(null);
    setPData(emptyP(fornitoreId));
    setPOpen(true);
  };
  const openEditP = (p: Pagamento) => { setPEditing(p); setPData({ ...p }); setPOpen(true); };
  const saveP = () => {
    if (!pData.descrizione.trim()) { toast.error("Inserisci la descrizione"); return; }
    if (!pData.fornitoreId) { toast.error("Seleziona il fornitore"); return; }
    if (pData.importo <= 0) { toast.error("Inserisci un importo valido"); return; }
    if (pEditing) {
      updatePagamento(pEditing.id, pData);
      toast.success("Pagamento aggiornato");
    } else {
      addPagamento(pData);
      toast.success("Pagamento aggiunto");
    }
    setPOpen(false);
  };
  const handleSegna = (p: Pagamento) => {
    segnaComePagato(p.id);
    toast.success("Segnato come pagato");
  };
  const confirmDeleteP = () => {
    if (!deleteP) return;
    deletePagamento(deleteP.id);
    toast.success("Pagamento eliminato");
    setDeleteP(null);
  };

  const isScaduto = (iso: string) =>
    iso && new Date(iso) < new Date() ? true : false;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornitori</h1>
          <p className="text-muted-foreground text-sm">Gestisci fornitori e pagamenti</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setTab("fornitori"); openNewF(); }}>
            <Building2 className="h-4 w-4" /> Fornitore
          </Button>
          <Button
            className="bg-gradient-accent text-accent-foreground hover:opacity-90"
            onClick={() => { setTab("da_pagare"); openNewP(); }}
          >
            <Plus className="h-4 w-4" /> Pagamento
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" /> Da pagare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatEuroF(totaleDaPagare)}</div>
            <p className="text-xs text-muted-foreground">{daPagare.length} pagament{daPagare.length === 1 ? "o" : "i"} in sospeso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Già pagati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatEuroF(totalePagato)}</div>
            <p className="text-xs text-muted-foreground">{pagati.length} pagament{pagati.length === 1 ? "o" : "i"} completat{pagati.length === 1 ? "o" : "i"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Fornitori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fornitori.length}</div>
            <p className="text-xs text-muted-foreground">fornitori registrati</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca fornitore, descrizione, P.IVA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="da_pagare" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Da pagare
            {daPagare.length > 0 && (
              <Badge className="ml-1 bg-orange-500 text-white text-xs h-5 px-1.5">{daPagare.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagati" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Pagati
          </TabsTrigger>
          <TabsTrigger value="fornitori" className="gap-2">
            <Building2 className="h-4 w-4" />
            Fornitori
          </TabsTrigger>
        </TabsList>

        {/* DA PAGARE */}
        <TabsContent value="da_pagare" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornitore</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="hidden sm:table-cell">Scadenza</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentiFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        Nessun pagamento in sospeso
                      </TableCell>
                    </TableRow>
                  )}
                  {pagamentiFiltered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{fornitoreNome(p.fornitoreId)}</TableCell>
                      <TableCell>
                        <div>{p.descrizione}</div>
                        {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatEuroF(p.importo)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={isScaduto(p.dataScadenza) ? "text-red-500 font-medium" : ""}>
                          {formatDateF(p.dataScadenza)}
                          {isScaduto(p.dataScadenza) && " ⚠"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSegna(p)}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Segna come pagato
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditP(p)}>
                              <Pencil className="h-4 w-4" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteP(p)}
                            >
                              <Trash2 className="h-4 w-4" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGATI */}
        <TabsContent value="pagati" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornitore</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="hidden sm:table-cell">Data pagamento</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentiFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        Nessun pagamento completato
                      </TableCell>
                    </TableRow>
                  )}
                  {pagamentiFiltered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{fornitoreNome(p.fornitoreId)}</TableCell>
                      <TableCell>
                        <div>{p.descrizione}</div>
                        {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatEuroF(p.importo)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-transparent">
                          {formatDateF(p.dataPagamento)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditP(p)}>
                              <Pencil className="h-4 w-4" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteP(p)}
                            >
                              <Trash2 className="h-4 w-4" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORNITORI */}
        <TabsContent value="fornitori" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ragione sociale</TableHead>
                    <TableHead className="hidden md:table-cell">Referente</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefono</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead>Sospeso</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredF.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Nessun fornitore trovato
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredF.map((f) => {
                    const sospeso = pagamenti
                      .filter((p) => p.fornitoreId === f.id && p.stato === "da_pagare")
                      .reduce((s, p) => s + p.importo, 0);
                    const numSospesi = pagamenti.filter(
                      (p) => p.fornitoreId === f.id && p.stato === "da_pagare",
                    ).length;
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div className="font-medium">{f.ragioneSociale}</div>
                          {f.partitaIva && (
                            <div className="text-xs text-muted-foreground">{f.partitaIva}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{f.referente || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{f.telefono || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{f.email || "—"}</TableCell>
                        <TableCell>
                          {sospeso > 0 ? (
                            <div>
                              <span className="font-medium text-orange-600">{formatEuroF(sospeso)}</span>
                              <span className="text-xs text-muted-foreground ml-1">({numSospesi})</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openNewP(f.id)}>
                                <Wallet className="h-4 w-4" /> Aggiungi pagamento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditF(f)}>
                                <Pencil className="h-4 w-4" /> Modifica
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteF(f)}
                              >
                                <Trash2 className="h-4 w-4" /> Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Fornitore */}
      <Dialog open={fOpen} onOpenChange={setFOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{fEditing ? "Modifica fornitore" : "Nuovo fornitore"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ragione sociale *</Label>
              <Input
                value={fData.ragioneSociale}
                onChange={(e) => setFData((d) => ({ ...d, ragioneSociale: e.target.value }))}
                placeholder="es. Ferramenta Rossi S.r.l."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referente</Label>
                <Input
                  value={fData.referente}
                  onChange={(e) => setFData((d) => ({ ...d, referente: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>P.IVA</Label>
                <Input
                  value={fData.partitaIva}
                  onChange={(e) => setFData((d) => ({ ...d, partitaIva: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={fData.telefono}
                  onChange={(e) => setFData((d) => ({ ...d, telefono: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={fData.email}
                  onChange={(e) => setFData((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                rows={2}
                value={fData.note}
                onChange={(e) => setFData((d) => ({ ...d, note: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFOpen(false)}>Annulla</Button>
              <Button
                className="bg-gradient-accent text-accent-foreground hover:opacity-90"
                onClick={saveF}
              >
                {fEditing ? "Salva modifiche" : "Aggiungi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Pagamento */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pEditing ? "Modifica pagamento" : "Nuovo pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fornitore *</Label>
              <Select
                value={pData.fornitoreId}
                onValueChange={(v) => setPData((d) => ({ ...d, fornitoreId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona fornitore" />
                </SelectTrigger>
                <SelectContent>
                  {fornitori.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.ragioneSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrizione *</Label>
              <Input
                value={pData.descrizione}
                onChange={(e) => setPData((d) => ({ ...d, descrizione: e.target.value }))}
                placeholder="es. Fornitura materiali cantiere via Roma"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={pData.importo}
                  onChange={(e) => setPData((d) => ({ ...d, importo: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data scadenza</Label>
                <Input
                  type="date"
                  value={pData.dataScadenza}
                  onChange={(e) => setPData((d) => ({ ...d, dataScadenza: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stato</Label>
                <Select
                  value={pData.stato}
                  onValueChange={(v) => setPData((d) => ({ ...d, stato: v as PagamentoStato }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="da_pagare">Da pagare</SelectItem>
                    <SelectItem value="pagato">Pagato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pData.stato === "pagato" && (
                <div className="space-y-2">
                  <Label>Data pagamento</Label>
                  <Input
                    type="date"
                    value={pData.dataPagamento}
                    onChange={(e) => setPData((d) => ({ ...d, dataPagamento: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                rows={2}
                value={pData.note}
                onChange={(e) => setPData((d) => ({ ...d, note: e.target.value }))}
                placeholder="es. Fattura n. 2026/001"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPOpen(false)}>Annulla</Button>
              <Button
                className="bg-gradient-accent text-accent-foreground hover:opacity-90"
                onClick={saveP}
              >
                {pEditing ? "Salva modifiche" : "Aggiungi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete fornitore */}
      <AlertDialog open={!!deleteF} onOpenChange={(o) => !o && setDeleteF(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina fornitore</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminando <strong>{deleteF?.ragioneSociale}</strong> verranno eliminati anche tutti i
              suoi pagamenti. Operazione irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteF}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete pagamento */}
      <AlertDialog open={!!deleteP} onOpenChange={(o) => !o && setDeleteP(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi eliminare il pagamento <strong>{deleteP?.descrizione}</strong>? Operazione irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteP}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
