import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bqwyevchiblvxmosvabl.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd3lldmNoaWJsdnhtb3N2YWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDU5MTAsImV4cCI6MjA5NDAyMTkxMH0.fvL0BNrDgMVZjjDdEVszIk_58-APCbkQzpj9N52E-80";

async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

const SYSTEM_PROMPT = `Sei un artigiano italiano esperto con decenni di esperienza nel mercato italiano.
Conosci i prezzi di mercato aggiornati di materiali, manodopera e servizi in Italia.
Quando ricevi la descrizione di un lavoro, generi un preventivo professionale realistico.

Rispondi SEMPRE e SOLO con un oggetto JSON valido in questo formato esatto, senza testo aggiuntivo, senza markdown, senza spiegazioni:

{
  "titolo": "Titolo professionale del lavoro (breve, 5-10 parole)",
  "descrizione": "Descrizione dettagliata adatta a un documento formale, 2-4 frasi",
  "voci": [
    {
      "descrizione": "Descrizione voce di lavoro",
      "quantita": 1,
      "unita": "cad",
      "prezzo_unitario": 0
    }
  ]
}

Regole:
- Da 3 a 8 voci di lavoro
- Unità ammesse: "cad", "h", "mq", "ml", "kg", "gg", "a corpo"
- Prezzi unitari in EUR realistici per il mercato italiano attuale
- Le voci devono coprire materiali, manodopera ed eventuali servizi accessori
- Non includere IVA nelle voci (sarà calcolata a parte)
- Nessuna proprietà extra oltre a quelle indicate`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Auth fallita (token Supabase non valido)" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY non configurata su Vercel" });

  const descrizione: string = (req.body?.descrizione ?? "").toString().trim();
  if (!descrizione) {
    return res.status(400).json({ error: "Descrivi il lavoro prima di generare" });
  }

  try {
    const candidates = process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-flash-latest",
          "gemini-2.0-flash-001",
          "gemini-1.5-flash-latest",
          "gemini-pro-latest",
        ];
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: descrizione }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    };

    let resp: Response | null = null;
    let lastErr = "";
    let usedModel = "";
    for (const m of candidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        resp = r;
        usedModel = m;
        break;
      }
      if (r.status !== 404) {
        resp = r;
        usedModel = m;
        break;
      }
      lastErr = (await r.text()).slice(0, 200);
    }

    if (!resp || !resp.ok) {
      const status = resp?.status ?? 404;
      let detail = resp ? (await resp.text()).slice(0, 500) : lastErr;
      if (status === 404) {
        try {
          const listResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          );
          if (listResp.ok) {
            const list: any = await listResp.json();
            const names = (list?.models ?? [])
              .filter((mm: any) => mm?.supportedGenerationMethods?.includes("generateContent"))
              .map((mm: any) => mm?.name?.replace(/^models\//, ""))
              .filter(Boolean)
              .slice(0, 20)
              .join(", ");
            detail = `Nessun modello tra [${candidates.join(", ")}] disponibile. Disponibili sulla tua key: ${names || "(nessuno)"}`;
          }
        } catch { /* noop */ }
      }
      console.error("[generate-quote] Gemini error", status, detail);
      return res.status(502).json({
        error: `Gemini ha risposto ${status}`,
        detail,
      });
    }

    console.log("[generate-quote] Using model", usedModel);
    const data: any = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      const promptFeedback = data?.promptFeedback;
      console.error("[generate-quote] Empty Gemini response", JSON.stringify(data).slice(0, 500));
      return res.status(502).json({
        error: "Gemini ha restituito risposta vuota",
        detail: `finishReason=${finishReason} promptFeedback=${JSON.stringify(promptFeedback)}`,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch {
      console.error("[generate-quote] JSON parse failed", text);
      return res.status(502).json({
        error: "JSON Gemini non valido",
        detail: text.slice(0, 300),
      });
    }

    if (
      !parsed ||
      typeof parsed.titolo !== "string" ||
      typeof parsed.descrizione !== "string" ||
      !Array.isArray(parsed.voci) ||
      parsed.voci.length === 0
    ) {
      return res.status(502).json({
        error: "Risposta Gemini con struttura inattesa",
        detail: JSON.stringify(parsed).slice(0, 300),
      });
    }

    const voci = parsed.voci.slice(0, 8).map((v: any) => ({
      descrizione: String(v?.descrizione ?? "").trim(),
      quantita: Number(v?.quantita) || 1,
      unita: String(v?.unita ?? "cad").trim() || "cad",
      prezzo_unitario: Number(v?.prezzo_unitario) || 0,
    }));

    return res.json({
      titolo: String(parsed.titolo).trim(),
      descrizione: String(parsed.descrizione).trim(),
      voci,
    });
  } catch (err: any) {
    console.error("[generate-quote] unexpected", err);
    return res.status(500).json({
      error: "Errore imprevisto",
      detail: err?.message || String(err),
    });
  }
}
