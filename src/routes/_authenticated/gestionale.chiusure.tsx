import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Clock, Plus, Trash2, UserX } from "lucide-react";

import { closuresQuery, staffAbsencesQuery, staffShiftsQuery } from "@/lib/catalog-query";
import { deleteClosure, saveClosure } from "@/lib/closures.functions";
import { deleteStaffAbsence, saveStaffAbsence } from "@/lib/staff-absences.functions";
import { deleteStaffShift, saveStaffShift } from "@/lib/staff-shifts.functions";
import { siteQuery } from "@/lib/site-query";

export const Route = createFileRoute("/_authenticated/gestionale/chiusure")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(closuresQuery);
    context.queryClient.ensureQueryData(staffAbsencesQuery);
    context.queryClient.ensureQueryData(staffShiftsQuery);
  },
  component: Chiusure,
});

type ClosureForm = {
  id?: string;
  locationId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string;
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY: ClosureForm = {
  locationId: "",
  startDate: today(),
  endDate: today(),
  reason: "",
  notes: "",
};

type AbsenceForm = {
  id?: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const EMPTY_ABSENCE: AbsenceForm = {
  staffId: "",
  startDate: today(),
  endDate: today(),
  reason: "",
};

type ShiftForm = {
  id?: string;
  staffId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

const EMPTY_SHIFT: ShiftForm = {
  staffId: "",
  weekday: 1,
  startTime: "09:00",
  endTime: "13:00",
};

const WEEKDAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Chiusure() {
  const { data } = useSuspenseQuery(closuresQuery);
  const { data: absenceData } = useSuspenseQuery(staffAbsencesQuery);
  const { data: shiftData } = useSuspenseQuery(staffShiftsQuery);
  const { data: site } = useSuspenseQuery(siteQuery);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ClosureForm | null>(null);
  const [absenceForm, setAbsenceForm] = useState<AbsenceForm | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftForm | null>(null);

  const save = useServerFn(saveClosure);
  const remove = useServerFn(deleteClosure);
  const saveAbsence = useServerFn(saveStaffAbsence);
  const removeAbsence = useServerFn(deleteStaffAbsence);
  const saveShift = useServerFn(saveStaffShift);
  const removeShift = useServerFn(deleteStaffShift);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["closures"] });
    queryClient.invalidateQueries({ queryKey: ["site"] });
  }

  const saveMutation = useMutation({
    mutationFn: (f: ClosureForm) =>
      save({
        data: {
          id: f.id,
          locationId: f.locationId || null,
          startDate: f.startDate,
          endDate: f.endDate,
          reason: f.reason.trim(),
          notes: f.notes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Chiusura salvata");
      setForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Non è stato possibile salvare la chiusura"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Chiusura eliminata");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Eliminazione non riuscita"),
  });

  function refreshAbsences() {
    queryClient.invalidateQueries({ queryKey: ["staff-absences"] });
  }

  const saveAbsenceMutation = useMutation({
    mutationFn: (f: AbsenceForm) =>
      saveAbsence({
        data: {
          id: f.id,
          staffId: f.staffId,
          startDate: f.startDate,
          endDate: f.endDate,
          reason: f.reason.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Assenza salvata");
      setAbsenceForm(null);
      refreshAbsences();
    },
    onError: (e: Error) => toast.error(e.message || "Non è stato possibile salvare l'assenza"),
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: (id: string) => removeAbsence({ data: { id } }),
    onSuccess: () => {
      toast.success("Assenza eliminata");
      refreshAbsences();
    },
    onError: (e: Error) => toast.error(e.message || "Eliminazione non riuscita"),
  });

  const { upcomingAbsences, pastAbsences } = useMemo(() => {
    const t = today();
    return {
      upcomingAbsences: absenceData.absences.filter((a) => a.end_date >= t),
      pastAbsences: absenceData.absences.filter((a) => a.end_date < t),
    };
  }, [absenceData.absences]);

  const staffName = (id: string) => site.staff.find((s) => s.id === id)?.full_name ?? "Operatore";

  function refreshShifts() {
    queryClient.invalidateQueries({ queryKey: ["staff-shifts"] });
  }

  const saveShiftMutation = useMutation({
    mutationFn: (f: ShiftForm) =>
      saveShift({
        data: {
          id: f.id,
          staffId: f.staffId,
          weekday: f.weekday,
          startTime: f.startTime,
          endTime: f.endTime,
        },
      }),
    onSuccess: () => {
      toast.success("Turno salvato");
      setShiftForm(null);
      refreshShifts();
    },
    onError: (e: Error) => toast.error(e.message || "Non è stato possibile salvare il turno"),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => removeShift({ data: { id } }),
    onSuccess: () => {
      toast.success("Turno eliminato");
      refreshShifts();
    },
    onError: (e: Error) => toast.error(e.message || "Eliminazione non riuscita"),
  });

  /** Turni raggruppati per operatore, poi ordinati per giorno della settimana. */
  const shiftsByStaff = useMemo(() => {
    const map = new Map<string, typeof shiftData.shifts>();
    for (const s of shiftData.shifts) {
      const list = map.get(s.staff_id) ?? [];
      list.push(s);
      map.set(s.staff_id, list);
    }
    return map;
  }, [shiftData]);

  const { upcoming, past } = useMemo(() => {
    const t = today();
    return {
      upcoming: data.closures.filter((c) => c.end_date >= t),
      past: data.closures.filter((c) => c.end_date < t),
    };
  }, [data.closures]);

  const locationName = (id: string | null) =>
    id ? (site.locations.find((l) => l.id === id)?.name ?? "Sede") : "Tutte le sedi";
  const singleLocationId = site.locations.length === 1 ? site.locations[0]!.id : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Disponibilità</p>
          <h1 className="mt-2 text-4xl">Chiusure e ferie</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Nelle date indicate i trattamenti non sono prenotabili online e le richieste vengono
            rifiutate automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY, locationId: singleLocationId ?? "" })}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm text-background"
        >
          <Plus className="size-4" aria-hidden="true" /> Nuova chiusura
        </button>
      </header>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.endDate < form.startDate) {
              toast.error("La data di fine deve seguire quella di inizio");
              return;
            }
            saveMutation.mutate(form);
          }}
          className="grid gap-5 rounded-lg border border-border bg-background p-6 md:grid-cols-2"
        >
          <label className="text-sm">
            Motivo
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ferie estive, festività, formazione…"
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          {!singleLocationId && (
            <label className="text-sm">
              Sede
              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
              >
                <option value="">Tutte le sedi</option>
                {site.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm">
            Dal
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate: e.target.value,
                  endDate: form.endDate < e.target.value ? e.target.value : form.endDate,
                })
              }
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Al
            <input
              type="date"
              required
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm md:col-span-2">
            Note interne
            <textarea
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-2 w-full rounded-md border border-border bg-background p-3"
            />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="min-h-11 rounded-md bg-foreground px-5 text-sm text-background disabled:opacity-60"
            >
              {saveMutation.isPending ? "Salvataggio…" : "Salva chiusura"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="min-h-11 rounded-md border border-border px-5 text-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl">In programma</h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessuna chiusura programmata: il centro è prenotabile secondo le normali disponibilità.
          </p>
        )}
        <ul className="space-y-3">
          {upcoming.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background p-5"
            >
              <div className="flex items-start gap-3">
                <CalendarOff className="mt-1 size-4 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-lg">{c.reason}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.start_date === c.end_date
                      ? formatDay(c.start_date)
                      : `${formatDay(c.start_date)} – ${formatDay(c.end_date)}`}{" "}
                    · {locationName(c.location_id)}
                  </p>
                  {c.notes && <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: c.id,
                      locationId: c.location_id ?? "",
                      startDate: c.start_date,
                      endDate: c.end_date,
                      reason: c.reason,
                      notes: c.notes ?? "",
                    })
                  }
                  className="min-h-11 rounded-md border border-border px-4 text-sm"
                >
                  Modifica
                </button>
                <button
                  type="button"
                  aria-label={`Elimina la chiusura ${c.reason}`}
                  onClick={() => {
                    if (confirm(`Eliminare la chiusura “${c.reason}”?`))
                      deleteMutation.mutate(c.id);
                  }}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl">Archivio</h2>
          <ul className="space-y-2">
            {past.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 px-5 py-3 text-sm text-muted-foreground"
              >
                <span>
                  {c.reason} ·{" "}
                  {c.start_date === c.end_date
                    ? formatDay(c.start_date)
                    : `${formatDay(c.start_date)} – ${formatDay(c.end_date)}`}
                </span>
                <button
                  type="button"
                  aria-label={`Elimina la chiusura ${c.reason}`}
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <hr className="border-border" />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Disponibilità</p>
          <h1 className="mt-2 text-4xl">Turni settimanali</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Quando lavora normalmente ogni operatore, ogni settimana. Un operatore senza nessun
            turno impostato resta considerato sempre disponibile (comportamento di prima) — imposta
            i turni solo per chi vuoi davvero limitare a orari precisi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShiftForm({ ...EMPTY_SHIFT })}
          disabled={site.staff.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm text-background disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" /> Nuovo turno
        </button>
      </header>

      {shiftForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveShiftMutation.mutate(shiftForm);
          }}
          className="grid gap-5 rounded-lg border border-border bg-background p-6 md:grid-cols-2"
        >
          <label className="text-sm">
            Operatore
            <select
              required
              value={shiftForm.staffId}
              onChange={(e) => setShiftForm({ ...shiftForm, staffId: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              <option value="" disabled>
                Scegli l'operatore
              </option>
              {site.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Giorno della settimana
            <select
              value={shiftForm.weekday}
              onChange={(e) => setShiftForm({ ...shiftForm, weekday: Number(e.target.value) })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              {WEEKDAYS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Dalle
            <input
              type="time"
              required
              value={shiftForm.startTime}
              onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Alle
            <input
              type="time"
              required
              value={shiftForm.endTime}
              onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <p className="text-xs text-muted-foreground md:col-span-2">
            Un operatore con più fasce nello stesso giorno (es. mattina e pomeriggio, con pausa
            pranzo): aggiungi un turno separato per ciascuna fascia.
          </p>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saveShiftMutation.isPending}
              className="min-h-11 rounded-md bg-foreground px-5 text-sm text-background disabled:opacity-60"
            >
              {saveShiftMutation.isPending ? "Salvataggio…" : "Salva turno"}
            </button>
            <button
              type="button"
              onClick={() => setShiftForm(null)}
              className="min-h-11 rounded-md border border-border px-5 text-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      <section className="space-y-5">
        {site.staff.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aggiungi prima almeno un operatore dal Listino per poter impostare i turni.
          </p>
        )}
        {site.staff.map((s) => {
          const shifts = (shiftsByStaff.get(s.id) ?? [])
            .slice()
            .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
          return (
            <div key={s.id} className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg">{s.full_name}</p>
                {shifts.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Nessun turno impostato · sempre disponibile
                  </span>
                )}
              </div>
              {shifts.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {shifts.map((sh) => (
                    <li
                      key={sh.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs"
                    >
                      <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {WEEKDAYS[sh.weekday]} {sh.start_time.slice(0, 5)}–{sh.end_time.slice(0, 5)}
                      <button
                        type="button"
                        aria-label={`Modifica turno di ${s.full_name} il ${WEEKDAYS[sh.weekday]}`}
                        onClick={() =>
                          setShiftForm({
                            id: sh.id,
                            staffId: sh.staff_id,
                            weekday: sh.weekday,
                            startTime: sh.start_time.slice(0, 5),
                            endTime: sh.end_time.slice(0, 5),
                          })
                        }
                        className="underline underline-offset-2"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        aria-label={`Elimina turno di ${s.full_name} il ${WEEKDAYS[sh.weekday]}`}
                        onClick={() => deleteShiftMutation.mutate(sh.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <hr className="border-border" />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Disponibilità</p>
          <h1 className="mt-2 text-4xl">Assenze dello staff</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Ferie, malattia o permesso di un singolo operatore: nei giorni indicati non verrà mai
            proposto come disponibile, né sarà possibile prenotarlo online.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbsenceForm({ ...EMPTY_ABSENCE })}
          disabled={site.staff.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm text-background disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" /> Nuova assenza
        </button>
      </header>

      {site.staff.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aggiungi prima almeno un operatore dal Listino per poter segnare le assenze.
        </p>
      )}

      {absenceForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (absenceForm.endDate < absenceForm.startDate) {
              toast.error("La data di fine deve seguire quella di inizio");
              return;
            }
            saveAbsenceMutation.mutate(absenceForm);
          }}
          className="grid gap-5 rounded-lg border border-border bg-background p-6 md:grid-cols-2"
        >
          <label className="text-sm">
            Operatore
            <select
              required
              value={absenceForm.staffId}
              onChange={(e) => setAbsenceForm({ ...absenceForm, staffId: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              <option value="" disabled>
                Scegli l'operatore
              </option>
              {site.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Motivo
            <input
              required
              minLength={2}
              maxLength={120}
              value={absenceForm.reason}
              onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              placeholder="Ferie, malattia, permesso…"
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Dal
            <input
              type="date"
              required
              value={absenceForm.startDate}
              onChange={(e) =>
                setAbsenceForm({
                  ...absenceForm,
                  startDate: e.target.value,
                  endDate:
                    absenceForm.endDate < e.target.value ? e.target.value : absenceForm.endDate,
                })
              }
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Al
            <input
              type="date"
              required
              value={absenceForm.endDate}
              min={absenceForm.startDate}
              onChange={(e) => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saveAbsenceMutation.isPending}
              className="min-h-11 rounded-md bg-foreground px-5 text-sm text-background disabled:opacity-60"
            >
              {saveAbsenceMutation.isPending ? "Salvataggio…" : "Salva assenza"}
            </button>
            <button
              type="button"
              onClick={() => setAbsenceForm(null)}
              className="min-h-11 rounded-md border border-border px-5 text-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl">In programma</h2>
        {upcomingAbsences.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna assenza programmata per lo staff.</p>
        )}
        <ul className="space-y-3">
          {upcomingAbsences.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background p-5"
            >
              <div className="flex items-start gap-3">
                <UserX className="mt-1 size-4 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-lg">
                    {staffName(a.staff_id)} · {a.reason}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.start_date === a.end_date
                      ? formatDay(a.start_date)
                      : `${formatDay(a.start_date)} – ${formatDay(a.end_date)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAbsenceForm({
                      id: a.id,
                      staffId: a.staff_id,
                      startDate: a.start_date,
                      endDate: a.end_date,
                      reason: a.reason,
                    })
                  }
                  className="min-h-11 rounded-md border border-border px-4 text-sm"
                >
                  Modifica
                </button>
                <button
                  type="button"
                  aria-label={`Elimina l'assenza di ${staffName(a.staff_id)}`}
                  onClick={() => {
                    if (confirm(`Eliminare l'assenza di ${staffName(a.staff_id)}?`))
                      deleteAbsenceMutation.mutate(a.id);
                  }}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {pastAbsences.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl">Archivio assenze</h2>
          <ul className="space-y-2">
            {pastAbsences.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 px-5 py-3 text-sm text-muted-foreground"
              >
                <span>
                  {staffName(a.staff_id)} · {a.reason} ·{" "}
                  {a.start_date === a.end_date
                    ? formatDay(a.start_date)
                    : `${formatDay(a.start_date)} – ${formatDay(a.end_date)}`}
                </span>
                <button
                  type="button"
                  aria-label={`Elimina l'assenza di ${staffName(a.staff_id)}`}
                  onClick={() => deleteAbsenceMutation.mutate(a.id)}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
