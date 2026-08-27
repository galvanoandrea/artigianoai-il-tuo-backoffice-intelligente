import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  Users,
  Ban,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  BarChart2,
  X,
  Building2,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  CalendarClock,
  CalendarOff,
} from "lucide-react";
import { SUBSCRIPTION_DAYS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({ meta: [{ title: "Admin — ArtigianoAI" }] }),
  component: AdminPage,
});

type UserEntry = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  approved: boolean;
  subscription_status: string | null;
  subscription_started_at: string | null;
};

function subscriptionDaysLeft(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const expiresAt = new Date(startedAt).getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
}

type UserStats = {
  profile: {
    nome_completo?: string;
    nome_azienda?: string;
    partita_iva?: string;
    telefono?: string;
    email_azienda?: string;
    citta?: string;
  };
  clients: { total: number; active: number };
  quotes: {
    byStatus: { bozza: number; inviato: number; accettato: number; rifiutato: number };
    totalAccettati: number;
  };
  fatture: {
    byStatus: { bozza: number; inviata: number; pagata: number; scaduta: number };
    fatturatoTotale: number;
    fatturatoIncassato: number;
  };
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

async function getAuthHeader(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

async function callAdmin(method: string, body?: object) {
  const auth = await getAuthHeader();
  if (!auth) throw new Error("Non autenticato");
  const res = await fetch("/api/admin", {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

async function fetchUserStats(userId: string): Promise<UserStats | null> {
  const auth = await getAuthHeader();
  if (!auth) return null;
  const res = await fetch(`/api/admin-user-stats?userId=${userId}`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) return null;
  return res.json();
}

function AdminPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserEntry;
    action:
      | "ban"
      | "unban"
      | "approve"
      | "reject"
      | "activate_subscription"
      | "deactivate_subscription";
  } | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [statsUser, setStatsUser] = useState<UserEntry | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await callAdmin("GET");
      if (res.users) setUsers(res.users);
    } catch {
      toast.error("Errore nel caricamento utenti");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    callAdmin("GET")
      .then((res) => {
        if (!res?.isAdmin) {
          toast.error("Accesso negato");
          navigate({ to: "/dashboard" });
          return;
        }
        setAllowed(true);
        if (res.users) setUsers(res.users);
      })
      .catch(() => navigate({ to: "/dashboard" }))
      .finally(() => setChecking(false));
  }, [navigate]);

  const openStats = async (u: UserEntry) => {
    setStatsUser(u);
    setStats(null);
    setLoadingStats(true);
    try {
      const data = await fetchUserStats(u.id);
      setStats(data);
    } catch {
      toast.error("Errore nel caricamento statistiche");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const redirectTo = `${window.location.origin}/accept-invite`;
      const res = await callAdmin("POST", { email, redirectTo });
      if (!res.ok) {
        toast.error("Invito fallito", { description: res.error });
      } else {
        toast.success("Invito inviato", { description: `Link di accesso inviato a ${email}` });
        setEmail("");
        setTimeout(loadUsers, 1500);
      }
    } catch (err: unknown) {
      toast.error("Errore", {
        description: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleBanAction = async () => {
    if (!confirmTarget) return;
    const { user, action } = confirmTarget;
    setConfirmTarget(null);
    setActioning(user.id);
    try {
      const res = await callAdmin("PATCH", { targetUserId: user.id, action });
      if (!res.ok) {
        toast.error("Operazione fallita", { description: res.error });
      } else {
        const msg =
          action === "ban"
            ? `${user.email} bloccato`
            : action === "unban"
              ? `${user.email} sbloccato`
              : action === "approve"
                ? `${user.email} approvato`
                : action === "activate_subscription"
                  ? `Abbonamento attivato per ${user.email}`
                  : action === "deactivate_subscription"
                    ? `Abbonamento disattivato per ${user.email}`
                    : `${user.email} rifiutato`;
        toast.success(msg);
        const nowIso = new Date().toISOString();
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== user.id) return u;
            if (action === "ban" || action === "unban") return { ...u, banned: action === "ban" };
            if (action === "approve" || action === "reject")
              return { ...u, approved: action === "approve" };
            if (action === "activate_subscription")
              return { ...u, subscription_status: "active", subscription_started_at: nowIso };
            if (action === "deactivate_subscription")
              return { ...u, subscription_status: null, subscription_started_at: null };
            return u;
          }),
        );
      }
    } catch {
      toast.error("Errore di rete");
    } finally {
      setActioning(null);
    }
  };

  if (checking) return <div className="p-6 text-muted-foreground">Verifica permessi…</div>;
  if (!allowed) return null;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
          <ShieldCheck className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci utenti e accessi alla piattaforma.
          </p>
        </div>
      </div>

      {/* Invite card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Invita un nuovo utente
          </CardTitle>
          <CardDescription>
            Inserisci l'email. L'utente riceverà un link per impostare la propria password e
            accedere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nome@esempio.it"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={inviting}
              className="h-11 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow"
            >
              {inviting ? "Invio…" : "Invia invito"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Utenti registrati
            </CardTitle>
            <CardDescription className="mt-1">
              Gli utenti <strong>In attesa</strong> hanno bisogno di approvazione prima di accedere.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadUsers}
            disabled={loadingUsers}
            title="Aggiorna lista"
          >
            <RefreshCw className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers && users.length === 0 ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nessun utente trovato.</p>
          ) : (
            <div className="divide-y">
              {users.map((u) => {
                const isMe = u.id === me?.id;
                const pending = !u.approved && !u.banned;
                const daysLeft = subscriptionDaysLeft(u.subscription_started_at);
                const subActive = u.subscription_status === "active" && (daysLeft ?? 0) > 0;
                const subExpired = u.subscription_status === "active" && !subActive;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.email}</span>
                        {isMe && (
                          <Badge variant="outline" className="text-xs">
                            Tu
                          </Badge>
                        )}
                        {pending && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-600 border-transparent text-xs flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> In attesa
                          </Badge>
                        )}
                        {u.banned && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/15 text-destructive border-transparent text-xs"
                          >
                            Bloccato
                          </Badge>
                        )}
                        {u.approved && !u.banned && !isMe && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-600 border-transparent text-xs"
                          >
                            Attivo
                          </Badge>
                        )}
                        {subActive && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-transparent text-xs flex items-center gap-1"
                          >
                            <CalendarClock className="w-3 h-3" /> Abbonamento — {daysLeft}g
                            rimanenti
                          </Badge>
                        )}
                        {subExpired && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-600 border-transparent text-xs flex items-center gap-1"
                          >
                            <CalendarOff className="w-3 h-3" /> Abbonamento scaduto
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Registrato {formatDate(u.created_at)}
                        {u.last_sign_in_at && ` · Ultimo accesso ${formatDate(u.last_sign_in_at)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stats button — visible for all users except self */}
                      {!isMe && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStats(u)}
                          className="h-8"
                        >
                          <BarChart2 className="h-3 w-3 mr-1" /> Dettagli
                        </Button>
                      )}
                      {!isMe && (
                        <div className="flex items-center gap-2">
                          {actioning === u.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : pending ? (
                            <>
                              <Button
                                size="sm"
                                disabled={actioning === u.id}
                                onClick={() => setConfirmTarget({ user: u, action: "approve" })}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 h-8"
                              >
                                <UserCheck className="h-3 w-3 mr-1" /> Approva
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actioning === u.id}
                                onClick={() => setConfirmTarget({ user: u, action: "reject" })}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8"
                              >
                                <UserX className="h-3 w-3 mr-1" /> Rifiuta
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setConfirmTarget({ user: u, action: "activate_subscription" })
                                }
                                className="bg-primary text-primary-foreground hover:opacity-90 h-8"
                              >
                                <CalendarClock className="h-3 w-3 mr-1" />{" "}
                                {subActive ? "Rinnova" : "Attiva abbonamento"}
                              </Button>
                              {u.subscription_status === "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setConfirmTarget({ user: u, action: "deactivate_subscription" })
                                  }
                                  className="text-muted-foreground h-8"
                                >
                                  <CalendarOff className="h-3 w-3 mr-1" /> Disattiva
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actioning === u.id}
                                onClick={() =>
                                  setConfirmTarget({ user: u, action: u.banned ? "unban" : "ban" })
                                }
                                className={
                                  u.banned
                                    ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950 h-8"
                                    : "text-destructive border-destructive/30 hover:bg-destructive/10 h-8"
                                }
                              >
                                {u.banned ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Sblocca
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3 w-3 mr-1" /> Blocca
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.action === "approve" && "Approvare questo utente?"}
              {confirmTarget?.action === "reject" && "Rifiutare questo utente?"}
              {confirmTarget?.action === "ban" && "Bloccare questo utente?"}
              {confirmTarget?.action === "unban" && "Sbloccare questo utente?"}
              {confirmTarget?.action === "activate_subscription" &&
                "Attivare l'abbonamento annuale?"}
              {confirmTarget?.action === "deactivate_subscription" && "Disattivare l'abbonamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === "approve" &&
                `${confirmTarget.user.email} potrà accedere alla piattaforma.`}
              {confirmTarget?.action === "reject" &&
                `${confirmTarget?.user.email} non potrà accedere. Potrai approvarlo in seguito aggiornando la lista.`}
              {confirmTarget?.action === "ban" &&
                `${confirmTarget?.user.email} non potrà più accedere. Potrai sbloccarlo in qualsiasi momento.`}
              {confirmTarget?.action === "unban" &&
                `${confirmTarget?.user.email} potrà tornare ad accedere alla piattaforma.`}
              {confirmTarget?.action === "activate_subscription" &&
                `Conferma solo dopo aver ricevuto il pagamento. Parte da oggi un countdown di ${SUBSCRIPTION_DAYS} giorni per ${confirmTarget?.user.email}.`}
              {confirmTarget?.action === "deactivate_subscription" &&
                `${confirmTarget?.user.email} tornerà nello stato di prova/scaduto in base alla data di approvazione.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanAction}
              className={
                confirmTarget?.action === "approve" ||
                confirmTarget?.action === "unban" ||
                confirmTarget?.action === "activate_subscription"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {confirmTarget?.action === "approve" && "Approva accesso"}
              {confirmTarget?.action === "reject" && "Rifiuta"}
              {confirmTarget?.action === "ban" && "Blocca accesso"}
              {confirmTarget?.action === "unban" && "Sblocca accesso"}
              {confirmTarget?.action === "activate_subscription" && "Attiva abbonamento"}
              {confirmTarget?.action === "deactivate_subscription" && "Disattiva abbonamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User stats dialog */}
      <Dialog open={!!statsUser} onOpenChange={(o) => !o && setStatsUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Situazione utente
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{statsUser?.email}</p>
          </DialogHeader>

          {loadingStats ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-5 py-2">
              {/* Profilo azienda */}
              {(stats.profile.nome_azienda || stats.profile.nome_completo) && (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {stats.profile.nome_azienda || stats.profile.nome_completo}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {stats.profile.partita_iva && <span>P.IVA {stats.profile.partita_iva}</span>}
                    {stats.profile.citta && <span>{stats.profile.citta}</span>}
                    {stats.profile.telefono && <span>{stats.profile.telefono}</span>}
                    {stats.profile.email_azienda && <span>{stats.profile.email_azienda}</span>}
                  </div>
                </div>
              )}

              {/* Clienti */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Clienti
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Users} label="Totali" value={stats.clients.total} />
                  <StatCard
                    icon={CheckCircle2}
                    label="Attivi"
                    value={stats.clients.active}
                    color="emerald"
                  />
                </div>
              </div>

              {/* Preventivi */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Preventivi
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={FileText} label="Bozze" value={stats.quotes.byStatus.bozza} />
                  <StatCard
                    icon={FileText}
                    label="Inviati"
                    value={stats.quotes.byStatus.inviato}
                    color="primary"
                  />
                  <StatCard
                    icon={FileText}
                    label="Accettati"
                    value={stats.quotes.byStatus.accettato}
                    color="emerald"
                  />
                  <StatCard
                    icon={FileText}
                    label="Rifiutati"
                    value={stats.quotes.byStatus.rifiutato}
                    color="red"
                  />
                </div>
                {stats.quotes.totalAccettati > 0 && (
                  <div className="mt-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Valore accettati
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {euro(stats.quotes.totalAccettati)}
                    </span>
                  </div>
                )}
              </div>

              {/* Fatture */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Fatture
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={Receipt} label="Bozze" value={stats.fatture.byStatus.bozza} />
                  <StatCard
                    icon={Receipt}
                    label="Inviate"
                    value={stats.fatture.byStatus.inviata}
                    color="primary"
                  />
                  <StatCard
                    icon={Receipt}
                    label="Pagate"
                    value={stats.fatture.byStatus.pagata}
                    color="emerald"
                  />
                  <StatCard
                    icon={Receipt}
                    label="Scadute"
                    value={stats.fatture.byStatus.scaduta}
                    color="red"
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Fatturato emesso
                    </span>
                    <span className="font-semibold">{euro(stats.fatture.fatturatoTotale)}</span>
                  </div>
                  <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Incassato
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {euro(stats.fatture.fatturatoIncassato)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun dato disponibile.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: "emerald" | "primary" | "red";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "primary"
        ? "text-primary"
        : color === "red"
          ? "text-destructive"
          : "text-foreground";

  return (
    <div className="rounded-md border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
