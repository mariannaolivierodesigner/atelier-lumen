import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteDoctorShift,
  listDoctorShifts,
  listStaffDoctors,
  saveDoctorShift,
} from "@/lib/staff.functions";

// Convenzione JS: 0 = domenica ... 6 = sabato. Mostrata a partire dal lunedì.
const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 0, label: "Domenica" },
];

type NewShift = { weekday: number; startTime: string; endTime: string } | null;

export function ShiftsManager() {
  const queryClient = useQueryClient();
  const fetchDoctors = useServerFn(listStaffDoctors);
  const fetchShifts = useServerFn(listDoctorShifts);
  const save = useServerFn(saveDoctorShift);
  const remove = useServerFn(deleteDoctorShift);

  const [doctorId, setDoctorId] = useState("");
  const [draft, setDraft] = useState<NewShift>(null);

  const doctors = useQuery({ queryKey: ["staff-doctors"], queryFn: () => fetchDoctors() });
  const shifts = useQuery({
    queryKey: ["doctor-shifts", doctorId],
    enabled: !!doctorId,
    queryFn: () => fetchShifts({ data: { doctorId } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["doctor-shifts", doctorId] });

  const saveMutation = useMutation({
    mutationFn: (input: { weekday: number; startTime: string; endTime: string }) =>
      save({ data: { doctorId, ...input } }),
    onSuccess: () => {
      toast.success("Turno salvato.");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Salvataggio non riuscito."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Turno rimosso.");
      invalidate();
    },
    onError: () => toast.error("Rimozione non riuscita."),
  });

  const rows = shifts.data ?? [];

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Select value={doctorId} onValueChange={setDoctorId}>
          <SelectTrigger>
            <SelectValue placeholder="Scegli un medico" />
          </SelectTrigger>
          <SelectContent>
            {(doctors.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!doctorId ? (
        <p className="text-muted-foreground text-sm">
          Scegli un medico per vedere e modificare i suoi turni settimanali.
        </p>
      ) : shifts.isPending ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {WEEKDAYS.map((day) => {
            const dayShifts = rows.filter((s) => s.weekday === day.value);
            const isAdding = draft?.weekday === day.value;
            return (
              <div key={day.value} className="surface-card space-y-3 p-4">
                <p className="font-medium">{day.label}</p>

                {dayShifts.length === 0 && !isAdding && (
                  <p className="text-muted-foreground text-xs">Nessun turno — giorno chiuso.</p>
                )}

                <ul className="space-y-2">
                  {dayShifts.map((s) => (
                    <li
                      key={s.id}
                      className="bg-muted/50 flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
                    >
                      <span>
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label={`Rimuovi turno ${day.label} ${s.start_time.slice(0, 5)}`}
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>

                {isAdding ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft) return;
                      saveMutation.mutate(draft);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        step={900}
                        value={draft.startTime}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        className="h-9"
                        required
                      />
                      <span className="text-muted-foreground text-xs">–</span>
                      <Input
                        type="time"
                        step={900}
                        value={draft.endTime}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                        Salva
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                        Annulla
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft({ weekday: day.value, startTime: "09:00", endTime: "13:00" })
                    }
                  >
                    <Plus className="size-3.5" /> Aggiungi turno
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
