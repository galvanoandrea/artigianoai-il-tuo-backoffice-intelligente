import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, Users, FileText, Sparkles, ShieldCheck, Clock, ArrowRight,
  Building2, Zap, Star, Package, BarChart3, Printer,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArtigianoAI — Il backoffice intelligente per artigiani italiani" },
      { name: "description", content: "Gestisci clienti, preventivi e fornitori in pochi tap. Pensato per elettricisti, idraulici, imprese edili e installatori italiani." },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Users,
    title: "Anagrafica clienti",
    text: "Tutti i tuoi clienti con indirizzo, P.IVA, referente e recapiti. Sempre a portata di mano, mai più carta.",
  },
  {
    icon: FileText,
    title: "Preventivi professionali",
    text: "Crea preventivi con i tuoi dati azienda, voci dettagliate, IVA automatica. Pronti in meno di un minuto.",
  },
  {
    icon: Package,
    title: "Gestione fornitori",
    text: "Tieni traccia di tutti i tuoi fornitori, contatti e materiali. Tutto in un posto solo.",
  },
  {
    icon: Printer,
    title: "Stampa e PDF",
    text: "Ogni preventivo è pronto per la stampa o l'invio via email con la tua intestazione aziendale.",
  },
  {
    icon: ShieldCheck,
    title: "Dati sicuri sul cloud",
    text: "I tuoi dati sono protetti e accessibili da qualsiasi dispositivo. Nessun backup manuale.",
  },
  {
    icon: Zap,
    title: "Veloce da usare",
    text: "Interfaccia pensata per chi lavora con le mani, non per informatici. Nessun corso necessario.",
  },
  {
    icon: Clock,
    title: "Risparmia tempo",
    text: "Smetti di riscrivere gli stessi dati a mano. Clienti e voci di lavoro riutilizzabili in ogni preventivo.",
  },
  {
    icon: BarChart3,
    title: "Tutto sotto controllo",
    text: "Vedi lo stato di ogni preventivo: bozza, inviato, accettato o rifiutato. Zero sorprese.",
  },
];

const steps = [
  { n: "1", title: "Registrati", text: "Crea il tuo account in 30 secondi. Nessuna installazione richiesta." },
  { n: "2", title: "Configura il profilo", text: "Inserisci nome azienda, P.IVA, indirizzo e recapiti. Appariranno su ogni preventivo." },
  { n: "3", title: "Aggiungi clienti", text: "Inserisci i tuoi clienti con tutti i dati. Bastano pochi secondi per ogni anagrafica." },
  { n: "4", title: "Crea preventivi", text: "Scegli il cliente, aggiungi le voci di lavoro, applica l'IVA. Il preventivo è pronto." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent grid place-items-center shadow-glow">
              <Wrench className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">ArtigianoAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#funzionalita" className="hover:text-foreground transition-colors">Funzionalità</a>
            <a href="#come-funziona" className="hover:text-foreground transition-colors">Come funziona</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Accedi</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow">
              <Link to="/signup">Registrati</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.74 0.16 60 / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.40 0.12 255 / 0.6), transparent 50%)" }}
        />
        <div className="container mx-auto px-4 py-20 md:py-36 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Backoffice intelligente per artigiani italiani</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Meno carta,<br />più <span className="text-accent">cantiere</span>.
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
              Clienti, preventivi e fornitori sempre in ordine. ArtigianoAI è il gestionale pensato per chi lavora con le mani: elettricisti, idraulici, imprese edili, installatori.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base h-14 px-8">
                <Link to="/signup">
                  Registrati <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-base h-14 px-8">
                <Link to="/login">Accedi</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <div className="bg-muted/50 border-y border-border py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {[
              { icon: Building2, text: "Ideale per imprese edili" },
              { icon: Zap, text: "Perfetto per elettricisti" },
              { icon: Wrench, text: "Usato da idraulici e installatori" },
              { icon: Star, text: "Fatto in Italia" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="funzionalita" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-4 text-xs uppercase tracking-wide">Funzionalità</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tutto quello che ti serve, niente di superfluo</h2>
          <p className="text-muted-foreground text-lg">Un gestionale completo, costruito su misura per il lavoro dell'artigiano.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="group p-6 rounded-2xl border border-border bg-card hover:shadow-elegant transition-smooth hover:-translate-y-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-accent grid place-items-center mb-4 shadow-glow">
                <f.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="come-funziona" className="bg-muted/30 border-y border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4 text-xs uppercase tracking-wide">Come funziona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Operativo in meno di 5 minuti</h2>
            <p className="text-muted-foreground text-lg">Nessun manuale, nessuna formazione. Inizia subito.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-accent grid place-items-center shadow-glow mb-4 text-accent-foreground font-bold text-lg">
                  {s.n}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-hero text-primary-foreground p-10 md:p-16 text-center shadow-elegant relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 30% 30%, oklch(0.74 0.16 60 / 0.5), transparent 50%)" }}
          />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto a lavorare meglio?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Inizia subito a gestire clienti e preventivi in modo professionale.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-14 px-10 text-base font-semibold">
                <Link to="/signup">Registrati <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-base h-14 px-8">
                <Link to="/login">Accedi</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ArtigianoAI — Fatto con cura in Italia
      </footer>

    </div>
  );
}
