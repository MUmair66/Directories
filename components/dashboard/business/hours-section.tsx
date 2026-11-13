"use client";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Plus, Trash2 } from "lucide-react";
import { hoursSchema, type HoursInput } from "@/lib/validations/business";
import { saveSection } from "@/app/actions/dashboard/businesses";
import { DAYS } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";
import { SectionFooter, type SectionMode } from "./section-footer";
import { AutosaveStatus, useAutosave } from "./use-autosave";

type Row = HoursInput["hours"][number];

export function HoursSection({ businessId, defaults, mode, onSaved }: { businessId: string; defaults: HoursInput; mode: SectionMode; onSaved: () => void }) {
  const form = useForm<HoursInput>({ resolver: zodResolver(hoursSchema), defaultValues: defaults });
  const { control, handleSubmit, formState, watch, setValue, reset, register, setError } = form;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "hours" });
  const [pending, start] = useTransition();
  const rows = watch("hours");
  useUnsavedWarning(mode.kind === "edit" && formState.isDirty);

  const persist = async (values: HoursInput, silent: boolean) => {
    const res = await saveSection({ businessId, section: "hours", data: values, wizardStep: mode.kind === "wizard" ? 4 : undefined });
    if (!silent || !res.ok) handleResult(res, { setError, success: silent ? false : undefined });
    return res.ok;
  };
  const autosave = useAutosave(form, (v) => persist(v, true), mode.kind === "wizard");

  const copyMondayToWeekdays = () => {
    const monday = rows.filter((r) => r.day === 0);
    const others = rows.filter((r) => r.day >= 5);
    const copies: Row[] = [1, 2, 3, 4].flatMap((day) => monday.map((m) => ({ ...m, day })));
    replace([...monday, ...copies, ...others].sort((a, b) => a.day - b.day || (a.sequence ?? 0) - (b.sequence ?? 0)));
  };

  const indexFor = (day: number, seq: number) => fields.findIndex((_, i) => rows[i]?.day === day && (rows[i]?.sequence ?? 0) === seq);

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
      className="grid gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Set your regular weekly hours. Add a second range for split shifts (e.g. lunch closures).</p>
        <Button type="button" variant="outline" size="sm" onClick={copyMondayToWeekdays}>
          <Copy /> Copy Monday to all weekdays
        </Button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {DAYS.map((dayName, day) => {
          const i0 = indexFor(day, 0);
          const i1 = indexFor(day, 1);
          if (i0 < 0) return null;
          const r0 = rows[i0]!;
          const closed = !!r0.isClosed;
          const allDay = !!r0.is24h;
          const rowError = formState.errors.hours?.[i0]?.openTime?.message ?? (i1 >= 0 ? formState.errors.hours?.[i1]?.openTime?.message : undefined);
          return (
            <fieldset key={day} className="grid gap-3 p-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
              <legend className="sr-only">{dayName}</legend>
              <p className="font-semibold" aria-hidden>
                {dayName}
              </p>
              <div className="grid gap-2">
                {closed ? (
                  <p className="text-sm font-medium text-danger">Closed</p>
                ) : allDay ? (
                  <p className="text-sm font-medium text-success">Open 24 hours</p>
                ) : (
                  [i0, i1].filter((i) => i >= 0).map((i, n) => (
                    <div key={fields[i]!.id} className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`open-${day}-${n}`}>
                        {dayName} opens{n ? " (second range)" : ""}
                      </label>
                      <Input id={`open-${day}-${n}`} type="time" className="w-32" {...register(`hours.${i}.openTime`)} />
                      <span className="text-muted-foreground">to</span>
                      <label className="sr-only" htmlFor={`close-${day}-${n}`}>
                        {dayName} closes{n ? " (second range)" : ""}
                      </label>
                      <Input id={`close-${day}-${n}`} type="time" className="w-32" {...register(`hours.${i}.closeTime`)} />
                      {n === 1 ? (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={`Remove second range for ${dayName}`}>
                          <Trash2 />
                        </Button>
                      ) : (
                        i1 < 0 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => append({ day, sequence: 1, isClosed: false, is24h: false, openTime: "17:00", closeTime: "21:00" })}>
                            <Plus /> Split shift
                          </Button>
                        )
                      )}
                    </div>
                  ))
                )}
                {rowError && <p className="text-sm text-danger">{rowError}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={closed}
                    onCheckedChange={(v) => {
                      setValue(`hours.${i0}.isClosed`, v, { shouldDirty: true });
                      if (v) {
                        setValue(`hours.${i0}.is24h`, false, { shouldDirty: true });
                        if (i1 >= 0) remove(i1);
                      } else if (!r0.openTime) {
                        setValue(`hours.${i0}.openTime`, "09:00", { shouldDirty: true });
                        setValue(`hours.${i0}.closeTime`, "17:00", { shouldDirty: true });
                      }
                    }}
                    aria-label={`${dayName} closed`}
                  />
                  Closed
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={allDay}
                    disabled={closed}
                    onCheckedChange={(v) => {
                      setValue(`hours.${i0}.is24h`, v, { shouldDirty: true });
                      if (v && i1 >= 0) remove(i1);
                      if (!v && !r0.openTime) {
                        setValue(`hours.${i0}.openTime`, "09:00", { shouldDirty: true });
                        setValue(`hours.${i0}.closeTime`, "17:00", { shouldDirty: true });
                      }
                    }}
                    aria-label={`${dayName} open 24 hours`}
                  />
                  Open 24 hours
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
      <AutosaveStatus status={autosave} />
      <SectionFooter mode={mode} dirty={formState.isDirty} pending={pending} onReset={() => reset(defaults)} />
    </form>
  );
}
