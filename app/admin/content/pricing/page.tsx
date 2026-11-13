import { Suspense } from "react";
import { BadgeDollarSign, Check, Trash2 } from "lucide-react";
import { listPricingPlans, requireStaff } from "@/lib/data/admin";
import { deletePricingPlan } from "@/app/actions/admin/content";
import { PageHeader } from "@/components/shell/app-shell";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { PricingPlanDialog } from "@/components/admin/content-dialogs";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pricing plans" };

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });

export default function PricingAdminPage() {
  return (
    <>
      <PageHeader title="Pricing plans" description="Plan CTAs open a lead form; leads appear in the Inbox." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "Pricing" }]} action={<PricingPlanDialog />} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireStaff();
  const plans = await listPricingPlans();
  if (!plans.length) return <EmptyState icon={<BadgeDollarSign />} title="No plans yet" description="Add up to three plans for the pricing page." action={<PricingPlanDialog />} />;
  return (
    <ul className="grid gap-4 lg:grid-cols-3">
      {plans.map((p) => {
        const save = p.monthlyPrice > 0 ? Math.round((1 - p.yearlyPrice / (p.monthlyPrice * 12)) * 100) : 0;
        return (
          <li key={p.id}>
            <Card className={cn("flex h-full flex-col gap-3 p-5", p.highlighted && "border-primary ring-2 ring-primary/20")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{p.name}</p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </div>
                {p.highlighted && <Badge tone="primary">Highlighted</Badge>}
              </div>
              <p>
                <span className="font-heading text-2xl font-bold">{usd(p.monthlyPrice)}</span>
                <span className="text-sm text-muted-foreground">/mo · {usd(p.yearlyPrice)}/yr</span>
                {save > 0 && <span className="ml-2 text-xs font-semibold text-success">Save {save}%</span>}
              </p>
              <ul className="grid flex-1 gap-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-success" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  CTA: “{p.ctaLabel}” · order {p.sortOrder}
                </span>
                <div className="flex gap-1">
                  <PricingPlanDialog plan={{ ...p, description: p.description ?? "", stripePriceMonthly: p.stripePriceMonthly ?? "", stripePriceYearly: p.stripePriceYearly ?? "" }} />
                  <ActionButton size="icon-sm" variant="ghost" action={deletePricingPlan} input={{ id: p.id }} confirm={{ title: `Delete ${p.name}?`, description: "The plan is removed from the pricing page.", confirmLabel: "Delete" }} aria-label={`Delete ${p.name}`}>
                    <Trash2 className="text-danger" aria-hidden />
                  </ActionButton>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
