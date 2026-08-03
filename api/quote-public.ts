import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gitmclidlmwhmhgdsodl.supabase.co";

// Il cliente che apre il link non ha un account: qui si passa dal service role,
// quindi ogni campo restituito va scelto a mano. Non escono mai user_id, note
// interne dell'artigiano o altri preventivi.
function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata su Vercel");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

function publicView(q: any, cliente: any, profilo: any) {
  return {
    numero: q.numero,
    data: q.data,
    titolo: q.titolo,
    descrizione: q.descrizione,
    voci: Array.isArray(q.voci) ? q.voci : [],
    note: q.note,
    ivaPercentuale: Number(q.iva_percentuale) || 0,
    stato: q.stato,
    rispostoIl: q.responded_at ?? null,
    cliente: cliente
      ? { ragioneSociale: cliente.ragione_sociale ?? "", referente: cliente.referente ?? "" }
      : null,
    azienda: profilo
      ? {
          nome: profilo.nome_azienda ?? "",
          email: profilo.email_azienda ?? "",
          telefono: profilo.telefono ?? "",
          partitaIva: profilo.partita_iva ?? "",
          indirizzo: profilo.indirizzo ?? "",
          cap: profilo.cap ?? "",
          citta: profilo.citta ?? "",
          provincia: profilo.provincia ?? "",
        }
      : null,
  };
}

export default async function handler(req: any, res: any) {
  const token = String(req.method === "GET" ? (req.query?.token ?? "") : (req.body?.token ?? ""));
  if (!TOKEN_RE.test(token)) {
    return res.status(400).json({ error: "Link non valido." });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (e: any) {
    console.error("[quote-public]", e?.message);
    return res.status(500).json({ error: "Servizio non disponibile." });
  }

  const { data: quote, error } = await admin
    .from("quotes")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (error) {
    console.error("[quote-public] lookup", error.message);
    return res.status(500).json({ error: "Servizio non disponibile." });
  }
  // Stessa risposta per token inesistente e preventivo non ancora inviato: chi
  // prova link a caso non deve poter distinguere i due casi.
  if (!quote || quote.stato === "bozza") {
    return res.status(404).json({ error: "Questo preventivo non è più disponibile." });
  }

  if (req.method === "GET") {
    const [{ data: cliente }, { data: profilo }] = await Promise.all([
      quote.cliente_id
        ? admin
            .from("clients")
            .select("ragione_sociale, referente")
            .eq("id", quote.cliente_id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      admin
        .from("profiles")
        .select(
          "nome_azienda, email_azienda, telefono, partita_iva, indirizzo, cap, citta, provincia",
        )
        .eq("id", quote.user_id)
        .maybeSingle(),
    ]);
    return res.json(publicView(quote, cliente, profilo));
  }

  if (req.method === "POST") {
    const azione = String(req.body?.azione ?? "");
    if (azione !== "accetta" && azione !== "rifiuta") {
      return res.status(400).json({ error: "Azione non valida." });
    }
    // Una volta risposto il preventivo si blocca: se il cliente riapre il link
    // vede la sua risposta, non un modo per cambiarla.
    if (quote.stato !== "inviato") {
      return res.status(409).json({
        error: "Hai già risposto a questo preventivo.",
        stato: quote.stato,
      });
    }

    const nome = String(req.body?.nome ?? "").trim().slice(0, 120);
    const { error: upErr } = await admin
      .from("quotes")
      .update({
        stato: azione === "accetta" ? "accettato" : "rifiutato",
        responded_at: new Date().toISOString(),
        responded_by: nome || null,
      })
      .eq("id", quote.id)
      .eq("stato", "inviato"); // difesa contro due clic in contemporanea

    if (upErr) {
      console.error("[quote-public] update", upErr.message);
      return res.status(500).json({ error: "Non è stato possibile registrare la risposta." });
    }
    return res.json({ ok: true, stato: azione === "accetta" ? "accettato" : "rifiutato" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Metodo non consentito." });
}
