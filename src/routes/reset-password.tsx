import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reimposta password — ArtigianoAI" },
      { name: "description", content: "Imposta una nuova password per il tuo account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwd2) {
      toast.error("Le password non coincidono");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) {
      toast.error("Aggiornamento fallito", { description: authErrorMessage(error) });
      return;
    }
    toast.success("Password aggiornata");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, oklch(0.74 0.16 60 / 0.5), transparent 50%)" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <Logo className="w-9 h-9" />
          <span className="font-bold text-lg">ArtigianoAI</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-3">Quasi fatto.</h2>
          <p className="text-white/80 text-lg">Scegli una nuova password sicura.</p>
        </div>
        <div className="relative text-sm text-white/60">© ArtigianoAI</div>
      </div>

      <div className="flex flex-col p-6 md:p-12">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 md:mb-12">
          <ArrowLeft className="w-4 h-4" /> Torna al login
        </Link>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-1">Imposta nuova password</h1>
            <p className="text-muted-foreground mb-6">
              {ready
                ? "Inserisci e conferma la tua nuova password."
                : "Apri questa pagina dal link che ti abbiamo inviato via email."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Nuova password</Label>
                <Input id="pwd" type="password" required minLength={8} className="h-12" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd2">Conferma password</Label>
                <Input id="pwd2" type="password" required minLength={8} className="h-12" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading || !ready} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                {loading ? "Aggiornamento…" : "Aggiorna password"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}