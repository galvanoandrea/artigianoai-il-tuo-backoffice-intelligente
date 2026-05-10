import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, ClientStatus } from "@/lib/clients-store";

type FormData = Omit<Client, "id">;

const empty: FormData = {
  ragioneSociale: "",
  referente: "",
  telefono: "",
  email: "",
  indirizzo: "",
  partitaIva: "",
  note: "",
  stato: "attivo",
};

export function ClientForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salva",
}: {
  initial?: Client;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [data, setData] = useState<FormData>(empty);

  useEffect(() => {
    if (initial) {
      const { id: _id, ...rest } = initial;
      setData(rest);
    } else {
      setData(empty);
    }
  }, [initial]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.ragioneSociale.trim()) return;
    onSubmit(data);
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="indirizzo">Indirizzo</Label>
          <Input id="indirizzo" value={data.indirizzo} onChange={(e) => update("indirizzo", e.target.value)} />
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
        <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        <Button type="submit" className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}