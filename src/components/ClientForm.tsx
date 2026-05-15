import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Client, ClientStatus } from "@/lib/clients-store";

type FormData = Omit<Client, "id">;

const empty = (): FormData => ({
  ragioneSociale: "",
  referente: "",
  telefono: "",
  email: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  partitaIva: "",
  note: "",
  stato: "attivo",
});

const fromInitial = (c: Client): FormData => {
  const { id: _id, ...rest } = c;
  return rest;
};

export function ClientForm({
  initial, onSubmit, onCancel, submitLabel = "Salva",
}: {
  initial?: Client;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [data, setData] = useState<FormData>(() => initial ? fromInitial(initial) : empty());
  const [submitting, setSubmitting] = useState(false);
  const [capLoading, setCapLoading] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (initial) setData(fromInitial(initial));
  }, [initial]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleCapChange = async (value: string) => {
    const cap = value.replace(/\D/g, "").slice(0, 5);
    update("cap", cap);
    if (cap.length !== 5) return;
    setCapLoading(true);
    try {
      const res = await fetch(`https://api.zippopotam.us/it/${cap}`);
      if (!res.ok) return;
      const json = await res.json();
      const place = json.places?.[0];
      if (place && mountedRef.current) {
        setData((d) => ({
          ...d,
          citta: place["place name"] ?? d.citta,
          provincia: (place["state abbreviation"] ?? d.provincia).toUpperCase(),
        }));
      }
    } catch {
      // silently ignore network errors
    } finally {
      if (mountedRef.current) setCapLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.ragioneSociale.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ragioneSociale">Ragione sociale *</Label>
          <Input id="ragioneSociale" value={data.ragioneSociale} onChange={(e) => update("ragioneSociale", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referente">Nome referente</Label>
          <Input id="referente" value={data.referente} onChange={(e) => update("referente", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Telefono</Label>
          <Input id="telefono" type="tel" value={data.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partitaIva">Partita IVA</Label>
          <Input id="partitaIva" value={data.partitaIva} onChange={(e) => update("partitaIva", e.target.value)} />
        </div>

        {/* Address section */}
        <div className="sm:col-span-2 border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indirizzo</p>
          <div className="space-y-2">
            <Label htmlFor="indirizzo">Via / Piazza</Label>
            <Input id="indirizzo" placeholder="Es. Via Roma 12" value={data.indirizzo} onChange={(e) => update("indirizzo", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cap">CAP</Label>
              <div className="relative">
                <Input
                  id="cap"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="20100"
                  value={data.cap}
                  onChange={(e) => handleCapChange(e.target.value)}
                />
                {capLoading && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-1">
              <Label htmlFor="citta">Città</Label>
              <Input id="citta" placeholder="Milano" value={data.citta} onChange={(e) => update("citta", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provincia">Prov.</Label>
              <Input id="provincia" maxLength={2} placeholder="MI" value={data.provincia} onChange={(e) => update("provincia", e.target.value.toUpperCase())} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stato">Stato</Label>
          <Select value={data.stato} onValueChange={(v) => update("stato", v as ClientStatus)}>
            <SelectTrigger id="stato"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="attivo">Attivo</SelectItem>
              <SelectItem value="potenziale">Potenziale</SelectItem>
              <SelectItem value="inattivo">Inattivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" rows={3} value={data.note} onChange={(e) => update("note", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annulla</Button>
        <Button type="submit" disabled={submitting} className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          {submitting ? "Salvataggio…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
