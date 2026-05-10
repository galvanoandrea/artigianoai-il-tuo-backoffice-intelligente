import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Wrench, Users, FileText, Sparkles, ShieldCheck, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArtigianoAI — Backoffice per artigiani" },
      { name: "description", content: "Gestisci clienti e preventivi in pochi tap. Pensato per artigiani e piccole imprese italiane." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
              <Wrench className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">ArtigianoAI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Accedi</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow">
              <Link to="/login">Inizia gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.74 0.16 60 / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.40 0.12 255 / 0.6), transparent 50%)" }} />
          <div className="container mx-auto px-4 py-20 md:py-32 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Backoffice intelligente per artigiani</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
                Meno carta, più <span className="text-accent">cantiere</span>.
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
                Gestisci clienti, preventivi e amministrazione in pochi tap. Pensato per elettricisti, idraulici, imprese edili e installatori italiani.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base h-14 px-8">
                  <Link to="/login">
                    Inizia gratis <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-base h-14 px-8">
                  <Link to="/dashboard">Vedi la demo</Link>
                </Button>
              </div>
            </div>
          </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tutto il tuo lavoro, in un'unica app</h2>
          <p className="text-muted-foreground text-lg">Niente più fogli sparsi o preventivi su WhatsApp.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: "Anagrafica clienti", text: "Tutti i tuoi clienti e cantieri sempre a portata di mano." },
            { icon: FileText, title: "Preventivi rapidi", text: "Crea e invia preventivi professionali in meno di un minuto." },
            { icon: Clock, title: "Risparmia tempo", text: "Automatizza i compiti ripetitivi e dedicati al tuo mestiere." },
            { icon: ShieldCheck, title: "Dati al sicuro", text: "I tuoi dati sono protetti e sempre disponibili sul cloud." },
            { icon: Sparkles, title: "Assistente AI", text: "Suggerimenti intelligenti per voci di preventivo e clienti." },
            { icon: Wrench, title: "Pensato per te", text: "Interfaccia semplice, senza menù complicati o gergo tecnico." },
          ].map((b) => (
            <div key={b.title} className="group p-6 rounded-2xl border border-border bg-card hover:shadow-elegant transition-smooth hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-accent grid place-items-center mb-4 shadow-glow">
                <b.icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-3xl bg-gradient-hero text-primary-foreground p-10 md:p-16 text-center shadow-elegant">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto a semplificare la tua giornata?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">Crea il tuo account gratuito in meno di 30 secondi.</p>
          <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-14 px-10 text-base">
            <Link to="/login">Inizia ora <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ArtigianoAI · Fatto in Italia
      </footer>
    </div>
  );
}
