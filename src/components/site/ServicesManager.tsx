import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteService, listServicesForStaff, saveService } from "@/lib/staff.functions";
import { formatPrice } from "@/lib/format";

type ServiceForm = {
  id?: string;
  name: string;
  shortDescription: string;
  durationMin: number;
  priceEuro: string;
  published: boolean;
};

const EMPTY: ServiceForm = {
  name: "",
  shortDescription: "",
  durationMin: 30,
  priceEuro: "",
  published: true,
};

export function ServicesManager() {
  const queryClient = useQueryClient();
  const fetchServices = useServerFn(listServicesForStaff);
  const save = useServerFn(saveService);
  const remove = useServerFn(deleteService);

  const [form, setForm] = useState<ServiceForm | null>(null);

  const services = useQuery({ queryKey: ["staff-services"], queryFn: () => fetchServices() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-services"] });

  const saveMutation = useMutation({
    mutationFn: (f: ServiceForm) => {
      const euro = Number(f.priceEuro.replace(",", "."));
      return save({
        data: {
          id: f.id,
          name: f.name.trim(),
          shortDescription: f.shortDescription.trim(),
          durationMin: f.durationMin,
          priceCents: Math.round(euro * 100),
          published: f.published,
        },
      });
    },
    onSuccess: () => {
      toast.success("Trattamento salvato.");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Salvataggio non riuscito."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Trattamento eliminato.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Eliminazione non riuscita."),
  });

  const rows = services.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ ...EMPTY })}>
          <Plus /> Nuovo trattamento
        </Button>
      </div>

      {form && (
        <form
          className="surface-card grid gap-4 p-6 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const euro = Number(form.priceEuro.replace(",", "."));
            if (!form.name.trim() || form.name.trim().length < 2) {
              toast.error("Inserisci il nome del trattamento.");
              return;
            }
            if (Number.isNaN(euro) || euro < 0) {
              toast.error("Inserisci un prezzo valido.");
              return;
            }
            saveMutation.mutate(form);
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="svc-name">Nome</Label>
            <Input
              id="svc-name"
              className="mt-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Es. Igiene dentale e sbiancamento"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="svc-desc">Descrizione breve</Label>
            <Textarea
              id="svc-desc"
              className="mt-2"
              rows={2}
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="Una riga che spiega di cosa si tratta"
              required
            />
          </div>
          <div>
            <Label htmlFor="svc-duration">Durata (minuti)</Label>
            <Input
              id="svc-duration"
              type="number"
              min={5}
              max={480}
              step={5}
              className="mt-2"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <Label htmlFor="svc-price">Prezzo (€)</Label>
            <Input
              id="svc-price"
              inputMode="decimal"
              className="mt-2"
              value={form.priceEuro}
              onChange={(e) => setForm({ ...form, priceEuro: e.target.value })}
              placeholder="Es. 90"
              required
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="svc-published"
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
            <Label htmlFor="svc-published">Visibile sul sito e prenotabile online</Label>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvataggio…" : "Salva trattamento"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Annulla
            </Button>
          </div>
        </form>
      )}

      {services.isPending ? (
        <Skeleton className="h-56 w-full rounded-3xl" />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessun trattamento ancora inserito.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="surface-card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-52 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  {!s.published && <Badge variant="outline">Non pubblicato</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">{s.short_description}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {s.duration_min} min · {formatPrice(s.price_cents)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm({
                    id: s.id,
                    name: s.name,
                    shortDescription: s.short_description,
                    durationMin: s.duration_min,
                    priceEuro: (s.price_cents / 100).toString(),
                    published: s.published,
                  })
                }
              >
                <Pencil /> Modifica
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Eliminare il trattamento "${s.name}"?`)) deleteMutation.mutate(s.id);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
