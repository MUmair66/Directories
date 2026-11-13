import Link from "next/link";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { listParams, listUsers, requireAdmin, type RawSP } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { FilterTabs, SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { BanControls, ImpersonateButton, RoleSelect } from "@/components/admin/user-actions";

export const metadata = { title: "Users" };
type Props = { searchParams: Promise<RawSP> };
type Row = Awaited<ReturnType<typeof listUsers>>["rows"][number];

export default function AdminUsersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Users" description="Manage roles, bans and support impersonation." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <UserList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UserList({ searchParams }: Props) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total } = await listUsers(p);
  const columns: Column<Row>[] = [
    {
      key: "user",
      label: "User",
      cell: (u) => (
        <div>
          <p className="font-semibold">{u.name}</p>
          <p className="text-xs text-muted-foreground">
            {u.email}
            {u.username ? ` · @${u.username}` : ""}
          </p>
          {!u.emailVerified && <p className="text-xs text-amber-700 dark:text-amber-300">Email not verified</p>}
        </div>
      ),
    },
    { key: "role", label: "Role", cell: (u) => <RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} /> },
    {
      key: "status",
      label: "Status",
      cell: (u) => (u.banned ? <div><StatusBadge status="suspended" />{u.banReason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{u.banReason}</p>}</div> : <StatusBadge status="approved" />),
    },
    { key: "businesses", label: "Listings", className: "text-right", cell: (u) => <span className="tabular-nums">{u.businesses}</span> },
    { key: "joined", label: "Joined", cell: (u) => <span className="whitespace-nowrap text-xs">{fmtDate(u.createdAt)}</span> },
    { key: "login", label: "Last login", cell: (u) => <span className="whitespace-nowrap text-xs">{fmtDate(u.lastLoginAt, true)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <FilterTabs
          basePath="/admin/users"
          sp={sp}
          param="filter"
          value={p.filter}
          options={[
            { value: undefined, label: "All" },
            { value: "admin", label: "Admins" },
            { value: "editor", label: "Editors" },
            { value: "owner", label: "Owners" },
            { value: "user", label: "Users" },
            { value: "banned", label: "Banned" },
          ]}
        />
        <SearchForm basePath="/admin/users" sp={sp} placeholder="Search name, email or username" keep={["filter"]} />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/users"
        sp={sp}
        total={total}
        page={p.page}
        actions={(u) =>
          u.id === me.id ? (
            <span className="text-xs text-muted-foreground">You</span>
          ) : (
            <>
              <ImpersonateButton userId={u.id} name={u.name} />
              <BanControls userId={u.id} name={u.name} banned={!!u.banned} />
            </>
          )
        }
        empty={
          <EmptyState
            icon={<Users />}
            title="No users found"
            description="Try a different search or filter."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/users">Clear filters</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
