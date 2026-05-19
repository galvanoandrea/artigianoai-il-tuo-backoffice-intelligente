import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userEmail, userName, userAzienda } = req.body ?? {};
  if (!userEmail) return res.status(400).json({ error: "Missing userEmail" });

  const smtpUser = process.env.GMAIL_USER;
  const smtpPass = process.env.GMAIL_APP_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL ?? "andreagalva@hotmail.it";

  if (!smtpUser || !smtpPass) {
    // Log but don't fail hard — registration already succeeded
    console.warn("GMAIL_USER or GMAIL_APP_PASSWORD not set, skip email notification");
    return res.json({ ok: true, skipped: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpPass },
    });

    const displayName = [userName, userAzienda].filter(Boolean).join(" — ") || userEmail;

    await transporter.sendMail({
      from: `"ArtigianoAI" <${smtpUser}>`,
      to: adminEmail,
      subject: "🔔 Nuova registrazione in attesa di approvazione",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Nuova registrazione</h2>
          <p style="color: #555; margin-bottom: 24px;">Un nuovo utente si è registrato su ArtigianoAI e sta aspettando la tua approvazione.</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; color: #333;"><strong>Email:</strong> ${userEmail}</p>
            ${userName ? `<p style="margin: 0 0 6px; color: #333;"><strong>Nome:</strong> ${userName}</p>` : ""}
            ${userAzienda ? `<p style="margin: 0; color: #333;"><strong>Azienda:</strong> ${userAzienda}</p>` : ""}
          </div>

          <a href="${process.env.APP_URL ?? "https://artigianoai.vercel.app"}/dashboard/admin"
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Vai al pannello Admin →
          </a>

          <p style="color: #999; font-size: 12px; margin-top: 24px;">ArtigianoAI · notifica automatica</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("Email notification failed:", err.message);
    return res.json({ ok: false, error: err.message });
  }
}
