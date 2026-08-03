import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useClients } from "@/lib/clients-store";
import {
  type Quote, type QuoteDraft, type QuoteItem, type QuoteStatus, calcTotals, formatEuro,
} from "@/lib/quotes-store";
import { AIQuoteGenerator, type AIQuoteResult } from "@/components/AIQuoteGenerator";

type FormData = QuoteDraft;

const todayIso = () => new Date().toISOString().slice(0, 10);
const newRow = (): QuoteItem => ({
  id: `v${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  descrizione: "",
  quantita: 1,
  prezzoUnitario: 0,
});

const empty = (): FormData => ({
  clienteId: "",
  data: todayIso(),
  titolo: "",
  descrizione: "",
  voci: [newRow()],
  note: "",
  ivaPercentuale: 22,
  stato: "bozza",
});

export function QuoteForm({
  initial, onSubmit, onCancel, submitLabel = "Salva",
}: {
  initial?: Quote;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const clients = useClients();
  const [data, setData] = useState<FormData>(() => {
    if (initial) {
      const { id: _id, numero: _n, ...rest } = initial;
      return rest;
    }
    return empty();
  });
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (initial) {
      const { id: _id, numero: _n, ...rest } = initial;
      setData(rest);
    }
  }, [initial]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const updateRow = (id: string, patch: Partial<QuoteItem>) =>
    setData((d) => ({ ...d, voci: d.voci.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));

  const addRow = () => setData((d) => ({ ...d, voci: [...d.voci, newRow()] }));
  const removeRow = (id: string) =>
    setData((d) => ({ ...d, voci: d.voci.length > 1 ? d.voci.filter((v) => v.id !== id) : d.voci }));

  const totals = calcTotals(data.voci, data.ivaPercentuale);

  const applyAIResult = (ai: AIQuoteResult) => {
    setData((d) => ({
      ...d,
      titolo: ai.titolo,
      descrizione: ai.descrizione,
      voci: ai.voci.map((v, i) => ({
        id: `v${Date.now()}${i}${Math.random().toString(36).slice(2, 6)}`,
        descrizione: v.unita && v.unita !== "cad"
          ? `${v.descrizione} (${v.unita})`
          : v.descrizione,
        quantita: v.quantita,
        prezzoUnitario: v.prezzo_unitario,
      })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.clienteId || !data.titolo.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!initial && <AIQuoteGenerator onGenerated={applyAIResult} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select value={data.clienteId} onValueChange={(v) => update("clienteId", v)}>
            <SelectTrigger id="cliente"><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.ragioneSociale}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data.data} onChange={(e) => update("data", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="titolo">Titolo lavoro *</Label>
          <Input id="titolo" value={data.titolo} onChange={(e) => update("titolo", e.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descrizione">Descrizione</Label>
          <Textarea id="descrizione" rows={2} value={data.descrizione} onChange={(e) => update("descrizione", e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Voci preventivo</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Aggiungi voce
          </Button>
        </div>
        <div className="space-y-2">
          {data.voci.map((v) => {
            const totale = v.quantita * v.prezzoUnitario;
            return (
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
                  <div className="h-9 flex items-center text-sm font-medium">{formatEuro(totale)}</div>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                    onClick={() => removeRow(v.id)} disabled={data.voci.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="stato">Stato</Label>
          <Select value={data.stato} onValueChange={(v) => update("stato", v as QuoteStatus)}>
            <SelectTrigger id="stato"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bozza">Bozza</SelectItem>
              <SelectItem value="inviato">Inviato</SelectItem>
              <SelectItem value="accettato">Accettato</SelectItem>
              <SelectItem value="rifiutato">Rifiutato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="iva">IVA (%)</Label>
          <Input id="iva" type="number" min={0} max={100} step="0.01" value={data.ivaPercentuale}
            onChange={(e) => update("ivaPercentuale", Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Note finali</Label>
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
        <Button type="submit" disabled={submitting} className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          {submitting ? "Salvataggio…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
