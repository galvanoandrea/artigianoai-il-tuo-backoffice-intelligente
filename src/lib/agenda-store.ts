import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type AppointmentType = "sopralluogo" | "lavoro" | "appuntamento" | "altro";

export interface Appointment {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;       // ISO date "YYYY-MM-DD"
  timeStart: string;  // "HH:MM" or ""
  timeEnd: string;    // "HH:MM" or ""
  clientId: string;   // "" if none
  type: AppointmentType;
}

type Row = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  time_start: string | null;
  time_end: string | null;
  client_id: string | null;
  type: string;
};

const rowToAppointment = (r: Row): Appointment => ({
  id: r.id,
  userId: r.user_id,
  title: r.title ?? "",
  description: r.description ?? "",
  date: r.date ?? "",
  timeStart: r.time_start ?? "",
  timeEnd: r.time_end ?? "",
  clientId: r.client_id ?? "",
  type: (r.type as AppointmentType) ?? "appuntamento",
});

const appointmentToRow = (a: Omit<Appointment, "id" | "userId">) => ({
  title: a.title,
  description: a.description || null,
  date: a.date,
  time_start: a.timeStart || null,
  time_end: a.timeEnd || null,
  client_id: a.clientId || null,
  type: a.type,
});

let appointments: Appointment[] = [];
let loaded = false;
let loading = false;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((l) => l());
const getSnapshot = () => appointments;

export async function loadAppointments() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time_start", { ascending: true });
    if (error) {
      console.error("[agenda-store] load error:", error);
      toast.error(`Errore caricamento appuntamenti: ${error.message}`);
      return;
    }
    appointments = (data ?? []).map((r) => rowToAppointment(r as unknown as Row));
    loaded = true;
    emit();
  } finally {
    loading = false;
  }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) loadAppointments();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      appointments = [];
      loaded = false;
      emit();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      loadAppointments();
    }
  });
}

export function useAppointments() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded && !loading) loadAppointments();
  }, []);
  return value;
}

export async function addAppointment(data: Omit<Appointment, "id" | "userId">): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    toast.error("Utente non autenticato");
    return false;
  }
  const { data: row, error } = await supabase
    .from("appointments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ ...(appointmentToRow(data) as any), user_id: userData.user.id })
    .select()
    .single();
  if (error || !row) {
    console.error("[agenda-store] add error:", error);
    toast.error(`Errore salvataggio appuntamento: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  appointments = [...appointments, rowToAppointment(row as unknown as Row)].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.timeStart || "").localeCompare(b.timeStart || "");
  });
  emit();
  return true;
}

export async function updateAppointment(id: string, data: Omit<Appointment, "id" | "userId">): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("appointments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(appointmentToRow(data) as any)
    .eq("id", id)
    .select()
    .single();
  if (error || !row) {
    console.error("[agenda-store] update error:", error);
    toast.error(`Errore aggiornamento appuntamento: ${error?.message ?? "risposta vuota"}`);
    return false;
  }
  appointments = appointments
    .map((a) => (a.id === id ? rowToAppointment(row as unknown as Row) : a))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.timeStart || "").localeCompare(b.timeStart || "");
    });
  emit();
  return true;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) {
    console.error("[agenda-store] delete error:", error);
    toast.error(`Errore eliminazione appuntamento: ${error.message}`);
    return false;
  }
  appointments = appointments.filter((a) => a.id !== id);
  emit();
  return true;
}
