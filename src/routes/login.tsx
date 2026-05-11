import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPwd, setRegPwd] = useState("");

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome_completo: regName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrazione fallita", { description: error.message });
      return;
    }
    toast.success("Account creato!");
    navigate({ to: "/dashboard" });
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
              <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
                <Wrench className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg">ArtigianoAI</span>
            </div>

            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="register">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <h1 className="text-2xl font-bold mb-1">Accedi al tuo account</h1>
                <p className="text-muted-foreground mb-6">Inserisci le tue credenziali per continuare.</p>
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
                </form>
              </TabsContent>

              <TabsContent value="register">
                <h1 className="text-2xl font-bold mb-1">Crea il tuo account</h1>
                <p className="text-muted-foreground mb-6">È gratis e bastano 30 secondi.</p>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome e cognome</Label>
                    <Input id="name" placeholder="Mario Rossi" required className="h-12" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Email</Label>
                    <Input id="email2" type="email" placeholder="mario@artigiano.it" required className="h-12" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd2">Password</Label>
                    <Input id="pwd2" type="password" placeholder="Almeno 8 caratteri" required minLength={8} className="h-12" value={regPwd} onChange={(e) => setRegPwd(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                    {loading ? "Creazione…" : "Crea account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}