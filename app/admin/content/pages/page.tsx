import Link from "next/link";
import { Suspense } from "react";
import { FileText, Pencil } from "lucide-react";
import { listPages, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { fmtDate } from "@/components/admin/toolbar";

export const metadata = { title: "Legal pages" };

export default function LegalPagesAdmin() {
  return (
    <>
      <PageHeader title="Terms & Privacy" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "Pages" }]} />
      <Suspense fallback={<Skeleton className="h-48 rounded-lg" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireStaff();
  const pages = await listPages();
  if (!pages.length) return <EmptyState icon={<FileText />} title="No pages yet" description="Run the seed script to create the Terms and Privacy pages." />;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {pages.map((p) => (
        <li key={p.id}>
          <Card className="flex items-center gap-4 p-5">
            <FileText className="size-6 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                /{p.slug} · updated {fmtDate(p.updatedAt)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/content/pages/${p.id}`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
