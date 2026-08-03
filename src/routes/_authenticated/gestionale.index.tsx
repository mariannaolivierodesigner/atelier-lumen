import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { workspaceQuery, STATUS_LABEL, STATUS_CLASS, dayFmt, timeFmt } from "@/lib/admin-query";
import type { BookingStatus } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/site-query";

export const Route = createFileRoute("/_authenticated/gestionale/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(workspaceQuery);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7 = new Date(startOfToday.getTime() + 7 * 86400000);

  const serviceById = new Map(data.services.map((s) => [s.id, s]));
  const staffById = new Map(data.staff.map((s) => [s.id, s]));

  const upcoming = data.bookings.filter(
    (b) => new Date(b.starts_at) >= startOfToday && b.status !== "cancelled",
  );
  const week = upcoming.filter((b) => new Date(b.starts_at) < in7);
  const pending = data.bookings.filter((b) => b.status === "pending");
  const weekValue = week.reduce(
    (sum, b) => sum + (serviceById.get(b.service_id ?? "")?.price_cents ?? 0),
    0,
  );

  const kpis = [
    { label: "Da confermare", value: String(pending.length) },
    { label: "Appuntamenti 7 giorni", value: String(week.length) },
    { label: "Valore stimato 7 giorni", value: formatPrice(weekValue) },
    { label: "Operatori attivi", value: String(data.staff.length) },
  ];

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Panoramica</p>
        <h1 className="mt-3 text-4xl">Buongiorno, ecco la situazione</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-background p-6">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">{kpi.label}</p>
            <p className="mt-3 font-display text-4xl">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-2xl">Prossimi appuntamenti</h2>
          <Link to="/gestionale/agenda" className="text-sm underline underline-offset-4">
            Apri agenda
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            Nessun appuntamento in programma.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.slice(0, 8).map((b) => {
              const start = new Date(b.starts_at);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm">{dayFmt.format(start)}</p>
                    <p className="text-xs text-muted-foreground">{timeFmt.format(start)}</p>
                  </div>
                  <div className="min-w-48 flex-1">
                    <p className="text-sm">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {serviceById.get(b.service_id ?? "")?.name ?? "Trattamento"}
                      {b.staff_id ? ` · ${staffById.get(b.staff_id)?.full_name ?? ""}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${STATUS_CLASS[b.status as BookingStatus]}`}
                  >
                    {STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
