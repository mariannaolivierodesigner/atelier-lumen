import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserX } from "lucide-react";

import { staffAbsencesQuery } from "@/lib/catalog-query";
import { deleteStaffAbsence, saveStaffAbsence } from "@/lib/staff-absences.functions";
import type { AbsenceType } from "@/lib/catalog.server";
import { siteQuery } from "@/lib/site-query";

export const Route = createFileRoute("/_authenticated/gestionale/staff")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(staffAbsencesQuery);
  },
  component: GestioneStaff,
});

const ABSENCE_TYPE_LABEL: Record<AbsenceType, string> = {
  ferie: "Ferie",
  malattia: "Malattia",
  permesso: "Permesso",
};

const ABSENCE_TYPE_BADGE: Record<AbsenceType, string> = {
  ferie: "bg-accent/20 text-foreground",
  malattia: "bg-destructive/10 text-destructive",
  permesso: "bg-primary/10 text-foreground",
};

type AbsenceForm = {
  id?: string;
  staffId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_ABSENCE: AbsenceForm = {
  staffId: "",
  type: "ferie",
  startDate: today(),
  endDate: today(),
  startTime: "",
  endTime: "",
  reason: "",
};

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function GestioneStaff() {
  const { data: absenceData } = useSuspenseQuery(staffAbsencesQuery);
  const { data: site } = useSuspenseQuery(siteQuery);
  const queryClient = useQueryClient();

  const [absenceForm, setAbsenceForm] = useState<AbsenceForm | null>(null);

  const saveAbsence = useServerFn(saveStaffAbsence);
  const removeAbsence = useServerFn(deleteStaffAbsence);

  function refreshAbsences() {
    queryClient.invalidateQueries({ queryKey: ["staff-absences"] });
  }

  const saveAbsenceMutation = useMutation({
    mutationFn: (f: AbsenceForm) =>
      saveAbsence({
        data: {
          id: f.id,
          staffId: f.staffId,
          type: f.type,
          startDate: f.startDate,
          endDate: f.type === "permesso" ? f.startDate : f.endDate,
          startTime: f.type === "permesso" ? f.startTime : undefined,
          endTime: f.type === "permesso" ? f.endTime : undefined,
          reason: f.reason.trim() || undefined,
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

  function describeWhen(a: (typeof absenceData.absences)[number]) {
    const range =
      a.start_date === a.end_date
        ? formatDay(a.start_date)
        : `${formatDay(a.start_date)} – ${formatDay(a.end_date)}`;
    if (a.type === "permesso" && a.start_time && a.end_time) {
      return `${range} · ${formatTime(a.start_time)}–${formatTime(a.end_time)}`;
    }
    return range;
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Team</p>
          <h1 className="mt-2 text-4xl">Gestione staff</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Ferie, malattia o permesso di un singolo operatore: nei momenti indicati non verrà
            mai proposto come disponibile, né sarà possibile prenotarlo online.
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
            if (absenceForm.type !== "permesso" && absenceForm.endDate < absenceForm.startDate) {
              toast.error("La data di fine deve seguire quella di inizio");
              return;
            }
            if (
              absenceForm.type === "permesso" &&
              absenceForm.startTime &&
              absenceForm.endTime &&
              absenceForm.endTime <= absenceForm.startTime
            ) {
              toast.error("L'orario di fine deve seguire quello di inizio");
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
            Tipo assenza
            <select
              required
              value={absenceForm.type}
              onChange={(e) => {
                const type = e.target.value as AbsenceType;
                setAbsenceForm({
                  ...absenceForm,
                  type,
                  // Un permesso riguarda un solo giorno.
                  endDate: type === "permesso" ? absenceForm.startDate : absenceForm.endDate,
                });
              }}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              {(Object.keys(ABSENCE_TYPE_LABEL) as AbsenceType[]).map((t) => (
                <option key={t} value={t}>
                  {ABSENCE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            {absenceForm.type === "permesso" ? "Giorno" : "Dal"}
            <input
              type="date"
              required
              value={absenceForm.startDate}
              onChange={(e) =>
                setAbsenceForm({
                  ...absenceForm,
                  startDate: e.target.value,
                  endDate:
                    absenceForm.type === "permesso" || absenceForm.endDate < e.target.value
                      ? e.target.value
                      : absenceForm.endDate,
                })
              }
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>

          {absenceForm.type === "permesso" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Dalle
                <input
                  type="time"
                  required
                  value={absenceForm.startTime}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, startTime: e.target.value })}
                  className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
                />
              </label>
              <label className="text-sm">
                Alle
                <input
                  type="time"
                  required
                  value={absenceForm.endTime}
                  min={absenceForm.startTime || undefined}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, endTime: e.target.value })}
                  className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3"
                />
              </label>
            </div>
          ) : (
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
          )}

          <label className="text-sm md:col-span-2">
            Note (opzionale)
            <input
              maxLength={120}
              value={absenceForm.reason}
              onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              placeholder="Es. visita medica, evento familiare…"
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
                  <p className="flex flex-wrap items-center gap-2 text-lg">
                    {staffName(a.staff_id)}
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${ABSENCE_TYPE_BADGE[a.type as AbsenceType]}`}
                    >
                      {ABSENCE_TYPE_LABEL[a.type as AbsenceType]}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{describeWhen(a)}</p>
                  {a.reason && <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAbsenceForm({
                      id: a.id,
                      staffId: a.staff_id,
                      type: a.type as AbsenceType,
                      startDate: a.start_date,
                      endDate: a.end_date,
                      startTime: a.start_time ? formatTime(a.start_time) : "",
                      endTime: a.end_time ? formatTime(a.end_time) : "",
                      reason: a.reason ?? "",
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
                  {staffName(a.staff_id)} · {ABSENCE_TYPE_LABEL[a.type as AbsenceType]} ·{" "}
                  {describeWhen(a)}
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
