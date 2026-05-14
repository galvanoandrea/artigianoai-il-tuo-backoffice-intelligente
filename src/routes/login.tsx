import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accedi — ArtigianoAI" },
      { name: "description", content: "Accedi o crea il tuo account ArtigianoAI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) {
      toast.error("Accesso fallito", { description: error.message });
      return;
    }
    toast.success("Bentornato!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwdConfirm) {
      toast.error("Le password non coincidono");
      return;
    }
    if (pwd.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pwd });
    setLoading(false);
    if (error) {
      toast.error("Registrazione fallita", { description: error.message });
      return;
    }
    toast.success("Account creato!", {
      description: "Controlla la tua email per confermare la registrazione, oppure accedi direttamente se la conferma email è disabilitata.",
      duration: 8000,
    });
    setMode("login");
    setPwd("");
    setPwdConfirm("");
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
          <h2 className="text-4xl font-bold mb-3">
            {mode === "login" ? "Bentornato al lavoro." : "Inizia subito."}
          </h2>
          <p className="text-white/80 text-lg">
            {mode === "login"
              ? "Accedi per gestire clienti e preventivi in un attimo."
              : "Crea il tuo account e inizia a gestire il tuo lavoro."}
          </p>
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

            {/* Toggle */}
            <div className="flex rounded-lg border border-border mb-6 p-1 gap-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Accedi
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Registrati
              </button>
            </div>

            {mode === "login" ? (
              <>
                <h1 className="text-2xl font-bold mb-1">Accedi al tuo account</h1>
                <p className="text-muted-foreground mb-6">Inserisci le tue credenziali per continuare.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="mario@artigiano.it" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd">Password</Label>
                    <Input id="pwd" type="password" placeholder="••••••••" required className="h-12" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                    {loading ? "Accesso in corso…" : "Accedi"}
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                      Hai dimenticato la password?
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-1">Crea il tuo account</h1>
                <p className="text-muted-foreground mb-6">Registrati per iniziare a usare ArtigianoAI.</p>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input id="email-signup" type="email" placeholder="mario@artigiano.it" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd-signup">Password</Label>
                    <Input id="pwd-signup" type="password" placeholder="••••••••" required className="h-12" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd-confirm">Conferma password</Label>
                    <Input id="pwd-confirm" type="password" placeholder="••••••••" required className="h-12" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                    {loading ? "Registrazione in corso…" : "Crea account"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
