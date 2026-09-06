import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { catalogAuditQuery } from "@/lib/catalog-query";

export const Route = createFileRoute("/_authenticated/gestionale/storico")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogAuditQuery);
  },
  head: () => ({
    meta: [
      { title: "Storico modifiche listino · Atelier Lumen" },
      {
        name: "description",
        content:
          "Log completo delle modifiche a trattamenti, categorie e disponibilità: autore, azione e data.",
      },
    ],
  }),
  component: StoricoPage,
});

const ENTITY_LABEL: Record<string, string> = {
  services: "Trattamento",
  service_categories: "Categoria",
  service_availability: "Disponibilità",
  service_staff: "Operatori abilitati",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Creazione",
  update: "Modifica",
  delete: "Eliminazione",
};

const FIELD_LABEL: Record<string, string> = {
  name: "Nome",
  slug: "Slug",
  description: "Descrizione",
  duration_minutes: "Durata (min)",
  price_cents: "Prezzo",
  image_url: "Immagine",
  is_active: "Pubblicato sul sito",
  is_bookable: "Prenotabile online",
  is_featured: "In evidenza",
  sort_order: "Ordinamento",
  category_id: "Categoria",
  weekday: "Giorno",
  start_time: "Dalle",
  end_time: "Alle",
  staff_id: "Operatore",
  service_id: "Trattamento",
};

const WEEKDAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

const stamp = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (field === "price_cents" && typeof value === "number")
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
      value / 100,
    );
  if (field === "weekday" && typeof value === "number") return WEEKDAYS[value] ?? String(value);
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

type Change = { field: string; from: unknown; to: unknown };

function StoricoPage() {
  const { data } = useSuspenseQuery(catalogAuditQuery);
  const [entity, setEntity] = useState("all");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.entries.filter((e) => {
      if (entity !== "all" && e.entity_type !== entity) return false;
      if (!needle) return true;
      return `${e.entity_label ?? ""} ${e.actor_name ?? ""}`.toLowerCase().includes(needle);
    });
  }, [data.entries, entity, query]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Tracciabilità</p>
        <h1 className="mt-2 text-3xl">Storico modifiche</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ogni intervento su trattamenti, categorie, orari di disponibilità e operatori abilitati
          viene registrato automaticamente con autore, data e valori modificati.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per elemento o autore"
          aria-label="Cerca nello storico"
          className="input-base w-72"
        />
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          aria-label="Filtra per tipo di elemento"
          className="input-base w-56"
        >
          <option value="all">Tutti gli elementi</option>
          {Object.entries(ENTITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "voce" : "voci"}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-8 text-sm text-muted-foreground">
          Nessuna modifica registrata con questi criteri.
        </p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => {
            const changes = (Array.isArray(entry.changes) ? entry.changes : []) as Change[];
            return (
              <li key={entry.id} className="rounded-lg border border-border bg-background p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-0.5 text-xs">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs tracking-[0.14em] uppercase text-muted-foreground">
                    {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type}
                  </span>
                  <span className="text-lg">{entry.entity_label ?? "Elemento rimosso"}</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {entry.actor_name ?? "Sistema"} · {stamp.format(new Date(entry.created_at))}
                  </span>
                </div>

                {changes.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {changes.map((c) => (
                      <li key={c.field} className="flex flex-wrap items-baseline gap-2">
                        <span className="min-w-44 text-muted-foreground">
                          {FIELD_LABEL[c.field] ?? c.field}
                        </span>
                        <span className="line-through opacity-60">
                          {formatValue(c.field, c.from)}
                        </span>
                        <span aria-hidden>→</span>
                        <span>{formatValue(c.field, c.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
