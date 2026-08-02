import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accedi — ArtigianoAI" },
      { name: "description", content: "Accedi al tuo account ArtigianoAI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPwd,
    });
    setLoading(false);
    if (error) {
      toast.error("Accesso fallito", { description: error.message });
      return;
    }
    toast.success("Bentornato!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Left visual */}
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, oklch(0.74 0.16 60 / 0.5), transparent 50%)" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <Logo className="w-9 h-9" />
          <span className="font-bold text-lg">ArtigianoAI</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-3">Bentornato al lavoro.</h2>
          <p className="text-white/80 text-lg">Accedi per gestire clienti e preventivi in un attimo.</p>
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
              <Logo className="w-9 h-9" />
              <span className="font-bold text-lg">ArtigianoAI</span>
            </div>

            <h1 className="text-2xl font-bold mb-1">Accedi al tuo account</h1>
            <p className="text-muted-foreground mb-6">L'accesso è riservato agli utenti invitati.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="mario@artigiano.it" required className="h-12" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Password</Label>
                <Input id="pwd" type="password" placeholder="••••••••" required className="h-12" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
