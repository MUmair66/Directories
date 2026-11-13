import { Suspense } from "react";
import { MessageSquareQuote, Trash2 } from "lucide-react";
import { listTestimonials, requireStaff } from "@/lib/data/admin";
import { deleteTestimonial } from "@/app/actions/admin/content";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { TestimonialDialog } from "@/components/admin/content-dialogs";
import { StatusBadge } from "@/components/admin/toolbar";
import { Stars } from "@/components/listing/stars";

export const metadata = { title: "Testimonials" };

export default function TestimonialsAdminPage() {
  return (
    <>
      <PageHeader
        title="Testimonials"
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "Testimonials" }]}
        action={<TestimonialDialog />}
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireStaff();
  const items = await listTestimonials();
  if (!items.length) {
    return <EmptyState icon={<MessageSquareQuote />} title="No testimonials yet" description="Add quotes from happy owners and customers." action={<TestimonialDialog />} />;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((t) => (
        <li key={t.id}>
          <Card className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              {t.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photoUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">{t.name.slice(0, 1)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.name}</p>
                {t.business && <p className="text-xs text-muted-foreground">{t.business}</p>}
              </div>
              <StatusBadge status={t.published ? "published" : "hidden"} />
            </div>
            <Stars rating={t.rating} size={14} />
            <blockquote className="flex-1 text-sm text-muted-foreground">“{t.quote}”</blockquote>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Order {t.sortOrder}</span>
              <div className="flex gap-1">
                <TestimonialDialog item={{ ...t, business: t.business ?? "", photoUrl: t.photoUrl ?? "" }} />
                <ActionButton size="icon-sm" variant="ghost" action={deleteTestimonial} input={{ id: t.id }} confirm={{ title: "Delete testimonial?", description: `The quote from ${t.name} is removed permanently.`, confirmLabel: "Delete" }} aria-label={`Delete testimonial from ${t.name}`}>
                  <Trash2 className="text-danger" aria-hidden />
                </ActionButton>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
