import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, Users, FileText, Sparkles, ShieldCheck, Clock, ArrowRight,
  CheckCircle2, Building2, Zap, Star, ChevronDown, Phone, Mail,
  Package, BarChart3, Printer,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArtigianoAI — Il backoffice intelligente per artigiani italiani" },
      { name: "description", content: "Gestisci clienti, preventivi e fornitori in pochi tap. 1 mese gratis, poi 19,90€/mese. Pensato per elettricisti, idraulici, imprese edili e installatori." },
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
  { n: "1", title: "Registrati gratis", text: "Crea il tuo account in 30 secondi. Nessuna carta di credito richiesta per il mese di prova." },
  { n: "2", title: "Configura il profilo", text: "Inserisci nome azienda, P.IVA, indirizzo e recapiti. Appariranno automaticamente su ogni preventivo." },
  { n: "3", title: "Aggiungi clienti", text: "Inserisci i tuoi clienti con tutti i dati. Bastano pochi secondi per ogni anagrafica." },
  { n: "4", title: "Crea preventivi", text: "Scegli il cliente, aggiungi le voci di lavoro, applica l'IVA. Il preventivo è pronto." },
];

const faqs = [
  {
    q: "Come funziona il mese gratuito?",
    a: "Registri il tuo account e usi ArtigianoAI gratuitamente per 30 giorni completi, senza inserire alcun metodo di pagamento. Al termine del periodo di prova, scegli se continuare a €19,90/mese.",
  },
  {
    q: "Posso cancellare quando voglio?",
    a: "Sì, puoi cancellare l'abbonamento in qualsiasi momento, senza penali o vincoli. I tuoi dati rimangono disponibili fino alla scadenza del periodo pagato.",
  },
  {
    q: "Funziona da smartphone?",
    a: "Sì, ArtigianoAI è completamente responsive e funziona su qualsiasi dispositivo: smartphone, tablet o PC.",
  },
  {
    q: "Posso aggiungere altri utenti alla mia azienda?",
    a: "Sì. Come admin puoi invitare collaboratori e gestire i loro accessi in qualsiasi momento.",
  },
  {
    q: "I miei dati sono al sicuro?",
    a: "I dati sono ospitati su infrastruttura cloud europea (Supabase/AWS) con backup automatici, crittografia e accesso protetto.",
  },
  {
    q: "Serve installare qualcosa?",
    a: "No. ArtigianoAI è un'applicazione web: si apre dal browser come qualsiasi sito, da qualsiasi dispositivo.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-foreground/80 transition-colors"
      >
        <span className="font-medium text-foreground">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-muted-foreground pb-5 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

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
            <a href="#prezzi" className="hover:text-foreground transition-colors">Prezzi</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Accedi</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow">
              <Link to="/signup">Prova gratis</Link>
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
            <p className="text-lg md:text-xl text-white/80 mb-4 max-w-2xl">
              Clienti, preventivi e fornitori sempre in ordine. ArtigianoAI è il gestionale pensato per chi lavora con le mani: elettricisti, idraulici, imprese edili, installatori.
            </p>
            <p className="text-white/60 mb-8 text-base">
              Nessun corso. Nessuna installazione. Apri dal browser e parti.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base h-14 px-8">
                <Link to="/signup">
                  Inizia 1 mese gratis <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-base h-14 px-8">
                <a href="#come-funziona">Scopri come funziona</a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
              {["1 mese gratis", "Nessuna carta di credito", "Disdici quando vuoi"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> {t}
                </span>
              ))}
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
              <div key={s.n} className="relative">
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

      {/* ── PRICING ── */}
      <section id="prezzi" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-4 text-xs uppercase tracking-wide">Prezzi</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Un prezzo semplice, tutto incluso</h2>
          <p className="text-muted-foreground text-lg">Nessun costo nascosto. Nessun modulo a pagamento.</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative rounded-3xl border-2 border-accent bg-card p-8 shadow-elegant">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-accent text-accent-foreground shadow-glow px-4 py-1 text-sm font-semibold">
                1 mese gratis
              </Badge>
            </div>

            <div className="text-center mb-8 pt-2">
              <p className="text-muted-foreground text-sm mb-1">Poi solo</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-6xl font-bold text-foreground">19,90</span>
                <span className="text-2xl font-semibold text-muted-foreground mb-2">€</span>
              </div>
              <p className="text-muted-foreground text-sm">al mese · IVA esclusa</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Clienti illimitati",
                "Preventivi illimitati",
                "Gestione fornitori",
                "Stampa e PDF preventivi",
                "Intestazione personalizzata con i tuoi dati azienda",
                "Accesso da qualsiasi dispositivo",
                "Assistenza via email",
                "Aggiornamenti inclusi",
                "Dati sicuri sul cloud",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="w-full h-13 bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow text-base font-semibold">
              <Link to="/signup">
                Inizia il mese gratuito <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Nessuna carta di credito richiesta · Disdici quando vuoi
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-muted/30 border-y border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4 text-xs uppercase tracking-wide">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Domande frequenti</h2>
          </div>
          <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border px-6">
            {faqs.map((f) => <FaqItem key={f.q} {...f} />)}
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
            <p className="text-white/80 text-lg mb-2 max-w-xl mx-auto">
              Prova ArtigianoAI gratis per 30 giorni. Nessun impegno, nessuna carta di credito.
            </p>
            <p className="text-white/60 mb-8 text-sm">Poi solo €19,90/mese. Tutto incluso.</p>
            <Button asChild size="lg" className="bg-gradient-accent text-accent-foreground hover:opacity-90 shadow-glow h-14 px-10 text-base font-semibold">
              <Link to="/signup">Inizia gratis <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-accent grid place-items-center shadow-glow">
                <Wrench className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-bold text-foreground">ArtigianoAI</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#funzionalita" className="hover:text-foreground transition-colors">Funzionalità</a>
              <a href="#prezzi" className="hover:text-foreground transition-colors">Prezzi</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link to="/login" className="hover:text-foreground transition-colors">Accedi</Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> info@artigianoai.it</span>
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> +39 02 0000000</span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ArtigianoAI — Fatto con cura in Italia
          </div>
        </div>
      </footer>

    </div>
  );
}
