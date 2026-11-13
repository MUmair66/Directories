import { Suspense } from "react";
import { HelpCircle, Trash2 } from "lucide-react";
import { listFaqs, requireStaff } from "@/lib/data/admin";
import { deleteFaq } from "@/app/actions/admin/content";
import { FAQ_GROUPS } from "@/app/actions/admin/schemas";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { FAQ_GROUP_LABELS, FaqDialog } from "@/components/admin/content-dialogs";

export const metadata = { title: "FAQs" };

export default function FaqsAdminPage() {
  return (
    <>
      <PageHeader title="FAQs" description="Grouped questions on the public FAQs page (with FAQPage schema)." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "FAQs" }]} action={<FaqDialog />} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireStaff();
  const faqs = await listFaqs();
  if (!faqs.length) return <EmptyState icon={<HelpCircle />} title="No FAQs yet" description="Answer the questions customers and owners ask most." action={<FaqDialog />} />;
  return (
    <div className="grid gap-6">
      {FAQ_GROUPS.map((g) => {
        const items = faqs.filter((f) => f.group === g);
        return (
          <Card key={g}>
            <CardHeader>
              <CardTitle>{FAQ_GROUP_LABELS[g]}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions in this group.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((f) => (
                    <li key={f.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{f.question}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.answer.replace(/<[^>]*>/g, " ")}</p>
                      </div>
                      <FaqDialog item={{ ...f, group: f.group as (typeof FAQ_GROUPS)[number] }} />
                      <ActionButton size="icon-sm" variant="ghost" action={deleteFaq} input={{ id: f.id }} confirm={{ title: "Delete this FAQ?", description: f.question, confirmLabel: "Delete" }} aria-label={`Delete FAQ: ${f.question}`}>
                        <Trash2 className="text-danger" aria-hidden />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
