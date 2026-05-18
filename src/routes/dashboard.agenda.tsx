import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  type Appointment,
  type AppointmentType,
} from "@/lib/agenda-store";
import { useClients } from "@/lib/clients-store";

export const Route = createFileRoute("/dashboard/agenda")({
  head: () => ({ meta: [{ title: "Agenda — ArtigianoAI" }] }),
  component: AgendaPage,
});

const DAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const DAYS_LONG_IT = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

const TYPE_LABELS: Record<AppointmentType, string> = {
  sopralluogo: "Sopralluogo",
  lavoro: "Lavoro",
  appuntamento: "Appuntamento",
  altro: "Altro",
};

const TYPE_COLORS: Record<AppointmentType, string> = {
  sopralluogo: "bg-blue-100 text-blue-800 border-transparent",
  lavoro: "bg-emerald-100 text-emerald-800 border-transparent",
  appuntamento: "bg-primary/15 text-primary border-transparent",
  altro: "bg-muted text-muted-foreground border-transparent",
};

const TYPE_DOT_COLORS: Record<AppointmentType, string> = {
  sopralluogo: "bg-blue-500",
  lavoro: "bg-emerald-500",
  appuntamento: "bg-primary",
  altro: "bg-muted-foreground",
};

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(isoDate: string): string {
  const [y, m, day] = isoDate.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return `${DAYS_LONG_IT[d.getDay()]} ${day} ${MONTHS_IT[m - 1]} ${y}`;
}

const EMPTY_FORM = {
  title: "",
  type: "appuntamento" as AppointmentType,
  date: "",
  timeStart: "",
  timeEnd: "",
  clientId: "",
  description: "",
};

type FormData = typeof EMPTY_FORM;

function AgendaPage() {
  const appointments = useAppointments();
  const clients = useClients();

  const today = new Date();
  const todayIso = toIsoDate(today);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<string>(todayIso);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Monday=0, Sunday=6 (ISO week)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ iso: null, day: null });
      } else {
        const d = new Date(currentYear, currentMonth, dayNum);
        cells.push({ iso: toIsoDate(d), day: dayNum });
      }
    }
    return cells;
  }, [currentYear, currentMonth]);

  // Appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(
    () => appointmentsByDate.get(selectedDay) ?? [],
    [appointmentsByDate, selectedDay]
  );

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: selectedDay });
    setDialogOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setForm({
      title: a.title,
      type: a.type,
      date: a.date,
      timeStart: a.timeStart,
      timeEnd: a.timeEnd,
      clientId: a.clientId,
      description: a.description,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("Il titolo è obbligatorio"); return; }
    if (!form.date) { toast.error("La data è obbligatoria"); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      clientId: form.clientId,
      description: form.description,
    };
    let ok: boolean;
    if (editing) {
      ok = await updateAppointment(editing.id, payload);
      if (ok) { toast.success("Appuntamento aggiornato"); setDialogOpen(false); }
    } else {
      ok = await addAppointment(payload);
      if (ok) {
        toast.success("Appuntamento creato");
        setSelectedDay(form.date);
        setDialogOpen(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ok = await deleteAppointment(deleteTarget.id);
    if (ok) toast.success("Appuntamento eliminato");
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gestisci i tuoi appuntamenti</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar: 2/3 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg">
                  {MONTHS_IT[currentMonth]} {currentYear}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_IT.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  if (!cell.iso) {
                    return <div key={idx} className="aspect-square" />;
                  }
                  const cellAppts = appointmentsByDate.get(cell.iso) ?? [];
                  const isToday = cell.iso === todayIso;
                  const isSelected = cell.iso === selectedDay;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() => setSelectedDay(cell.iso!)}
                      className={[
                        "aspect-square rounded-lg flex flex-col items-center justify-start p-1 text-sm transition-colors",
                        isToday ? "bg-accent text-accent-foreground font-bold" : "hover:bg-muted",
                        isSelected ? "ring-2 ring-primary" : "",
                      ].join(" ")}
                    >
                      <span className="leading-tight">{cell.day}</span>
                      {cellAppts.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {cellAppts.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT_COLORS[a.type]}`}
                            />
                          ))}
                          {cellAppts.length > 3 && (
                            <span className="text-[9px] text-muted-foreground leading-none">
                              +{cellAppts.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel: 1/3 */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{formatDateLong(selectedDay)}</p>
              <p className="text-xs text-muted-foreground">
                {selectedDayAppointments.length} appuntament{selectedDayAppointments.length === 1 ? "o" : "i"}
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nuovo appuntamento
            </Button>
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
              <CalendarDays className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nessun appuntamento per questo giorno</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayAppointments.map((a) => {
                const client = clients.find((c) => c.id === a.clientId);
                return (
                  <Card key={a.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`text-xs ${TYPE_COLORS[a.type]}`}>
                              {TYPE_LABELS[a.type]}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm truncate">{a.title}</p>
                          {(a.timeStart || a.timeEnd) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>
                                {a.timeStart || "--:--"}{a.timeEnd ? ` – ${a.timeEnd}` : ""}
                              </span>
                            </div>
                          )}
                          {client && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <User className="w-3 h-3" />
                              <span>{client.ragioneSociale || client.referente}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica appuntamento" : "Nuovo appuntamento"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Aggiorna i dettagli dell'appuntamento." : "Aggiungi un nuovo appuntamento all'agenda."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {/* Titolo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-title">Titolo *</Label>
              <Input
                id="apt-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Es. Sopralluogo cliente Rossi"
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as AppointmentType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sopralluogo">Sopralluogo</SelectItem>
                  <SelectItem value="lavoro">Lavoro</SelectItem>
                  <SelectItem value="appuntamento">Appuntamento</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-date">Data *</Label>
              <Input
                id="apt-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            {/* Ora inizio / Ora fine */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-time-start">Ora inizio</Label>
                <Input
                  id="apt-time-start"
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm((f) => ({ ...f, timeStart: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apt-time-end">Ora fine</Label>
                <Input
                  id="apt-time-end"
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm((f) => ({ ...f, timeEnd: e.target.value }))}
                />
              </div>
            </div>

            {/* Cliente */}
            <div className="flex flex-col gap-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.clientId || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessun cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessun cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.ragioneSociale || c.referente || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-note">Note</Label>
              <Textarea
                id="apt-note"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Salva modifiche" : "Crea appuntamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina appuntamento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare &ldquo;{deleteTarget?.title}&rdquo;? L&apos;operazione non può essere annullata.
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
