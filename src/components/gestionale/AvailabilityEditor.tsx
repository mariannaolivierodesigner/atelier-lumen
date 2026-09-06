import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import {
  applyHoursToDays,
  copiedRulesFrom,
  pasteRules,
  toggleDays,
  WEEKDAY_GROUPS,
  type EditableRule,
} from "@/lib/availability";
import {
  clearAvailabilityClipboard,
  useAvailabilityClipboard,
  writeAvailabilityClipboard,
} from "@/lib/availability-clipboard";
import { applyAvailabilityToServices, saveServiceAvailability } from "@/lib/catalog.functions";

export const WEEKDAYS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

type Props = {
  serviceId: string;
  serviceName: string;
  rules: { weekday: number; start_time: string; end_time: string }[];
  staff: { id: string; full_name: string; role_title: string | null }[];
  enabledStaffIds: string[];
  services: { id: string; name: string }[];
};

/** Regole di erogazione di un trattamento: giorni/orari, operatori abilitati e modifica massiva. */
export function AvailabilityEditor({
  serviceId,
  serviceName,
  rules,
  staff,
  enabledStaffIds,
  services,
}: Props) {
  const queryClient = useQueryClient();
  const persist = useServerFn(saveServiceAvailability);
  const persistBulk = useServerFn(applyAvailabilityToServices);
  const clipboard = useAvailabilityClipboard();

  const [days, setDays] = useState<EditableRule[]>(() =>
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
  const [copyDay, setCopyDay] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [applyRules, setApplyRules] = useState(true);
  const [applyStaff, setApplyStaff] = useState(true);

  const invalid = days.some((d) => d.enabled && d.endTime <= d.startTime);
  const activeRules = copiedRulesFrom(days);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["site"] }),
    ]);
  }

  const mutation = useMutation({
    mutationFn: () =>
      persist({ data: { serviceId, rules: activeRules, staffIds } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Regole di disponibilità aggiornate");
    },
    onError: () => toast.error("Non siamo riusciti a salvare le regole"),
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      persistBulk({
        data: { serviceIds: targetIds, rules: activeRules, staffIds, applyRules, applyStaff },
      }),
    onSuccess: async (res) => {
      await refresh();
      setTargetIds([]);
      setBulkOpen(false);
      toast.success(`Regole applicate a ${res.count} trattamenti`);
    },
    onError: () => toast.error("Non siamo riusciti ad applicare le regole"),
  });

  function update(weekday: number, patch: Partial<EditableRule>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  const otherServices = services.filter((s) => s.id !== serviceId);

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="text-2xl">Disponibilità del trattamento</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Se non selezioni nulla il trattamento resta prenotabile in qualsiasi giorno, orario e con
        qualsiasi operatore.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
        <span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">
          Modifica rapida
        </span>
        <QuickButton onClick={() => setDays((p) => toggleDays(p, WEEKDAY_GROUPS.all, true))}>
          Tutti i giorni
        </QuickButton>
        <QuickButton
          onClick={() =>
            setDays((p) =>
              toggleDays(toggleDays(p, WEEKDAY_GROUPS.weekend, false), WEEKDAY_GROUPS.weekdays, true),
            )
          }
        >
          Solo lun–ven
        </QuickButton>
        <QuickButton onClick={() => setDays((p) => toggleDays(p, WEEKDAY_GROUPS.all, false))}>
          Svuota
        </QuickButton>

        <span className="ml-2 inline-flex items-center gap-2">
          <label className="text-muted-foreground" htmlFor="copy-day">
            Copia orario di
          </label>
          <select
            id="copy-day"
            value={copyDay}
            onChange={(e) => setCopyDay(Number(e.target.value))}
            className="input-base w-36"
          >
            {WEEKDAYS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <QuickButton onClick={() => setDays((p) => applyHoursToDays(p, copyDay, WEEKDAY_GROUPS.weekdays))}>
            su lun–ven
          </QuickButton>
          <QuickButton onClick={() => setDays((p) => applyHoursToDays(p, copyDay, WEEKDAY_GROUPS.all))}>
            su tutti
          </QuickButton>
        </span>
      </div>

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
                  setStaffIds((prev) => (on ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
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

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={mutation.isPending || invalid}
          onClick={() => mutation.mutate()}
          className="min-h-11 rounded-md bg-primary px-6 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mutation.isPending ? "Salvataggio…" : "Salva disponibilità"}
        </button>
        <button
          type="button"
          disabled={invalid}
          onClick={() => {
            writeAvailabilityClipboard({ serviceName, rules: activeRules, staffIds });
            toast.success("Regole copiate negli appunti");
          }}
          className="min-h-11 rounded-md border border-border px-6 text-sm disabled:opacity-60"
        >
          Copia regole
        </button>
        <button
          type="button"
          disabled={!clipboard}
          onClick={() => {
            if (!clipboard) return;
            setDays((p) => pasteRules(p, clipboard.rules));
            setStaffIds(clipboard.staffIds);
            toast.success("Regole incollate: ricordati di salvare");
          }}
          className="min-h-11 rounded-md border border-border px-6 text-sm disabled:opacity-40"
        >
          Incolla
        </button>
        <button
          type="button"
          disabled={!clipboard}
          onClick={() => {
            if (!clipboard) return;
            setDays((p) => pasteRules(p, clipboard.rules, "merge"));
            setStaffIds((prev) => Array.from(new Set([...prev, ...clipboard.staffIds])));
            toast.success("Regole aggiunte a quelle esistenti");
          }}
          className="min-h-11 rounded-md border border-border px-6 text-sm disabled:opacity-40"
        >
          Incolla e unisci
        </button>
        {otherServices.length > 0 && (
          <button
            type="button"
            disabled={invalid}
            onClick={() => setBulkOpen((v) => !v)}
            className="min-h-11 rounded-md border border-accent px-6 text-sm disabled:opacity-60"
          >
            Applica a più trattamenti
          </button>
        )}
      </div>

      {clipboard && (
        <p className="mt-3 text-sm text-muted-foreground">
          Negli appunti: {clipboard.rules.length} giorni da «{clipboard.serviceName}» ·{" "}
          {clipboard.staffIds.length} operatori.{" "}
          <button
            type="button"
            onClick={clearAvailabilityClipboard}
            className="underline underline-offset-4"
          >
            Svuota appunti
          </button>
        </p>
      )}

      {bulkOpen && (
        <div className="mt-6 rounded-md border border-border p-4">
          <h3 className="text-lg">Applica queste regole ad altri trattamenti</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Le regole attualmente impostate su «{serviceName}» sostituiranno quelle dei trattamenti
            selezionati.
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyRules}
                onChange={(e) => setApplyRules(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              Giorni e orari
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyStaff}
                onChange={(e) => setApplyStaff(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              Operatori abilitati
            </label>
            <button
              type="button"
              onClick={() => setTargetIds(otherServices.map((s) => s.id))}
              className="underline underline-offset-4"
            >
              Seleziona tutti
            </button>
            <button
              type="button"
              onClick={() => setTargetIds([])}
              className="underline underline-offset-4"
            >
              Deseleziona
            </button>
          </div>

          <ul className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
            {otherServices.map((s) => {
              const on = targetIds.includes(s.id);
              return (
                <li key={s.id}>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setTargetIds((prev) =>
                          on ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                        )
                      }
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    {s.name}
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={
              bulkMutation.isPending ||
              invalid ||
              targetIds.length === 0 ||
              (!applyRules && !applyStaff)
            }
            onClick={() => bulkMutation.mutate()}
            className="mt-4 min-h-11 rounded-md bg-primary px-6 text-sm text-primary-foreground disabled:opacity-60"
          >
            {bulkMutation.isPending
              ? "Applicazione…"
              : `Applica a ${targetIds.length} trattamenti`}
          </button>
        </div>
      )}
    </section>
  );
}

function QuickButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-full border border-border bg-background px-3 text-sm"
    >
      {children}
    </button>
  );
}
