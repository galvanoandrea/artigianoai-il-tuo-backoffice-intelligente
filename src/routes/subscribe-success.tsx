import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/subscribe-success")({
  component: SubscribeSuccessPage,
});

function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Abbonamento attivato!</h1>
          <p className="text-muted-foreground">
            Grazie per aver attivato ArtigianoAI. Il tuo abbonamento mensile è ora attivo e si rinnoverà automaticamente ogni mese.
          </p>
        </div>
        <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow w-full">
          <Link to="/dashboard">Vai al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
