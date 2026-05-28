import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gitmclidlmwhmhgdsodl.supabase.co";

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyAdmin(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  const admin = getAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return false;
  const { data } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return !!data;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const isAdmin = await verifyAdmin(req.headers.authorization);
  if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

  const targetUserId = req.query?.userId as string;
  if (!targetUserId) return res.status(400).json({ error: "Missing userId" });

  const admin = getAdminClient();

  const [profileRes, clientsRes, quotesRes, fattureRes] = await Promise.all([
    admin.from("profiles").select("nome_completo, nome_azienda, partita_iva, telefono, email_azienda, citta").eq("id", targetUserId).maybeSingle(),
    admin.from("clients").select("id, stato").eq("user_id", targetUserId),
    admin.from("quotes").select("id, stato, voci, iva_percentuale").eq("user_id", targetUserId),
    admin.from("fatture").select("id, stato, voci, iva_percentuale").eq("user_id", targetUserId),
  ]);

  const profile = profileRes.data ?? {};

  const clientCount = (clientsRes.data ?? []).length;
  const activeClients = (clientsRes.data ?? []).filter((c: any) => c.stato !== "inattivo").length;

  const quotes = quotesRes.data ?? [];
  const quotesByStatus = { bozza: 0, inviato: 0, accettato: 0, rifiutato: 0 };
  let quoteTotalAccettati = 0;
  for (const q of quotes as any[]) {
    if (q.stato in quotesByStatus) quotesByStatus[q.stato as keyof typeof quotesByStatus]++;
    if (q.stato === "accettato") {
      const voci = (q.voci ?? []) as any[];
      const sub = voci.reduce((s: number, v: any) => s + (Number(v.quantita) || 0) * (Number(v.prezzo_unitario ?? v.prezzoUnitario) || 0), 0);
      const iva = typeof q.iva_percentuale === "string" ? parseFloat(q.iva_percentuale) : (q.iva_percentuale ?? 22);
      quoteTotalAccettati += sub * (1 + iva / 100);
    }
  }

  const fatture = fattureRes.data ?? [];
  const fattureByStatus = { bozza: 0, inviata: 0, pagata: 0, scaduta: 0 };
  let fatturatoTotale = 0;
  let fatturatoIncassato = 0;
  for (const f of fatture as any[]) {
    const stato = f.stato as keyof typeof fattureByStatus;
    if (stato in fattureByStatus) fattureByStatus[stato]++;
    const voci = (f.voci ?? []) as any[];
    const sub = voci.reduce((s: number, v: any) => s + (Number(v.quantita) || 0) * (Number(v.prezzo_unitario ?? v.prezzoUnitario) || 0), 0);
    const iva = typeof f.iva_percentuale === "string" ? parseFloat(f.iva_percentuale) : (f.iva_percentuale ?? 22);
    const totale = sub * (1 + iva / 100);
    if (f.stato !== "bozza") fatturatoTotale += totale;
    if (f.stato === "pagata") fatturatoIncassato += totale;
  }

  return res.json({
    profile,
    clients: { total: clientCount, active: activeClients },
    quotes: { byStatus: quotesByStatus, totalAccettati: quoteTotalAccettati },
    fatture: { byStatus: fattureByStatus, fatturatoTotale, fatturatoIncassato },
  });
}
