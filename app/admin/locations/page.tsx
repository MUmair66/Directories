import Link from "next/link";
import { Suspense } from "react";
import { MapPinned, Star, Trash2 } from "lucide-react";
import { listCitiesAdmin, listParams, listStatesAdmin, requireStaff, type RawSP } from "@/lib/data/admin";
import { deleteCity } from "@/app/actions/admin/taxonomy";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, NativeSelect, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { FilterTabs, Toolbar } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { CityDialog, StateDialog } from "@/components/admin/location-forms";

export const metadata = { title: "Locations" };
type Props = { searchParams: Promise<RawSP> };

export default function LocationsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Locations" description="States and cities: slugs, center points, intro text and SEO fields." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Locations" }]} />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <Locations searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Locations({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const tab = p.one("tab") === "states" ? "states" : "cities";
  const states = await listStatesAdmin();
  return (
    <>
      <Toolbar>
        <FilterTabs basePath="/admin/locations" sp={{}} param="tab" value={tab === "cities" ? undefined : "states"} options={[{ value: undefined, label: "Cities" }, { value: "states", label: `States (${states.length})` }]} />
        {tab === "cities" && <CityDialog states={states} />}
      </Toolbar>
      {tab === "states" ? <StatesTable states={states} /> : <CitiesTable sp={sp} states={states} />}
    </>
  );
}

type StateRow = Awaited<ReturnType<typeof listStatesAdmin>>[number];

function StatesTable({ states }: { states: StateRow[] }) {
  const columns: Column<StateRow>[] = [
    {
      key: "name",
      label: "State",
      cell: (s) => (
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">{s.code}</span>
          <div>
            <p className="font-semibold">{s.name}</p>
            <Link href={`/states/${s.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-primary">
              /states/{s.slug}
            </Link>
          </div>
          {s.featured && <Star className="size-4 fill-rating text-rating" aria-label="Featured" />}
        </div>
      ),
    },
    { key: "center", label: "Center", cell: (s) => <span className="text-xs tabular-nums">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span> },
    { key: "cities", label: "Cities", className: "text-right", cell: (s) => <span className="tabular-nums">{s.cities.toLocaleString("en-US")}</span> },
    { key: "seo", label: "SEO", cell: (s) => <span className="text-xs text-muted-foreground">{s.metaTitle ? "Custom" : "Default"}</span> },
  ];
  return (
    <AdminTable
      rows={states}
      columns={columns}
      basePath="/admin/locations"
      sp={{ tab: "states" }}
      total={states.length}
      page={1}
      title={(s) => s.name}
      actions={(s) => <StateDialog state={s} />}
      empty={<EmptyState icon={<MapPinned />} title="No states yet" description="Run the seed script to load all 50 states and D.C." />}
    />
  );
}

async function CitiesTable({ sp, states }: { sp: RawSP; states: StateRow[] }) {
  const p = listParams(sp);
  const { rows, total } = await listCitiesAdmin(p);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "City",
      cell: (c) => {
        const st = states.find((s) => s.id === c.stateId);
        return (
          <div>
            <p className="font-semibold">
              {c.name}, {c.stateCode}
            </p>
            <Link href={`/states/${st?.slug}/${c.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-primary">
              /states/{st?.slug}/{c.slug}
            </Link>
          </div>
        );
      },
    },
    { key: "population", label: "Population", className: "text-right", cell: (c) => <span className="tabular-nums">{c.population?.toLocaleString("en-US") ?? "—"}</span> },
    { key: "businesses", label: "Listings", className: "text-right", cell: (c) => <span className="tabular-nums">{c.businesses}</span> },
    { key: "center", label: "Center", cell: (c) => <span className="text-xs tabular-nums">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span> },
  ];
  const stateFilter = p.one("state") ?? "";
  return (
    <>
      <form action="/admin/locations" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="city-q" className="sr-only">
          Search cities
        </label>
        <input id="city-q" name="q" defaultValue={p.q ?? ""} placeholder="Search cities" className="h-10 rounded-md border border-input bg-card px-3 text-sm sm:w-64" />
        <label htmlFor="city-state" className="sr-only">
          State
        </label>
        <NativeSelect id="city-state" name="state" defaultValue={stateFilter} className="sm:w-56">
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/locations"
        sp={sp}
        total={total}
        page={p.page}
        title={(c) => `${c.name}, ${c.stateCode}`}
        actions={(c) => (
          <>
            <CityDialog city={c} states={states} />
            {c.businesses === 0 && (
              <ActionButton
                size="icon-sm"
                variant="ghost"
                action={deleteCity}
                input={{ id: c.id }}
                confirm={{ title: `Delete ${c.name}?`, description: "This city has no listings and will be removed permanently.", confirmLabel: "Delete" }}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="text-danger" aria-hidden />
              </ActionButton>
            )}
          </>
        )}
        empty={
          <EmptyState
            icon={<MapPinned />}
            title="No cities match"
            description="Try another search, or add the city yourself."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/locations">Clear filters</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
