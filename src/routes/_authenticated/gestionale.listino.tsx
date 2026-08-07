import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { catalogQuery, formatDuration } from "@/lib/catalog-query";
import {
  deleteCategory,
  deleteService,
  saveCategory,
  saveService,
} from "@/lib/catalog.functions";
import { workspaceQuery } from "@/lib/admin-query";
import { formatPrice } from "@/lib/site-query";
import { AvailabilityEditor } from "@/components/gestionale/AvailabilityEditor";

export const Route = createFileRoute("/_authenticated/gestionale/listino")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQuery);
  },
  component: Listino,
});

type ServiceForm = {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  durationMinutes: string;
  price: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
  isBookable: boolean;
  isFeatured: boolean;
};

const EMPTY_SERVICE: ServiceForm = {
  name: "",
  categoryId: "",
  description: "",
  durationMinutes: "60",
  price: "0",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
  isBookable: true,
  isFeatured: false,
};

function Listino() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { data: workspace } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ServiceForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "hidden">("all");

  const canDelete =
    workspace.membership?.role === "owner" || workspace.membership?.role === "manager";

  const persistService = useServerFn(saveService);
  const removeService = useServerFn(deleteService);
  const persistCategory = useServerFn(saveCategory);
  const removeCategory = useServerFn(deleteCategory);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["site"] }),
    ]);
  }

  const saveServiceMutation = useMutation({
    mutationFn: (value: ServiceForm) =>
      persistService({
        data: {
          ...(value.id ? { id: value.id } : {}),
          name: value.name.trim(),
          categoryId: value.categoryId || null,
          description: value.description.trim(),
          durationMinutes: Number(value.durationMinutes) || 60,
          priceCents: Math.round((Number(value.price.replace(",", ".")) || 0) * 100),
          imageUrl: value.imageUrl.trim(),
          sortOrder: Number(value.sortOrder) || 0,
          isActive: value.isActive,
          isBookable: value.isBookable,
          isFeatured: value.isFeatured,
        },
      }),
    onSuccess: async () => {
      setForm(null);
      await refresh();
      toast.success("Listino aggiornato");
    },
    onError: () => toast.error("Non siamo riusciti a salvare il trattamento"),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => removeService({ data: { id } }),
    onSuccess: async () => {
      setForm(null);
      await refresh();
      toast.success("Trattamento eliminato");
    },
    onError: () => toast.error("Eliminazione non riuscita"),
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (value: { id?: string; name: string }) =>
      persistCategory({
        data: {
          ...(value.id ? { id: value.id } : {}),
          name: value.name.trim(),
          sortOrder: 0,
          isActive: true,
        },
      }),
    onSuccess: async () => {
      setCategoryForm(null);
      await refresh();
      toast.success("Categoria salvata");
    },
    onError: () => toast.error("Non siamo riusciti a salvare la categoria"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => removeCategory({ data: { id } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Categoria eliminata");
    },
    onError: () => toast.error("Elimina prima i trattamenti collegati"),
  });

  const categoryName = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c.name] as const)),
    [data.categories],
  );

  const services = data.services.filter((s) =>
    filter === "all" ? true : filter === "published" ? s.is_active : !s.is_active,
  );

  const totalValue = data.services.reduce((sum, s) => sum + s.price_cents, 0);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Listino</p>
          <h1 className="mt-2 text-3xl">Trattamenti e prezzi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.services.length} trattamenti · {data.services.filter((s) => s.is_active).length}{" "}
            pubblicati sul sito · valore medio{" "}
            {formatPrice(data.services.length ? totalValue / data.services.length : 0)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(EMPTY_SERVICE)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden /> Nuovo trattamento
        </button>
      </header>

      <section className="rounded-lg border border-border bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg">Categorie</h2>
          <button
            type="button"
            onClick={() => setCategoryForm({ name: "" })}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Aggiungi categoria
          </button>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
            >
              <button type="button" onClick={() => setCategoryForm({ id: c.id, name: c.name })}>
                {c.name}
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Elimina categoria ${c.name}`}
                  onClick={() => deleteCategoryMutation.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {data.categories.length === 0 && (
            <li className="text-sm text-muted-foreground">Nessuna categoria.</li>
          )}
        </ul>

        {categoryForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCategoryMutation.mutate(categoryForm);
            }}
            className="mt-5 flex flex-wrap items-end gap-3"
          >
            <label className="flex-1 text-sm">
              Nome categoria
              <input
                required
                minLength={2}
                maxLength={120}
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="input-base mt-2"
              />
            </label>
            <button
              type="submit"
              disabled={saveCategoryMutation.isPending}
              className="min-h-11 rounded-md bg-primary px-5 text-sm text-primary-foreground disabled:opacity-60"
            >
              Salva
            </button>
            <button
              type="button"
              onClick={() => setCategoryForm(null)}
              className="min-h-11 rounded-md border border-border px-5 text-sm"
            >
              Annulla
            </button>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-5">
          {(
            [
              ["all", "Tutti"],
              ["published", "Pubblicati"],
              ["hidden", "Nascosti"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`min-h-9 rounded-full border px-4 text-sm ${filter === value ? "border-accent bg-accent/10" : "border-border text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-56 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: s.id,
                      name: s.name,
                      categoryId: s.category_id ?? "",
                      description: s.description ?? "",
                      durationMinutes: String(s.duration_minutes),
                      price: (s.price_cents / 100).toFixed(2),
                      imageUrl: s.image_url ?? "",
                      sortOrder: String(s.sort_order),
                      isActive: s.is_active,
                      isBookable: s.is_bookable,
                      isFeatured: s.is_featured,
                    })
                  }
                  className="text-left text-lg hover:underline"
                >
                  {s.name}
                </button>
                <p className="text-xs text-muted-foreground">
                  {s.category_id ? categoryName.get(s.category_id) : "Senza categoria"}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(s.duration_minutes)}
              </span>
              <span className="w-24 text-right text-sm">{formatPrice(s.price_cents)}</span>
              <span className="flex gap-1.5">
                <Badge on={s.is_active} label={s.is_active ? "Sul sito" : "Nascosto"} />
                <Badge
                  on={s.is_bookable}
                  label={s.is_bookable ? "Prenotabile" : "Non prenotabile"}
                />
                {s.is_featured && <Badge on label="In evidenza" />}
                {data.availability.some((a) => a.service_id === s.id) && (
                  <Badge on label="Giorni limitati" />
                )}
                {data.serviceStaff.some((x) => x.service_id === s.id) && (
                  <Badge on label="Operatori dedicati" />
                )}
              </span>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Elimina ${s.name}`}
                  onClick={() => deleteServiceMutation.mutate(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {services.length === 0 && (
            <li className="p-8 text-sm text-muted-foreground">Nessun trattamento in elenco.</li>
          )}
        </ul>
      </section>

      {form && (
        <section className="rounded-lg border border-border bg-background p-6">
          <h2 className="text-2xl">{form.id ? "Modifica trattamento" : "Nuovo trattamento"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveServiceMutation.mutate(form);
            }}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm">
                Nome
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-base mt-2"
                />
              </label>
              <label className="text-sm">
                Categoria
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-base mt-2"
                >
                  <option value="">Senza categoria</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Durata (minuti)
                <input
                  required
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  className="input-base mt-2"
                />
              </label>
              <label className="text-sm">
                Prezzo (€)
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input-base mt-2"
                />
              </label>
              <label className="text-sm">
                Immagine (URL)
                <input
                  type="text"
                  maxLength={500}
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input-base mt-2"
                />
              </label>
              <label className="text-sm">
                Ordine di visualizzazione
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="input-base mt-2"
                />
              </label>
            </div>

            <label className="block text-sm">
              Descrizione
              <textarea
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-base mt-2"
              />
            </label>

            <fieldset className="flex flex-wrap gap-6 rounded-md bg-secondary/50 p-5 text-sm">
              <legend className="px-1 text-xs tracking-[0.16em] uppercase text-muted-foreground">
                Disponibilità e pubblicazione
              </legend>
              <Check
                label="Pubblicato sul sito"
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Check
                label="Prenotabile online"
                checked={form.isBookable}
                onChange={(v) => setForm({ ...form, isBookable: v })}
              />
              <Check
                label="In evidenza in home"
                checked={form.isFeatured}
                onChange={(v) => setForm({ ...form, isFeatured: v })}
              />
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveServiceMutation.isPending}
                className="min-h-11 rounded-md bg-primary px-6 text-sm text-primary-foreground disabled:opacity-60"
              >
                {saveServiceMutation.isPending ? "Salvataggio…" : "Salva trattamento"}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="min-h-11 rounded-md border border-border px-6 text-sm"
              >
                Annulla
              </button>
            </div>
          </form>
        </section>
      )}

      {form?.id && (
        <AvailabilityEditor
          key={form.id}
          serviceId={form.id}
          rules={data.availability.filter((a) => a.service_id === form.id)}
          staff={data.staff}
          enabledStaffIds={data.serviceStaff
            .filter((x) => x.service_id === form.id)
            .map((x) => x.staff_id)}
        />
      )}
    </div>
  );
}

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs ${on ? "bg-accent/20 text-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}
