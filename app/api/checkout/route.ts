import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";

/**
 * Stripe Checkout, behind the `stripeEnabled` site setting and STRIPE_SECRET_KEY.
 * When disabled, visitors are sent back to the pricing page, which shows the lead form instead.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const planId = String(form.get("planId") ?? "");
  const billing = form.get("billing") === "yearly" ? "yearly" : "monthly";
  const key = process.env.STRIPE_SECRET_KEY;
  const { site } = await getSettings();
  if (!key || !site.stripeEnabled) return NextResponse.redirect(absoluteUrl("/pricing"), 303);

  const plan = await db.query.pricingPlans.findFirst({ where: eq(s.pricingPlans.id, planId) });
  const price = billing === "yearly" ? plan?.stripePriceYearly : plan?.stripePriceMonthly;
  if (!plan || !price) return NextResponse.redirect(absoluteUrl("/pricing"), 303);

  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: absoluteUrl("/dashboard?checkout=success"),
    cancel_url: absoluteUrl("/pricing?checkout=cancelled"),
    "metadata[planId]": plan.id,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[checkout]", res.status, await res.text());
    return NextResponse.redirect(absoluteUrl("/pricing?checkout=error"), 303);
  }
  const session = (await res.json()) as { url: string };
  return NextResponse.redirect(session.url, 303);
}
