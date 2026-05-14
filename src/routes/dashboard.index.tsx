import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Users, FileText, ArrowRight, TrendingUp, TrendingDown, Calendar, Target } from "lucide-react";
import { useClients } from "@/lib/clients-store";
import { useQuotes, calcTotals, formatEuro } from "@/lib/quotes-store";
import { usePagamenti, formatEuroF } from "@/lib/fornitori-store";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

const MESI_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function getMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthRange(centerDate: Date, before: number, after: number): string[] {
  const keys: string[] = [];
  const start = new Date(centerDate);
  start.setMonth(start.getMonth() - before);
  for (let i = 0; i <= before + after; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function labelFromKey(key: string) {
  const [, m] = key.split("-");
  return MESI_IT[parseInt(m, 10) - 1];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatEuro(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function DashboardHome() {
  const clients = useClients();
  const quotes = useQuotes();
  const pagamenti = usePagamenti();
  const [periodo, setPeriodo] = useState<"3" | "6" | "12" | "24">("12");

  const now = new Date();
  const attivi = clients.filter((c) => c.stato === "attivo").length;

  // Distribuisce i mesi: metà prima, metà dopo
  const totMesi = parseInt(periodo, 10);
  const before = Math.floor(totMesi / 2);
  const after = totMesi - before - 1;

  // ---- Entrate ----
  const entrateKeys = buildMonthRange(now, before, after);

  const entrateData = useMemo(() => {
    const map: Record<string, { accettato: number; inviato: number }> = {};
    entrateKeys.forEach((k) => (map[k] = { accettato: 0, inviato: 0 }));

    quotes.forEach((q) => {
      if (q.stato !== "accettato" && q.stato !== "inviato") return;
      const key = getMonthKey(q.data);
      if (!map[key]) return;
      const { totale } = calcTotals(q.voci, q.ivaPercentuale);
      map[key][q.stato] += totale;
    });

    return entrateKeys.map((k) => ({
      mese: labelFromKey(k),
      Accettati: Math.round(map[k].accettato),
      "In sospeso": Math.round(map[k].inviato),
    }));
  }, [quotes, entrateKeys]);

  // ---- Uscite ----
  const usciteKeys = buildMonthRange(now, before, after);

  const usciteData = useMemo(() => {
    const map: Record<string, { da_pagare: number; pagato: number }> = {};
    usciteKeys.forEach((k) => (map[k] = { da_pagare: 0, pagato: 0 }));

    pagamenti.forEach((p) => {
      if (p.stato === "da_pagare") {
        const key = getMonthKey(p.dataScadenza);
        if (map[key]) map[key].da_pagare += p.importo;
      } else {
        const key = p.dataPagamento ? getMonthKey(p.dataPagamento) : null;
        if (key && map[key]) map[key].pagato += p.importo;
      }
    });

    return usciteKeys.map((k) => ({
      mese: labelFromKey(k),
      "Da pagare": Math.round(map[k].da_pagare),
      Pagate: Math.round(map[k].pagato),
    }));
  }, [pagamenti, usciteKeys]);

  // ---- KPI ----
  const totalePrevisti = quotes
    .filter((q) => q.stato === "accettato" || q.stato === "inviato")
    .reduce((s, q) => s + calcTotals(q.voci, q.ivaPercentuale).totale, 0);

  const totaleDaPagare = pagamenti
    .filter((p) => p.stato === "da_pagare")
    .reduce((s, p) => s + p.importo, 0);

  // ---- Andamento annuo (anno corrente) ----
  const annoCorrente = now.getFullYear();

  const annualeEntrate = useMemo(() => {
    const acc = { accettato: 0, inviato: 0, bozza: 0, rifiutato: 0 };
    quotes.forEach((q) => {
      if (new Date(q.data).getFullYear() !== annoCorrente) return;
      const { totale } = calcTotals(q.voci, q.ivaPercentuale);
      acc[q.stato] += totale;
    });
    const data = [
      { name: "Accettati", value: Math.round(acc.accettato), fill: "#10b981" },
      { name: "In sospeso", value: Math.round(acc.inviato), fill: "#f59e0b" },
      { name: "Bozze", value: Math.round(acc.bozza), fill: "#94a3b8" },
      { name: "Rifiutati", value: Math.round(acc.rifiutato), fill: "#f87171" },
    ].filter((d) => d.value > 0);
    return data;
  }, [quotes, annoCorrente]);

  const annualeUscite = useMemo(() => {
    const acc = { pagato: 0, da_pagare: 0 };
    pagamenti.forEach((p) => {
      const dateStr = p.stato === "da_pagare" ? p.dataScadenza : (p.dataPagamento ?? p.dataScadenza);
      if (new Date(dateStr).getFullYear() !== annoCorrente) return;
      acc[p.stato] += p.importo;
    });
    const data = [
      { name: "Pagate", value: Math.round(acc.pagato), fill: "#94a3b8" },
      { name: "Da pagare", value: Math.round(acc.da_pagare), fill: "#f97316" },
    ].filter((d) => d.value > 0);
    return data;
  }, [pagamenti, annoCorrente]);

  const totEntrateAnno = annualeEntrate.reduce((s, d) => s + d.value, 0);
  const totUsciteAnno = annualeUscite.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panoramica</h1>
          <p className="text-muted-foreground text-sm mt-1">Bentornato, ecco una sintesi della tua attività.</p>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
          <SelectTrigger className="h-11 w-full sm:w-44">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Ultimi 3 mesi</SelectItem>
            <SelectItem value="6">Ultimi 6 mesi</SelectItem>
            <SelectItem value="12">12 mesi</SelectItem>
            <SelectItem value="24">24 mesi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clienti attivi</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attivi}</div>
            <Button asChild variant="link" className="px-0 mt-1 h-auto text-xs">
              <Link to="/dashboard/clienti">Gestisci <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Preventivi attivi</CardTitle>
            <FileText className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quotes.filter((q) => q.stato === "accettato" || q.stato === "inviato").length}
            </div>
            <Button asChild variant="link" className="px-0 mt-1 h-auto text-xs">
              <Link to="/dashboard/preventivi">Vai ai preventivi <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entrate previste</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatEuro(totalePrevisti)}</div>
            <p className="text-xs text-muted-foreground mt-1">accettati + in sospeso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Da pagare</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatEuroF(totaleDaPagare)}</div>
            <Button asChild variant="link" className="px-0 mt-1 h-auto text-xs">
              <Link to="/dashboard/fornitori">Vai ai pagamenti <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Grafico Andamento Annuo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-accent" />
            Andamento annuo {annoCorrente}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Distribuzione entrate e uscite dell'anno in corso per stato
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Donut entrate */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium">Preventivi ({annoCorrente})</p>
              {annualeEntrate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8">Nessun dato</p>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={annualeEntrate}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {annualeEntrate.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatEuro(v)}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-muted-foreground">Totale</span>
                      <span className="text-sm font-bold">{formatEuro(totEntrateAnno)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {annualeEntrate.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium">{formatEuro(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Donut uscite */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium">Pagamenti fornitori ({annoCorrente})</p>
              {annualeUscite.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8">Nessun dato</p>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={annualeUscite}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {annualeUscite.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatEuro(v)}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-muted-foreground">Totale</span>
                      <span className="text-sm font-bold">{formatEuro(totUsciteAnno)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {annualeUscite.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium">{formatEuro(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grafico Entrate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Stima entrate mensili
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Importi IVA inclusa. Verde = preventivi accettati · Arancione = preventivi in sospeso (inviati)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={entrateData} barSize={28} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="mese" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Accettati" stackId="e" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="In sospeso" stackId="e" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grafico Uscite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            Uscite mensili (fornitori)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rosso = da pagare (per data scadenza) · Grigio = già pagate (per data pagamento)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usciteData} barSize={28} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="mese" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Pagate" stackId="u" fill="#94a3b8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Da pagare" stackId="u" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
