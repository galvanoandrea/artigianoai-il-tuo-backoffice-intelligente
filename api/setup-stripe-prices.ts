import Stripe from "stripe";

// Temporary one-off setup endpoint — creates the founding-member pricing Price objects
// and registers checkout.session.expired on the existing webhook. Removed after use.
// redeploy-trigger: pick up STRIPE_SECRET_KEY now configured in Vercel
const SETUP_TOKEN = "ab548645709594b0dd5f65a8929b24a3534d5c0407ed18ef";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const token = req.headers["x-setup-token"] || req.query?.token;
  if (token !== SETUP_TOKEN) return res.status(401).json({ error: "Unauthorized" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY non configurata" });
  const stripe = new Stripe(stripeKey);

  try {
    const product = await stripe.products.create({ name: "ArtigianoAI Abbonamento" });

    const [monthly, yearly, foundingMonthly, foundingYearly] = await Promise.all([
      stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: 1500,
        recurring: { interval: "month" },
        nickname: "Standard mensile",
      }),
      stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: 15000,
        recurring: { interval: "year" },
        nickname: "Standard annuale",
      }),
      stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: 1500,
        recurring: { interval: "month" },
        nickname: "Founding member mensile",
      }),
      stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: 15000,
        recurring: { interval: "year" },
        nickname: "Founding member annuale",
      }),
    ]);

    // Try to add checkout.session.expired to the existing webhook endpoint(s), without dropping current events.
    const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
    const updated: string[] = [];
    for (const wh of webhooks.data) {
      if (!wh.url.includes("/api/stripe-webhook")) continue;
      const events = new Set(wh.enabled_events as string[]);
      if (!events.has("*") && !events.has("checkout.session.expired")) {
        events.add("checkout.session.expired");
        await stripe.webhookEndpoints.update(wh.id, { enabled_events: Array.from(events) as any });
        updated.push(wh.id);
      }
    }

    return res.json({
      productId: product.id,
      STRIPE_PRICE_MONTHLY: monthly.id,
      STRIPE_PRICE_YEARLY: yearly.id,
      STRIPE_PRICE_FOUNDING_MONTHLY: foundingMonthly.id,
      STRIPE_PRICE_FOUNDING_YEARLY: foundingYearly.id,
      webhooksUpdated: updated,
      webhooksFound: webhooks.data.map((w) => ({ id: w.id, url: w.url, events: w.enabled_events })),
    });
  } catch (err: any) {
    console.error("[setup-stripe-prices] error", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
