import { useEffect, useRef, useState } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import { Mic, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type AIQuoteResult = {
  titolo: string;
  descrizione: string;
  voci: Array<{
    descrizione: string;
    quantita: number;
    unita: string;
    prezzo_unitario: number;
  }>;
};

type RecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): { new (): RecognitionInstance } | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function AIQuoteGenerator({
  onGenerated,
}: {
  onGenerated: (data: AIQuoteResult) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recRef = useRef<RecognitionInstance | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognitionCtor());
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const startListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = text ? text.trim() + " " : "";

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      const combined = (baseTextRef.current + final + interim).replace(/\s+/g, " ").trim();
      setText(combined);
      if (final) baseTextRef.current += final;
    };

    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Permesso microfono negato");
      }
      setListening(false);
    };

    rec.onend = () => setListening(false);

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (loading) return;
    startListening();
  };

  const handlePointerUp = () => {
    if (listening) stopListening();
  };

  const handleGenerate = async () => {
    const descrizione = text.trim();
    if (!descrizione) {
      toast.error("Descrivi il lavoro prima di generare");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Sessione scaduta, accedi di nuovo");
        return;
      }
      const resp = await fetch("/api/generate-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ descrizione }),
      });
      const raw = await resp.text();
      let result: any = null;
      try { result = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }
      if (!resp.ok) {
        const detail = result?.error || result?.detail || raw?.slice(0, 300) || "nessun dettaglio";
        const msg = `Errore ${resp.status}: ${detail}`;
        console.error("[AIQuoteGenerator] server error", resp.status, raw);
        toast.error(msg, { duration: 10000 });
        return;
      }
      if (!result) {
        toast.error("Risposta non valida dal server", { duration: 10000 });
        return;
      }
      onGenerated(result as AIQuoteResult);
      toast.success("Preventivo generato con successo! Puoi modificare i valori prima di salvare.");
    } catch (err: any) {
      console.error("[AIQuoteGenerator]", err);
      toast.error(`Errore di rete: ${authErrorMessage(err, String(err))}`, { duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-gradient-to-br from-accent/5 via-background to-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-base">Genera con AI</h3>
      </div>

      {speechSupported ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            disabled={loading}
            className={[
              "relative h-24 w-24 rounded-full flex items-center justify-center",
              "transition-all select-none touch-none",
              "shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
              listening
                ? "bg-red-500 text-white scale-105 animate-pulse"
                : "bg-accent text-accent-foreground hover:scale-105",
            ].join(" ")}
            aria-label="Tieni premuto per parlare"
          >
            <Mic className="h-10 w-10" />
          </button>
          <span className="text-sm text-muted-foreground">
            {listening ? "Sto ascoltando..." : "Tieni premuto per parlare"}
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
          Il tuo browser non supporta la registrazione vocale, usa la scrittura.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ai-description">
          {speechSupported ? "Oppure scrivi la descrizione del lavoro" : "Descrizione del lavoro"}
        </Label>
        <Textarea
          id="ai-description"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Es. Sostituzione completa di 5 mq di pavimento in laminato in soggiorno..."
          disabled={loading}
        />
      </div>

      <Button
        type="button"
        onClick={handleGenerate}
        disabled={loading || listening}
        className="w-full bg-gradient-accent text-accent-foreground hover:opacity-90"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sto analizzando il lavoro...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Genera preventivo con AI
          </>
        )}
      </Button>
    </div>
  );
}
