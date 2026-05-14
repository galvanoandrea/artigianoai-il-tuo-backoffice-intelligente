import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreVertical, Pencil, Trash2, Eye, Users, Mail, Phone, MapPin, FileText, X } from "lucide-react";
import { toast } from "sonner";
import {
  useClients, addClient, updateClient, deleteClient, type Client, type ClientStatus,
} from "@/lib/clients-store";
import { ClientForm } from "@/components/ClientForm";

export const Route = createFileRoute("/dashboard/clienti")({
  component: ClientiPage,
});

const statusVariant: Record<ClientStatus, { label: string; className: string }> = {
  attivo: { label: "Attivo", className: "bg-accent text-accent-foreground border-transparent" },
  potenziale: { label: "Potenziale", className: "bg-primary/15 text-primary border-transparent" },
  inattivo: { label: "Inattivo", className: "bg-muted text-muted-foreground border-transparent" },
};

function ClientiPage() {
  const clients = useClients();
  const [search, setSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState<ClientStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statoFilter !== "all" && c.stato !== statoFilter) return false;
      if (!q) return true;
      return [c.ragioneSociale, c.referente, c.email, c.telefono, c.partitaIva]
        .some((f) => f.toLowerCase().includes(q));
    });
  }, [clients, search, statoFilter]);

  const hasFilters = !!search || statoFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatoFilter("all"); };

  const handleCreate = (data: Omit<Client, "id">) => {
    addClient(data);
    setCreateOpen(false);
    toast.success("Cliente aggiunto");
  };

  const handleUpdate = (data: Omit<Client, "id">) => {
    if (!editing) return;
    updateClient(editing.id, data);
    setEditing(null);
    toast.success("Cliente aggiornato");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteClient(deleteTarget.id);
    toast.success("Cliente eliminato");
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clienti</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci la tua rubrica clienti.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-11"
        >
          <Plus className="h-5 w-5" />
          Nuovo cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, referente, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={statoFilter} onValueChange={(v) => setStatoFilter(v as ClientStatus | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-48">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="attivo">Attivo</SelectItem>
            <SelectItem value="potenziale">Potenziale</SelectItem>
            <SelectItem value="inattivo">Inattivo</SelectItem>
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
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-60" />
              <p className="font-medium">
                {clients.length === 0 ? "Nessun cliente ancora" : "Nessun cliente trovato"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {clients.length === 0
                  ? "Aggiungi il tuo primo cliente per iniziare."
                  : "Prova a modificare i termini di ricerca."}
              </p>
              {clients.length === 0 && (
                <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-gradient-accent text-accent-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" /> Nuovo cliente
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome azienda</TableHead>
                  <TableHead className="hidden md:table-cell">Referente</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefono</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setViewing(c)}
                  >
                    <TableCell className="font-medium">
                      {c.ragioneSociale}
                      <div className="md:hidden text-xs text-muted-foreground mt-0.5">{c.referente}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.referente}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.telefono}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusVariant[c.stato].className}>
                        {statusVariant[c.stato].label}
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
                          <DropdownMenuItem onClick={() => setViewing(c)}>
                            <Eye className="h-4 w-4 mr-2" /> Visualizza
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(c)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(c)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo cliente</DialogTitle>
            <DialogDescription>Inserisci i dati del nuovo cliente.</DialogDescription>
          </DialogHeader>
          <ClientForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Crea cliente" />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica cliente</DialogTitle>
            <DialogDescription>Aggiorna le informazioni del cliente.</DialogDescription>
          </DialogHeader>
          {editing && (
            <ClientForm
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
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.ragioneSociale}</DialogTitle>
                <DialogDescription>
                  <Badge variant="outline" className={statusVariant[viewing.stato].className}>
                    {statusVariant[viewing.stato].label}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <DetailRow icon={Users} label="Referente" value={viewing.referente} />
                <DetailRow icon={Phone} label="Telefono" value={viewing.telefono} />
                <DetailRow icon={Mail} label="Email" value={viewing.email} />
                <DetailRow icon={MapPin} label="Indirizzo" value={viewing.indirizzo} />
                <DetailRow icon={FileText} label="Partita IVA" value={viewing.partitaIva} />
                {viewing.note && (
                  <div className="pt-3 border-t">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note</p>
                    <p className="whitespace-pre-wrap">{viewing.note}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setEditing(viewing); setViewing(null); }}>
                  <Pencil className="h-4 w-4" /> Modifica
                </Button>
                <Button onClick={() => setViewing(null)} className="bg-gradient-accent text-accent-foreground hover:opacity-90">
                  Chiudi
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>{deleteTarget?.ragioneSociale}</strong>. Questa azione non può essere annullata.
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

function DetailRow({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words">{value || <span className="text-muted-foreground italic">—</span>}</p>
      </div>
    </div>
  );
}