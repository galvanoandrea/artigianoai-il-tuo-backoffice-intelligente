import { createFileRoute, Link } from "@tanstack/react-router";
import { authErrorMessage } from "@/lib/auth-errors";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recupera password — ArtigianoAI" },
      { name: "description", content: "Reimposta la password del tuo account ArtigianoAI." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Invio fallito", { description: authErrorMessage(error) });
      return;
    }
    setSent(true);
    toast.success("Email inviata", { description: "Controlla la tua casella di posta." });
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
          <h2 className="text-4xl font-bold mb-3">Nessun problema.</h2>
          <p className="text-white/80 text-lg">Ti aiutiamo a tornare al lavoro in pochi secondi.</p>
        </div>
        <div className="relative text-sm text-white/60">© ArtigianoAI</div>
      </div>

      <div className="flex flex-col p-6 md:p-12">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 md:mb-12">
          <ArrowLeft className="w-4 h-4" /> Torna al login
        </Link>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-1">Recupera la password</h1>
            <p className="text-muted-foreground mb-6">
              {sent
                ? "Ti abbiamo inviato un link per reimpostare la password. Controlla la tua email."
                : "Inserisci la tua email e ti invieremo un link per reimpostare la password."}
            </p>
            {!sent && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="mario@artigiano.it" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base">
                  {loading ? "Invio in corso…" : "Invia link di recupero"}
                </Button>
              </form>
            )}
            {sent && (
              <Button asChild className="w-full h-12">
                <Link to="/login">Torna al login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}