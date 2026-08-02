import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({
    meta: [{ title: "Benvenuto su ArtigianoAI" }],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        setReady(true);
        if (session?.user?.email) setUserEmail(session.user.email);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        if (session.user?.email) setUserEmail(session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwd2) {
      toast.error("Le password non coincidono");
      return;
    }
    if (pwd.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) {
      toast.error("Errore", { description: error.message });
      return;
    }
    toast.success("Password impostata! Benvenuto su ArtigianoAI.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Left panel */}
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, oklch(0.74 0.16 60 / 0.5), transparent 50%)" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <Logo className="w-9 h-9" />
          <span className="font-bold text-lg">ArtigianoAI</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-3">Benvenuto!</h2>
          <p className="text-white/80 text-lg">Sei stato invitato a usare ArtigianoAI.<br />Scegli la tua password per iniziare.</p>
        </div>
        <div className="relative text-sm text-white/60">© ArtigianoAI</div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col p-6 md:p-12">
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Logo className="w-8 h-8" />
          <span className="font-bold">ArtigianoAI</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-1">Imposta la tua password</h1>
            {userEmail && (
              <p className="text-sm text-muted-foreground mb-1">Account: <strong>{userEmail}</strong></p>
            )}
            <p className="text-muted-foreground text-sm mb-6">
              {ready
                ? "Scegli una password sicura per accedere al tuo account."
                : "Apri questa pagina dal link di invito che hai ricevuto via email."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Password</Label>
                <Input id="pwd" type="password" required minLength={8} className="h-12" value={pwd} onChange={(e) => setPwd(e.target.value)} disabled={!ready} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd2">Conferma password</Label>
                <Input id="pwd2" type="password" required minLength={8} className="h-12" value={pwd2} onChange={(e) => setPwd2(e.target.value)} disabled={!ready} />
              </div>
              <Button
                type="submit"
                disabled={loading || !ready}
                className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base"
              >
                {loading ? "Salvataggio…" : "Accedi ad ArtigianoAI"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
