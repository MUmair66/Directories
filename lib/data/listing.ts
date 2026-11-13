import "server-only";
import { getCategory, getCity, getState } from "@/lib/data/public";
import { resolveLocation, type SearchInput } from "@/lib/search";
import type { SearchParams } from "@/lib/validations/search";

export type ListingScope = {
  category?: { id: string; slug: string; name: string; parent?: { slug: string; name: string } | null };
  state?: { id: string; slug: string; name: string; code: string; lat: number; lng: number };
  city?: { id: string; slug: string; name: string; lat: number; lng: number };
};

/**
 * Merges page scope (fixed by the route) with URL filters into a SearchInput.
 * Returns labels for active-filter chips and the map center.
 */
export async function resolveFilters(scope: ListingScope, p: SearchParams, perPage: number) {
  const input: SearchInput = {
    q: p.q,
    minRating: p.rating,
    openNow: p.open_now,
    verified: p.verified,
    posted: p.posted,
    sort: p.sort,
    page: p.page,
    perPage,
  };
  const labels: Record<string, string> = {};
  let center: { lat: number; lng: number; zoom: number } = { lat: 39.5, lng: -98.35, zoom: 4 };

  const category = scope.category ?? (p.category ? await getCategory(p.category) : null);
  if (category) {
    input.categoryId = category.id;
    labels[`category:${category.slug}`] = category.name;
  }

  const state = scope.state ?? (p.state ? await getState(p.state) : null);
  if (state) {
    input.stateId = state.id;
    labels[`state:${state.slug}`] = state.name;
    center = { lat: state.lat, lng: state.lng, zoom: 6 };
  }
  const city = scope.city ?? (state && p.city ? (await getCity(state.slug, p.city))?.city : null);
  if (city) {
    input.cityId = city.id;
    labels[`city:${city.slug}`] = city.name;
    center = { lat: city.lat, lng: city.lng, zoom: 11 };
  }

  let locationLabel: string | undefined;
  if (p.location && !scope.state && !scope.city && !p.lat) {
    const loc = await resolveLocation(p.location);
    if (loc) {
      if (loc.zip) input.zip = loc.zip;
      if (loc.cityId) input.cityId = loc.cityId;
      if (loc.stateId) input.stateId = loc.stateId;
      if (loc.lat != null && loc.lng != null) center = { lat: loc.lat, lng: loc.lng, zoom: loc.cityId ? 11 : 6 };
      locationLabel = loc.label;
      labels[`location:${p.location}`] = loc.label;
    }
  }

  if (p.lat != null && p.lng != null) {
    input.origin = { lat: p.lat, lng: p.lng };
    if (!input.cityId && !input.stateId && !input.zip) input.radiusMiles = 50;
    center = { lat: p.lat, lng: p.lng, zoom: 11 };
  } else if (city && p.sort === "distance") {
    // A typed city counts as a known location for distance sorting.
    input.origin = { lat: city.lat, lng: city.lng };
  }

  return { input, labels, center, category, state, city, locationLabel, hasLocation: !!input.origin };
}
