import { createFileRoute } from "@tanstack/react-router";
import { authErrorMessage } from "@/lib/auth-errors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, CalendarClock, CheckCircle2, AlertTriangle, Clock, Crown } from "lucide-react";
import { TRIAL_DAYS, PRICE_MONTH, PRICE_YEAR, REGULAR_PRICE_MONTH, REGULAR_PRICE_YEAR } from "@/lib/pricing";

type Interval = "month" | "year";

function formatPrice(founding: boolean, interval: Interval): string {
  const amount = interval === "year" ? PRICE_YEAR : PRICE_MONTH;
  const unit = interval === "year" ? "anno" : "mese";
  return `€${amount}/${unit}${founding ? " a vita" : ""}`;
}

export const Route = createFileRoute("/dashboard/impostazioni")({
  component: ImpostazioniPage,
});

type TrialStatus =
  | { state: "pending" }
  | { state: "active"; daysLeft: number; expiresAt: Date }
  | { state: "expiring_soon"; daysLeft: number; expiresAt: Date }
  | { state: "expired"; expiredDaysAgo: number };

function computeTrialStatus(approvedAt: string | null | undefined): TrialStatus {
  if (!approvedAt) return { state: "pending" };
  const start = new Date(approvedAt);
  const expiresAt = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (daysLeft > 7) return { state: "active", daysLeft, expiresAt };
  if (daysLeft > 0) return { state: "expiring_soon", daysLeft, expiresAt };
  return { state: "expired", expiredDaysAgo: Math.abs(daysLeft) };
}

async function getAuthHeader(): Promise<string | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

async function redirectToStripe(endpoint: string, body?: Record<string, unknown>): Promise<void> {
  const auth = await getAuthHeader();
  if (!auth) return;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

function IntervalToggle({
  interval,
  onChange,
}: {
  interval: Interval;
  onChange: (i: Interval) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 bg-muted/50">
      <button
        type="button"
        onClick={() => onChange("month")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          interval === "month" ? "bg-background shadow-sm" : "text-muted-foreground"
        }`}
      >
        Mensile · €{PRICE_MONTH}/mese
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          interval === "year" ? "bg-background shadow-sm" : "text-muted-foreground"
        }`}
      >
        Annuale · €{PRICE_YEAR}/anno
      </button>
    </div>
  );
}

function FoundingBanner({ slotsLeft }: { slotsLeft: number | null }) {
  if (slotsLeft === null || slotsLeft <= 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
      <Crown className="w-3.5 h-3.5 shrink-0" />
      <span>
        Offerta Founding Member: blocca <strong>€{PRICE_MONTH}/mese a vita</strong> — solo{" "}
        <strong>{slotsLeft}</strong> {slotsLeft === 1 ? "posto rimasto" : "posti rimasti"} su 5.
        Dopo, il prezzo standard sarà <strong>€{REGULAR_PRICE_MONTH}/mese</strong> (o{" "}
        <strong>€{REGULAR_PRICE_YEAR}/anno</strong>).
      </span>
    </div>
  );
}

