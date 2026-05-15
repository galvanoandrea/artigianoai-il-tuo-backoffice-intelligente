import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShieldCheck, Mail, Users, Ban, CheckCircle2, RefreshCw, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
};

async function getAuthHeader(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
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

function AdminPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ user: UserEntry; action: "ban" | "unban" | "approve" | "reject" } | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

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
      toast.error("Errore", { description: err instanceof Error ? err.message : "Errore sconosciuto" });
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
          action === "ban" ? `${user.email} bloccato` :
          action === "unban" ? `${user.email} sbloccato` :
          action === "approve" ? `${user.email} approvato` :
          `${user.email} rifiutato`;
        toast.success(msg);
        setUsers((prev) => prev.map((u) => {
          if (u.id !== user.id) return u;
          if (action === "ban" || action === "unban") return { ...u, banned: action === "ban" };
          if (action === "approve" || action === "reject") return { ...u, approved: action === "approve" };
          return u;
        }));
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
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
          <ShieldCheck className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Gestisci utenti e accessi alla piattaforma.</p>
        </div>
      </div>

      {/* Invite card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4" /> Invita un nuovo utente</CardTitle>
          <CardDescription>
            Inserisci l'email. L'utente riceverà un link per impostare la propria password e accedere.
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
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Utenti registrati</CardTitle>
            <CardDescription className="mt-1">Puoi bloccare o sbloccare l'accesso a qualsiasi utente.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadUsers} disabled={loadingUsers} title="Aggiorna lista">
            <RefreshCw className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers && users.length === 0 ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nessun utente trovato.</p>
          ) : (
            <div className="divide-y">
              {users.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.email}</span>
                        {isMe && <Badge variant="outline" className="text-xs">Tu</Badge>}
                        {u.banned && (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-transparent text-xs">
                            Bloccato
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Registrato {formatDate(u.created_at)}
                        {u.last_sign_in_at && ` · Ultimo accesso ${formatDate(u.last_sign_in_at)}`}
                      </div>
                    </div>
                    {!isMe && (
                      <Button
                        size="sm"
                        variant={u.banned ? "outline" : "outline"}
                        disabled={actioning === u.id}
                        onClick={() => setConfirmTarget({ user: u, action: u.banned ? "unban" : "ban" })}
                        className={u.banned
                          ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          : "text-destructive border-destructive/30 hover:bg-destructive/10"}
                      >
                        {actioning === u.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : u.banned ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Sblocca</>
                        ) : (
                          <><Ban className="h-3 w-3 mr-1" /> Blocca</>
                        )}
                      </Button>
                    )}
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
              {confirmTarget?.action === "ban" ? "Bloccare questo utente?" : "Sbloccare questo utente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === "ban"
                ? `${confirmTarget.user.email} non potrà più accedere alla piattaforma. Potrai sbloccarlo in qualsiasi momento.`
                : `${confirmTarget?.user.email} potrà tornare ad accedere alla piattaforma.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanAction}
              className={confirmTarget?.action === "ban"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-emerald-600 text-white hover:bg-emerald-700"}
            >
              {confirmTarget?.action === "ban" ? "Blocca accesso" : "Sblocca accesso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
