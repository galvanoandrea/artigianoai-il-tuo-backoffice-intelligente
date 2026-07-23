import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gitmclidlmwhmhgdsodl.supabase.co";

type Interval = "month" | "year";

const PRICE_IDS: Record<Interval, { standard?: string; founding?: string }> = {
  month: {
    standard: process.env.STRIPE_PRICE_MONTHLY,
    founding: process.env.STRIPE_PRICE_FOUNDING_MONTHLY,
  },
  year: {
    standard: process.env.STRIPE_PRICE_YEARLY,
    founding: process.env.STRIPE_PRICE_FOUNDING_YEARLY,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "Stripe not configured" });

  const interval: Interval = req.body?.interval === "year" ? "year" : "month";

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, is_founding_member")
    .eq("id", user.id)
    .maybeSingle();

  let isFounding = (profile as any)?.is_founding_member === true;
  let claimedNewSlot = false;

  if (!isFounding) {
    const { data: claimed } = await supabase.rpc("claim_founding_slot");
    if (claimed === true) {
      isFounding = true;
      claimedNewSlot = true;
      await supabase
        .from("profiles")
        .update({ is_founding_member: true } as any)
        .eq("id", user.id);
    }
  }

  const priceId = isFounding ? PRICE_IDS[interval].founding : PRICE_IDS[interval].standard;
  if (!priceId) {
    if (claimedNewSlot) {
      await supabase.rpc("release_founding_slot");
      await supabase
        .from("profiles")
        .update({ is_founding_member: false } as any)
        .eq("id", user.id);
    }
    return res.status(500).json({
      error: `Prezzo non configurato per il piano ${interval === "year" ? "annuale" : "mensile"}${isFounding ? " founding member" : ""}`,
    });
  }

  const stripe = new Stripe(stripeKey);

  let customerId: string = (profile as any)?.stripe_customer_id ?? "";

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId } as any)
      .eq("id", user.id);
  }

  const origin = req.headers.origin ?? process.env.APP_URL ?? "https://artigianoai.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscribe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/impostazioni`,
      metadata: { userId: user.id, founding: isFounding ? "true" : "false", interval },
      subscription_data: {
        metadata: { userId: user.id, founding: isFounding ? "true" : "false", interval },
      },
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url, founding: isFounding });
  } catch (err: any) {
    if (claimedNewSlot) {
      await supabase.rpc("release_founding_slot");
      await supabase
        .from("profiles")
        .update({ is_founding_member: false } as any)
        .eq("id", user.id);
    }
    console.error("[create-checkout] Stripe error", err);
    return res.status(502).json({ error: "Errore nella creazione della sessione di pagamento" });
  }
}
