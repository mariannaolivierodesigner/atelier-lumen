import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { saveServiceAvailability } from "@/lib/catalog.functions";

export const WEEKDAYS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

type Rule = { weekday: number; startTime: string; endTime: string; enabled: boolean };

type Props = {
  serviceId: string;
  rules: { weekday: number; start_time: string; end_time: string }[];
  staff: { id: string; full_name: string; role_title: string | null }[];
  enabledStaffIds: string[];
};

/** Regole di erogazione di un trattamento: giorni/orari e operatori abilitati. */
export function AvailabilityEditor({ serviceId, rules, staff, enabledStaffIds }: Props) {
  const queryClient = useQueryClient();
  const persist = useServerFn(saveServiceAvailability);

  const [days, setDays] = useState<Rule[]>(() =>
    WEEKDAYS.map((_, weekday) => {
      const existing = rules.find((r) => r.weekday === weekday);
      return {
        weekday,
        enabled: !!existing,
        startTime: (existing?.start_time ?? "09:00").slice(0, 5),
        endTime: (existing?.end_time ?? "19:00").slice(0, 5),
      };
    }),
  );
  const [staffIds, setStaffIds] = useState<string[]>(enabledStaffIds);

  const mutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          serviceId,
          rules: days
            .filter((d) => d.enabled)
            .map((d) => ({ weekday: d.weekday, startTime: d.startTime, endTime: d.endTime })),
          staffIds,
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["site"] }),
      ]);
      toast.success("Regole di disponibilità aggiornate");
    },
    onError: () => toast.error("Non siamo riusciti a salvare le regole"),
  });

  const invalid = days.some((d) => d.enabled && d.endTime <= d.startTime);

  function update(weekday: number, patch: Partial<Rule>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="text-2xl">Disponibilità del trattamento</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Se non selezioni nulla il trattamento resta prenotabile in qualsiasi giorno, orario e con
        qualsiasi operatore.
      </p>

      <ul className="mt-6 space-y-3">
        {days.map((d) => (
          <li key={d.weekday} className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex min-w-40 items-center gap-2">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={(e) => update(d.weekday, { enabled: e.target.checked })}
                className="size-4 accent-[var(--color-primary)]"
              />
              {WEEKDAYS[d.weekday]}
            </label>
            <label className="inline-flex items-center gap-2">
              <span className="text-muted-foreground">dalle</span>
              <input
                type="time"
                step={900}
                disabled={!d.enabled}
                value={d.startTime}
                onChange={(e) => update(d.weekday, { startTime: e.target.value })}
                className="input-base w-32 disabled:opacity-40"
                aria-label={`Orario di inizio ${WEEKDAYS[d.weekday]}`}
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <span className="text-muted-foreground">alle</span>
              <input
                type="time"
                step={900}
                disabled={!d.enabled}
                value={d.endTime}
                onChange={(e) => update(d.weekday, { endTime: e.target.value })}
                className="input-base w-32 disabled:opacity-40"
                aria-label={`Orario di fine ${WEEKDAYS[d.weekday]}`}
              />
            </label>
            {d.enabled && d.endTime <= d.startTime && (
              <span className="text-sm text-destructive">La fine deve seguire l'inizio</span>
            )}
          </li>
        ))}
      </ul>

      <fieldset className="mt-8">
        <legend className="text-xs tracking-[0.16em] uppercase text-muted-foreground">
          Operatori abilitati
        </legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {staff.map((p) => {
            const on = staffIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setStaffIds((prev) =>
                    on ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                  )
                }
                className={`min-h-11 rounded-full border px-4 text-sm ${on ? "border-accent bg-accent/10" : "border-border text-muted-foreground"}`}
              >
                {p.full_name}
              </button>
            );
          })}
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun operatore in anagrafica.</p>
          )}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={mutation.isPending || invalid}
        onClick={() => mutation.mutate()}
        className="mt-8 min-h-11 rounded-md bg-primary px-6 text-sm text-primary-foreground disabled:opacity-60"
      >
        {mutation.isPending ? "Salvataggio…" : "Salva disponibilità"}
      </button>
    </section>
  );
}
