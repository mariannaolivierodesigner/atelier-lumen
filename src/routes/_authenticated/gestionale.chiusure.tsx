import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { closuresQuery } from "@/lib/catalog-query";
import { deleteClosure, saveClosure } from "@/lib/closures.functions";
import { siteQuery } from "@/lib/site-query";

export const Route = createFileRoute("/_authenticated/gestionale/chiusure")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(closuresQuery);
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

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Chiusure() {
  const { data } = useSuspenseQuery(closuresQuery);
  const { data: site } = useSuspenseQuery(siteQuery);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ClosureForm | null>(null);

  const save = useServerFn(saveClosure);
  const remove = useServerFn(deleteClosure);

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

  const { upcoming, past } = useMemo(() => {
    const t = today();
    return {
      upcoming: data.closures.filter((c) => c.end_date >= t),
      past: data.closures.filter((c) => c.end_date < t),
    };
  }, [data.closures]);

  const locationName = (id: string | null) =>
    id ? (site.locations.find((l) => l.id === id)?.name ?? "Sede") : "Tutte le sedi";

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
          onClick={() => setForm({ ...EMPTY })}
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
                    if (confirm(`Eliminare la chiusura “${c.reason}”?`)) deleteMutation.mutate(c.id);
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
    </div>
  );
}
