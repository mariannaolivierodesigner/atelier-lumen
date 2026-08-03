import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { workspaceQuery, STATUS_CLASS, STATUS_LABEL, dayFmt, timeFmt } from "@/lib/admin-query";
import { updateBookingStatus, type BookingStatus } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/site-query";

export const Route = createFileRoute("/_authenticated/gestionale/prenotazioni")({
  component: Bookings,
});

const FILTERS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "Tutte" },
  { value: "pending", label: "Da confermare" },
  { value: "confirmed", label: "Confermate" },
  { value: "completed", label: "Completate" },
  { value: "cancelled", label: "Annullate" },
];

function Bookings() {
  const { data } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient();
  const setStatus = useServerFn(updateBookingStatus);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");

  const mutation = useMutation({
    mutationFn: setStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Prenotazione aggiornata");
    },
    onError: () => toast.error("Aggiornamento non riuscito"),
  });

  const serviceById = new Map(data.services.map((s) => [s.id, s]));
  const staffById = new Map(data.staff.map((s) => [s.id, s]));
  const locationById = new Map(data.locations.map((l) => [l.id, l]));

  const rows = data.bookings
    .filter((b) => (filter === "all" ? true : b.status === filter))
    .filter((b) =>
      search.trim()
        ? `${b.customer_name} ${b.customer_email}`.toLowerCase().includes(search.toLowerCase())
        : true,
    )
    .slice()
    .reverse();

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Prenotazioni</p>
        <h1 className="mt-3 text-4xl">Richieste e appuntamenti</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-4 py-2.5 text-sm transition-colors ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="ricerca">
          Cerca cliente
        </label>
        <input
          id="ricerca"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o email"
          className="min-w-56 flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-3xl text-left text-sm">
          <thead className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-4 font-normal">Quando</th>
              <th className="px-5 py-4 font-normal">Cliente</th>
              <th className="px-5 py-4 font-normal">Trattamento</th>
              <th className="px-5 py-4 font-normal">Operatore</th>
              <th className="px-5 py-4 font-normal">Stato</th>
              <th className="px-5 py-4 font-normal">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((b) => {
              const start = new Date(b.starts_at);
              const service = serviceById.get(b.service_id ?? "");
              return (
                <tr key={b.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="capitalize">{dayFmt.format(start)}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeFmt.format(start)} · {b.duration_minutes} min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {locationById.get(b.location_id ?? "")?.name ?? ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p>{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{b.customer_email}</p>
                    {b.customer_phone && (
                      <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p>{service?.name ?? "—"}</p>
                    {service && (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(service.price_cents)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    {b.staff_id ? (staffById.get(b.staff_id)?.full_name ?? "—") : "Da assegnare"}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${STATUS_CLASS[b.status as BookingStatus]}`}
                    >
                      {STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <label className="sr-only" htmlFor={`stato-${b.id}`}>
                      Cambia stato
                    </label>
                    <select
                      id={`stato-${b.id}`}
                      value={b.status}
                      disabled={mutation.isPending}
                      onChange={(e) =>
                        mutation.mutate({
                          data: { id: b.id, status: e.target.value as BookingStatus },
                        })
                      }
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-5 py-10 text-sm text-muted-foreground">Nessuna prenotazione trovata.</p>
        )}
      </div>
    </div>
  );
}
