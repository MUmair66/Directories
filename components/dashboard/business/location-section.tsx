"use client";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { locationSchema, type LocationInput } from "@/lib/validations/business";
import { saveSection } from "@/app/actions/dashboard/businesses";
import { STATE_TIMEZONES } from "@/db/seed/states";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Skeleton } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";
import { SectionFooter, type SectionMode } from "./section-footer";
import { AutosaveStatus, useAutosave } from "./use-autosave";

const MapPin = dynamic(() => import("./map-pin"), { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> });

export const US_TIMEZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona (no DST)"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
  ["America/Detroit", "Eastern (Michigan)"],
  ["America/Indiana/Indianapolis", "Eastern (Indiana)"],
  ["America/Boise", "Mountain (Idaho)"],
] as const;

export type StateOption = { id: string; name: string; code: string; lat: number; lng: number };

type GooglePlace = {
  address_components?: { long_name: string; short_name: string; types: string[] }[];
  geometry?: { location: { lat: () => number; lng: () => number } };
};
declare global {
  interface Window {
    google?: { maps: { places: { Autocomplete: new (el: HTMLInputElement, o: object) => { addListener: (e: string, f: () => void) => void; getPlace: () => GooglePlace } } } };
  }
}

export function LocationSection({ businessId, defaults, states, mode, onSaved }: { businessId: string; defaults: LocationInput; states: StateOption[]; mode: SectionMode; onSaved: () => void }) {
  const form = useForm<LocationInput>({ resolver: zodResolver(locationSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, control, handleSubmit, formState, setValue, watch, reset, setError } = form;
  const [pending, start] = useTransition();
  const [manual, setManual] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  useUnsavedWarning(mode.kind === "edit" && formState.isDirty);

  const stateId = watch("stateId");
  const lat = watch("lat");
  const lng = watch("lng");
  const hide = watch("hideAddress");
  const state = states.find((s) => s.id === stateId);
  const center = lat != null && lng != null ? { lat, lng } : state ? { lat: state.lat, lng: state.lng } : { lat: 39.5, lng: -98.35 };

  // Auto-detect the time zone from the state.
  useEffect(() => {
    if (state && STATE_TIMEZONES[state.code] && !formState.dirtyFields.timezone) setValue("timezone", STATE_TIMEZONES[state.code]!, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.code]);

  const fillFromPlace = (place: GooglePlace) => {
    const get = (type: string, short = false) => place.address_components?.find((c) => c.types.includes(type))?.[short ? "short_name" : "long_name"] ?? "";
    const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
    if (street) setValue("address", street, { shouldDirty: true });
    const city = get("locality") || get("sublocality") || get("postal_town") || get("administrative_area_level_3");
    if (city) setValue("cityName", city, { shouldDirty: true });
    const st = states.find((s) => s.code === get("administrative_area_level_1", true));
    if (st) setValue("stateId", st.id, { shouldDirty: true, shouldValidate: true });
    const zip = get("postal_code");
    if (zip) setValue("zip", zip, { shouldDirty: true });
    if (place.geometry) {
      setValue("lat", Number(place.geometry.location.lat().toFixed(6)), { shouldDirty: true });
      setValue("lng", Number(place.geometry.location.lng().toFixed(6)), { shouldDirty: true });
    }
  };

  const initPlaces = () => {
    if (!addressRef.current || !window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(addressRef.current, { componentRestrictions: { country: "us" }, fields: ["address_components", "geometry"], types: ["address"] });
    ac.addListener("place_changed", () => fillFromPlace(ac.getPlace()));
  };

  /** Fallback geocoder (OpenStreetMap Nominatim) when Google Places isn't configured. */
  const geocode = async () => {
    const v = form.getValues();
    const q = [v.address, v.cityName, state?.code, v.zip].filter(Boolean).join(", ");
    if (!q) return toast.error("Enter an address, city or ZIP first.");
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (!hit) toast.error("We couldn't find that address. Drag the pin to your location instead.");
      else {
        setValue("lat", Number(Number(hit.lat).toFixed(6)), { shouldDirty: true });
        setValue("lng", Number(Number(hit.lon).toFixed(6)), { shouldDirty: true });
      }
    } catch {
      toast.error("Map lookup failed. Drag the pin to your location instead.");
    } finally {
      setGeocoding(false);
    }
  };

  const persist = async (values: LocationInput, silent: boolean) => {
    const res = await saveSection({ businessId, section: "location", data: values, wizardStep: mode.kind === "wizard" ? 3 : undefined });
    if (!silent || !res.ok) handleResult(res, { setError, success: silent ? false : undefined });
    return res.ok;
  };
  const autosave = useAutosave(form, (v) => persist(v, true), mode.kind === "wizard");
  const { ref: addressFieldRef, ...addressField } = register("address");

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        start(async () => {
          if (await persist(values, false)) {
            reset(values);
            onSaved();
          }
        }),
      )}
      className="grid gap-5"
    >
      {mapsKey && <Script src={`https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places&loading=async`} strategy="afterInteractive" onReady={initPlaces} />}
      <Field label="Country" htmlFor="country" required>
        <NativeSelect id="country" {...register("countryCode")} disabled>
          <option value="US">United States</option>
        </NativeSelect>
      </Field>
      <Field label="Street address" htmlFor="address" error={formState.errors.address?.message} help={mapsKey ? "Start typing and pick your address from the list." : undefined}>
        <Input
          id="address"
          autoComplete="street-address"
          {...addressField}
          ref={(el) => {
            addressFieldRef(el);
            addressRef.current = el;
          }}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="cityName" required error={formState.errors.cityName?.message}>
          <Input id="cityName" autoComplete="address-level2" {...register("cityName")} />
        </Field>
        <Field label="State" htmlFor="stateId" required error={formState.errors.stateId?.message}>
          <NativeSelect id="stateId" autoComplete="address-level1" {...register("stateId")}>
            <option value="">Choose a state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="ZIP code" htmlFor="zip" required error={formState.errors.zip?.message}>
          <Input id="zip" inputMode="numeric" autoComplete="postal-code" maxLength={10} {...register("zip")} />
        </Field>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Map location</p>
          {!mapsKey && (
            <Button type="button" variant="outline" size="sm" onClick={geocode} loading={geocoding}>
              <MapPinned /> Find address on map
            </Button>
          )}
        </div>
        <MapPin
          lat={center.lat}
          lng={center.lng}
          onChange={(la, ln) => {
            setValue("lat", la, { shouldDirty: true });
            setValue("lng", ln, { shouldDirty: true });
          }}
        />
        <p className="text-sm text-muted-foreground">Drag the pin or click the map to set your exact location.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Latitude" htmlFor="lat">
            <Input id="lat" type="number" step="0.000001" readOnly={!manual} {...register("lat", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
          </Field>
          <Field label="Longitude" htmlFor="lng">
            <Input id="lng" type="number" step="0.000001" readOnly={!manual} {...register("lng", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
          </Field>
          <label className="flex h-10 items-center gap-2 text-sm">
            <Switch checked={manual} onCheckedChange={setManual} aria-label="Edit coordinates manually" /> Manual override
          </label>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
        <div>
          <p className="font-medium">Service-area business</p>
          <p className="text-sm text-muted-foreground">Hide my street address. Customers see only your city and service area.</p>
        </div>
        <Controller control={control} name="hideAddress" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label="Hide my address" />} />
      </div>
      {hide && <p className="-mt-3 text-sm text-muted-foreground">Your address stays private and is used only to place you in search.</p>}

      <Field label="Time zone" htmlFor="timezone" help="Detected from your state. Used for your Open now status.">
        <NativeSelect id="timezone" {...register("timezone")}>
          {US_TIMEZONES.map(([tz, label]) => (
            <option key={tz} value={tz}>
              {label} ({tz})
            </option>
          ))}
        </NativeSelect>
      </Field>

      <AutosaveStatus status={autosave} />
      <SectionFooter mode={mode} dirty={formState.isDirty} pending={pending} onReset={() => reset(defaults)} />
    </form>
  );
}
