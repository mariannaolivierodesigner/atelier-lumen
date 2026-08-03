import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { workspaceQuery, STATUS_CLASS, STATUS_LABEL, isoDay, timeFmt } from "@/lib/admin-query";
import { rescheduleBooking, type BookingStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/gestionale/agenda")({
  component: Agenda,
});

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00

function Agenda() {
  const { data } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient();
  const move = useServerFn(rescheduleBooking);
  const [day, setDay] = useState(() => new Date());
  const [dragging, setDragging] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: move,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Appuntamento spostato");
    },
    onError: () => toast.error("Spostamento non riuscito"),
  });

  const serviceById = new Map(data.services.map((s) => [s.id, s]));
  const dayKey = isoDay(day);
  const columns = data.staff.length > 0 ? data.staff : [{ id: "none", full_name: "Agenda" }];

  const dayBookings = data.bookings.filter(
    (b) => isoDay(new Date(b.starts_at)) === dayKey && b.status !== "cancelled",
  );

  function shiftDay(delta: number) {
    setDay(new Date(day.getTime() + delta * 86400000));
  }

  function drop(staffId: string, hour: number) {
    if (!dragging) return;
    const target = new Date(day);
    target.setHours(hour, 0, 0, 0);
    mutation.mutate({
      data: {
        id: dragging,
        startsAt: target.toISOString(),
        staffId: staffId === "none" ? null : staffId,
      },
    });
    setDragging(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1 className="mt-3 text-4xl capitalize">
            {new Intl.DateTimeFormat("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(day)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            aria-label="Giorno precedente"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-background"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setDay(new Date())}
            className="rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          >
            Oggi
          </button>
          <button
            onClick={() => shiftDay(1)}
            aria-label="Giorno successivo"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-background"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Trascina un appuntamento su un'altra fascia oraria o su un altro operatore per spostarlo.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <div
          className="grid min-w-4xl"
          style={{ gridTemplateColumns: `5rem repeat(${columns.length}, minmax(12rem, 1fr))` }}
        >
          <div className="border-b border-border px-3 py-3" />
          {columns.map((s) => (
            <div key={s.id} className="border-b border-l border-border px-4 py-3 text-sm">
              {s.full_name}
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-border px-3 py-3 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              {columns.map((s) => {
                const cell = dayBookings.filter((b) => {
                  const d = new Date(b.starts_at);
                  const matchStaff = s.id === "none" ? true : b.staff_id === s.id;
                  return matchStaff && d.getHours() === hour;
                });
                return (
                  <div
                    key={s.id + hour}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(s.id, hour)}
                    className="min-h-16 space-y-1 border-b border-l border-border p-1.5"
                  >
                    {cell.map((b) => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={() => setDragging(b.id)}
                        className={`cursor-grab rounded-md px-3 py-2 text-xs ${STATUS_CLASS[b.status as BookingStatus]}`}
                      >
                        <p className="font-medium">{timeFmt.format(new Date(b.starts_at))}</p>
                        <p>{b.customer_name}</p>
                        <p className="opacity-70">
                          {serviceById.get(b.service_id ?? "")?.name ?? "Trattamento"}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
          <span key={s} className={`rounded-full px-3 py-1 ${STATUS_CLASS[s]}`}>
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
