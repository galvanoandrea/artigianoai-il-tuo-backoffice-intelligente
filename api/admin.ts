import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gitmclidlmwhmhgdsodl.supabase.co";

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata su Vercel");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export default async function handler(req: any, res: any) {
  const userId = await getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const admin = getAdminClient();
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });

  // GET — verifica ruolo + lista utenti
  if (req.method === "GET") {
    if (!isAdmin) return res.json({ isAdmin: false });
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) return res.json({ isAdmin: true, users: [] });
    const { data: profs } = await admin.from("profiles").select("id, approved");
    const approvedMap = new Map((profs ?? []).map((p) => [p.id, p.approved]));
    const users = (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      banned_until: u.banned_until ?? null,
      approved: approvedMap.get(u.id) ?? false,
    }));
    return res.json({ isAdmin: true, users });
  }

  if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

  // POST — invita utente
  if (req.method === "POST") {
    const { email, redirectTo } = req.body ?? {};
    if (!email || !redirectTo) return res.status(400).json({ error: "Missing email or redirectTo" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email" });
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) return res.json({ ok: false, error: error.message });
    return res.json({ ok: true });
  }

  // PATCH — blocca / sblocca / approva / rifiuta utente
  if (req.method === "PATCH") {
    const { targetUserId, action } = req.body ?? {};
    if (!targetUserId || !action) return res.status(400).json({ error: "Missing targetUserId or action" });
    if (targetUserId === userId) return res.status(400).json({ error: "Non puoi modificare te stesso" });

    if (action === "approve" || action === "reject") {
      const { error } = await admin
        .from("profiles")
        .update({ approved: action === "approve" })
        .eq("id", targetUserId);
      if (error) return res.json({ ok: false, error: error.message });
      return res.json({ ok: true });
    }

    const ban_duration = action === "ban" ? "876000h" : "none";
    const { error } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration });
    if (error) return res.json({ ok: false, error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
