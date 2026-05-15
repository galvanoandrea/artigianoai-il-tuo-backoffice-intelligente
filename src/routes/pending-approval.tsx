import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, LogOut, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({
  head: () => ({
    meta: [
      { title: "In attesa di approvazione — ArtigianoAI" },
    ],
  }),
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const checkApproval = useCallback(async (showToast: boolean) => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) {
        if (showToast) toast.error("Errore nel controllo dello stato");
        return;
      }
      if (data?.approved) {
        toast.success("Account approvato! Reindirizzamento…");
        navigate({ to: "/dashboard" });
      } else if (showToast) {
        toast.info("Ancora in attesa di approvazione");
      }
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    (async () => {
      await checkApproval(false);
      setBootstrapping(false);
    })();
  }, [checkApproval]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (bootstrapping) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-accent grid place-items-center shadow-glow">
            <Clock className="w-7 h-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold">In attesa di approvazione</h1>
          <p className="text-muted-foreground">
            Il tuo account è stato creato correttamente. L'amministratore ti darà accesso a breve. Riceverai una notifica via email.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => checkApproval(true)}
              disabled={checking}
              className="flex-1 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Verifica…" : "Aggiorna stato"}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="flex-1">
              <LogOut className="w-4 h-4" /> Esci
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
