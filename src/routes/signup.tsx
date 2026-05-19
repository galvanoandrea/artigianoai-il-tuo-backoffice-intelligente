import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Registrati — ArtigianoAI" },
      { name: "description", content: "Crea il tuo account ArtigianoAI." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeAzienda, setNomeAzienda] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/pending-approval`,
        data: { nome_completo: nomeCompleto, nome_azienda: nomeAzienda },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrazione fallita", { description: error.message });
      return;
    }
    // Notifica admin in background — non blocca il flusso anche se fallisce
    fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: email, userName: nomeCompleto, userAzienda: nomeAzienda }),
    }).catch(() => {});
    toast.success("Account creato! In attesa di approvazione.");
    navigate({ to: "/pending-approval" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Left visual */}
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, oklch(0.74 0.16 60 / 0.5), transparent 50%)" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
            <Wrench className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-bold text-lg">ArtigianoAI</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-3">Inizia oggi.</h2>
          <p className="text-white/80 text-lg">Registrati e accedi al backoffice pensato per artigiani italiani.</p>
        </div>
        <div className="relative text-sm text-white/60">© ArtigianoAI</div>
      </div>

      {/* Right form */}
      <div className="flex flex-col p-6 md:p-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 md:mb-12">
          <ArrowLeft className="w-4 h-4" /> Torna alla home
        </Link>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="md:hidden flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
                <Wrench className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg">ArtigianoAI</span>
            </div>

            <h1 className="text-2xl font-bold mb-1">Crea il tuo account</h1>
            <p className="text-muted-foreground mb-6">Riceverai accesso dopo l'approvazione dell'amministratore.</p>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome e cognome</Label>
                <Input id="nome_completo" type="text" placeholder="Mario Rossi" required className="h-12" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_azienda">Nome azienda</Label>
                <Input id="nome_azienda" type="text" placeholder="Rossi Impianti S.r.l." required className="h-12" value={nomeAzienda} onChange={(e) => setNomeAzienda(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="mario@artigiano.it" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" required minLength={8} className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                {loading ? "Registrazione in corso…" : "Registrati"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Hai già un account?{" "}
                <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
                  Accedi
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
