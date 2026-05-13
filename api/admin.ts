import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
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
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (req.method === "GET") {
    return res.json({ isAdmin: !!isAdmin });
  }

  if (req.method === "POST") {
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
    const { email, redirectTo } = req.body ?? {};
    if (!email || !redirectTo) return res.status(400).json({ error: "Missing email or redirectTo" });
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) return res.json({ ok: false, error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
