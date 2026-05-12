import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { inviteUser, checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({
    meta: [{ title: "Admin — ArtigianoAI" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkIsAdmin);
  const inviteFn = useServerFn(inviteUser);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFn()
      .then((res) => {
        if (!res.isAdmin) {
          toast.error("Accesso negato");
          navigate({ to: "/dashboard" });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        navigate({ to: "/dashboard" });
      })
      .finally(() => setChecking(false));
  }, [checkFn, navigate]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await inviteFn({
        data: {
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      if (!res.ok) {
        toast.error("Invito fallito", { description: res.error });
      } else {
        toast.success("Invito inviato", { description: `Email inviata a ${email}` });
        setEmail("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error("Errore", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="p-6 text-muted-foreground">Verifica permessi…</div>;
  }
  if (!allowed) return null;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
          <ShieldCheck className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Sezione riservata. Invita nuovi utenti via email.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4" /> Invita un nuovo utente</CardTitle>
          <CardDescription>
            Inserisci l'email. Il sistema invierà un link di invito per impostare la password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email del nuovo utente</Label>
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
              disabled={loading}
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow"
            >
              {loading ? "Invio in corso…" : "Invia invito"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}