function TrialCard({
  approvedAt,
  subscriptionStatus,
  isFoundingMember,
  billingInterval,
  foundingSlotsLeft,
}: {
  approvedAt: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  isFoundingMember: boolean;
  billingInterval: Interval | null | undefined;
  foundingSlotsLeft: number | null;
}) {
  const [redirecting, setRedirecting] = useState(false);
  const [interval, setInterval] = useState<Interval>("month");

  const handleSubscribe = async () => {
    setRedirecting(true);
    await redirectToStripe("/api/create-checkout", { interval });
    setRedirecting(false);
  };

  const handlePortal = async () => {
    setRedirecting(true);
    await redirectToStripe("/api/customer-portal");
    setRedirecting(false);
  };

  // If already subscribed via Stripe, show subscription state
  if (subscriptionStatus === "active") {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-emerald-600" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                {isFoundingMember && <Crown className="w-4 h-4 text-amber-500" />}
                Abbonamento attivo{isFoundingMember ? " · Founding Member" : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatPrice(isFoundingMember, billingInterval ?? "month")} · rinnovo automatico
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={redirecting} onClick={handlePortal}>
            {redirecting ? "Caricamento…" : "Gestisci abbonamento"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionStatus === "past_due") {
    return (
      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-amber-600" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Pagamento non riuscito
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aggiorna il metodo di pagamento per continuare.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={redirecting}
            onClick={handlePortal}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {redirecting ? "Caricamento…" : "Aggiorna pagamento"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionStatus === "canceled") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-destructive" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Abbonamento annullato</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Riattiva per continuare ad usare la piattaforma.
              </p>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0 space-y-3">
          <FoundingBanner slotsLeft={foundingSlotsLeft} />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <IntervalToggle interval={interval} onChange={setInterval} />
            <Button
              size="sm"
              disabled={redirecting}
              onClick={handleSubscribe}
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow"
            >
              {redirecting ? "Caricamento…" : "Riattiva abbonamento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = computeTrialStatus(approvedAt);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

  if (status.state === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-muted-foreground" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              In attesa di approvazione. Il periodo di prova partirà non appena l'amministratore
              attiverà il tuo account.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.state === "active") {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-emerald-600" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Periodo di prova attivo — {status.daysLeft} giorni rimanenti
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scade il {formatDate(status.expiresAt)}
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round((status.daysLeft / TRIAL_DAYS) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Alla scadenza del periodo di prova gratuito, l'abbonamento è di{" "}
            <strong>€{PRICE_MONTH}/mese</strong> (oppure <strong>€{PRICE_YEAR}/anno</strong>, 2 mesi
            gratis). Puoi abbonarti fin da subito, senza aspettare la scadenza.
          </p>
          <FoundingBanner slotsLeft={foundingSlotsLeft} />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <IntervalToggle interval={interval} onChange={setInterval} />
            <Button
              size="sm"
              variant="outline"
              disabled={redirecting}
              onClick={handleSubscribe}
              className="shrink-0"
            >
              {redirecting ? "Caricamento…" : "Abbonati ora"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.state === "expiring_soon") {
    return (
      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-amber-600" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Periodo di prova in scadenza — {status.daysLeft}{" "}
                  {status.daysLeft === 1 ? "giorno" : "giorni"} rimanenti
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scade il {formatDate(status.expiresAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.round((status.daysLeft / TRIAL_DAYS) * 100)}%` }}
            />
          </div>
          <FoundingBanner slotsLeft={foundingSlotsLeft} />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <IntervalToggle interval={interval} onChange={setInterval} />
            <Button
              size="sm"
              disabled={redirecting}
              onClick={handleSubscribe}
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow shrink-0"
            >
              {redirecting ? "Caricamento…" : "Abbonati ora"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // expired
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-4 h-4 text-destructive" /> Abbonamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-destructive">
              Periodo di prova scaduto{" "}
              {status.expiredDaysAgo > 0 ? `${status.expiredDaysAgo} giorni fa` : "oggi"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attiva l'abbonamento per continuare.
            </p>
          </div>
        </div>
        <FoundingBanner slotsLeft={foundingSlotsLeft} />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <IntervalToggle interval={interval} onChange={setInterval} />
          <Button
            size="sm"
            disabled={redirecting}
            onClick={handleSubscribe}
            className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow shrink-0"
          >
            {redirecting ? "Caricamento…" : "Abbonati ora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type ProfileForm = {
  nome: string;
  cognome: string;
  nome_azienda: string;
  email_azienda: string;
  telefono: string;
  partita_iva: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
};

function ImpostazioniPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null | undefined>(undefined);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null | undefined>(
    undefined,
  );
  const [isFoundingMember, setIsFoundingMember] = useState(false);
  const [billingInterval, setBillingInterval] = useState<Interval | null | undefined>(undefined);
  const [foundingSlotsLeft, setFoundingSlotsLeft] = useState<number | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    nome: "",
    cognome: "",
    nome_azienda: "",
    email_azienda: "",
    telefono: "",
    partita_iva: "",
    indirizzo: "",
    cap: "",
    citta: "",
    provincia: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      // select("*") so new columns added by migration are returned when available
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        toast.error("Errore nel caricamento del profilo");
      } else if (data) {
        setApprovedAt((data as any).approved_at ?? null);
        setSubscriptionStatus((data as any).subscription_status ?? null);
        setIsFoundingMember((data as any).is_founding_member === true);
        setBillingInterval(((data as any).billing_interval as Interval) ?? null);
        let nome = (data as any).nome ?? "";
        let cognome = (data as any).cognome ?? "";
        if (!nome && !cognome && (data as any).nome_completo) {
          const parts = ((data as any).nome_completo as string).trim().split(/\s+/);
          nome = parts[0] ?? "";
          cognome = parts.slice(1).join(" ");
        }
        setForm({
          nome,
          cognome,
          nome_azienda: (data as any).nome_azienda ?? "",
          email_azienda: (data as any).email_azienda ?? "",
          telefono: (data as any).telefono ?? "",
          partita_iva: (data as any).partita_iva ?? "",
          indirizzo: (data as any).indirizzo ?? "",
          cap: (data as any).cap ?? "",
          citta: (data as any).citta ?? "",
          provincia: (data as any).provincia ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("founding_slots_remaining").then(({ data, error }) => {
      if (!error && typeof data === "number") setFoundingSlotsLeft(data);
    });
  }, [user]);

  const update = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const nome_completo = `${form.nome} ${form.cognome}`.trim();
    // Base columns — always exist
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      nome: form.nome.trim() || null,
      cognome: form.cognome.trim() || null,
      nome_completo: nome_completo || null,
      nome_azienda: form.nome_azienda.trim() || null,
      telefono: form.telefono.trim() || null,
      partita_iva: form.partita_iva.trim() || null,
      indirizzo: form.indirizzo.trim() || null,
    });
    // Extended columns added by migration — update separately, ignore if not yet present
    await supabase
      .from("profiles")
      .update({
        email_azienda: form.email_azienda.trim() || null,
        cap: form.cap.trim() || null,
        citta: form.citta.trim() || null,
        provincia: form.provincia.trim() || null,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvataggio", { description: authErrorMessage(error) });
    } else {
      toast.success("Modifiche salvate con successo");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci i dati del tuo profilo e della tua azienda.
        </p>
      </div>

      <TrialCard
        approvedAt={approvedAt}
        subscriptionStatus={subscriptionStatus}
        isFoundingMember={isFoundingMember}
        billingInterval={billingInterval}
        foundingSlotsLeft={foundingSlotsLeft}
      />

      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
          <CardDescription>Queste informazioni appariranno nei tuoi preventivi.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm">Caricamento…</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={update("nome")}
                    placeholder="Mario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome</Label>
                  <Input
                    id="cognome"
                    value={form.cognome}
                    onChange={update("cognome")}
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_azienda">Nome azienda</Label>
                  <Input
                    id="nome_azienda"
                    value={form.nome_azienda}
                    onChange={update("nome_azienda")}
                    placeholder="Es. Rossi Impianti S.r.l."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partita_iva">Partita IVA</Label>
                  <Input
                    id="partita_iva"
                    value={form.partita_iva}
                    onChange={update("partita_iva")}
                    placeholder="IT12345678901"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email account</Label>
                  <Input id="email" type="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_azienda">Email azienda</Label>
                  <Input
                    id="email_azienda"
                    type="email"
                    value={form.email_azienda}
                    onChange={update("email_azienda")}
                    placeholder="info@miaimpresa.it"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={update("telefono")}
                    placeholder="+39 333 1234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={form.indirizzo}
                  onChange={update("indirizzo")}
                  placeholder="Via Roma 1"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={form.cap}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setForm((f) => ({ ...f, cap: v }));
                    }}
                    placeholder="20100"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="citta">Città</Label>
                  <Input
                    id="citta"
                    value={form.citta}
                    onChange={update("citta")}
                    placeholder="Milano"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="provincia">Prov.</Label>
                  <Input
                    id="provincia"
                    value={form.provincia}
                    onChange={(e) => {
                      const v = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 2);
                      setForm((f) => ({ ...f, provincia: v }));
                    }}
                    placeholder="MI"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvataggio…" : "Salva modifiche"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
