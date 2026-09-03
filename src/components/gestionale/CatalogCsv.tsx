import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

import { importCatalog } from "@/lib/catalog.functions";
import { downloadCsv, parseCsv, toCsv, type CsvRow } from "@/lib/csv";

type Service = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
  is_bookable: boolean;
  is_featured: boolean;
};

type Props = {
  services: Service[];
  categories: { id: string; name: string }[];
};

const HEADERS = [
  "nome",
  "categoria",
  "descrizione",
  "durata_minuti",
  "prezzo_eur",
  "pubblicato",
  "prenotabile",
  "in_evidenza",
  "ordinamento",
];

type ImportRow = {
  name: string;
  categoryName?: string;
  description?: string;
  durationMinutes?: number;
  priceCents?: number;
  sortOrder?: number;
  isActive?: boolean;
  isBookable?: boolean;
  isFeatured?: boolean;
};

function pick(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

function toBoolean(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["si", "sì", "true", "1", "x", "yes", "vero"].includes(normalized)) return true;
  if (["no", "false", "0", "falso"].includes(normalized)) return false;
  return undefined;
}

function toNumber(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapRows(rows: CsvRow[]): { rows: ImportRow[]; skipped: number } {
  const mapped: ImportRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = pick(row, "nome", "trattamento", "name", "servizio")?.trim();
    if (!name || name.length < 2) {
      skipped += 1;
      continue;
    }
    const duration = toNumber(pick(row, "durata_minuti", "durata", "minuti", "duration"));
    const price = toNumber(pick(row, "prezzo_eur", "prezzo", "price"));
    const sort = toNumber(pick(row, "ordinamento", "ordine", "sort"));
    const active = toBoolean(pick(row, "pubblicato", "attivo", "published"));
    const bookable = toBoolean(pick(row, "prenotabile", "bookable"));
    const featured = toBoolean(pick(row, "in_evidenza", "evidenza", "featured"));

    mapped.push({
      name,
      ...(pick(row, "categoria", "category")
        ? { categoryName: pick(row, "categoria", "category")!.trim() }
        : {}),
      ...(pick(row, "descrizione", "description")
        ? { description: pick(row, "descrizione", "description")! }
        : {}),
      ...(duration !== undefined ? { durationMinutes: Math.round(duration) } : {}),
      ...(price !== undefined ? { priceCents: Math.round(price * 100) } : {}),
      ...(sort !== undefined ? { sortOrder: Math.round(sort) } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(bookable !== undefined ? { isBookable: bookable } : {}),
      ...(featured !== undefined ? { isFeatured: featured } : {}),
    });
  }

  return { rows: mapped, skipped };
}

/** Importazione e aggiornamento massivo del listino tramite file CSV. */
export function CatalogCsv({ services, categories }: Props) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const runImport = useServerFn(importCatalog);

  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [createMissing, setCreateMissing] = useState(true);

  const categoryName = new Map(categories.map((c) => [c.id, c.name] as const));

  function exportCsv() {
    const rows = services.map((s) => [
      s.name,
      s.category_id ? (categoryName.get(s.category_id) ?? "") : "",
      s.description ?? "",
      s.duration_minutes,
      (s.price_cents / 100).toFixed(2).replace(".", ","),
      s.is_active ? "si" : "no",
      s.is_bookable ? "si" : "no",
      s.is_featured ? "si" : "no",
      s.sort_order,
    ]);
    downloadCsv("listino-beautyos.csv", toCsv(HEADERS, rows));
  }

  function downloadTemplate() {
    downloadCsv(
      "modello-listino.csv",
      toCsv(HEADERS, [["Massaggio relax", "Corpo", "60 minuti di puro relax", 60, "80,00", "si", "si", "no", 0]]),
    );
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = mapRows(parseCsv(text));
    if (!parsed.rows.length) {
      toast.error("Nessuna riga valida nel file: serve almeno la colonna “nome”");
      return;
    }
    setPreview(parsed.rows.slice(0, 500));
    setSkipped(parsed.skipped);
  }

  const importMutation = useMutation({
    mutationFn: (rows: ImportRow[]) => runImport({ data: { rows, createMissing } }),
    onSuccess: async (result) => {
      setPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["site"] }),
      ]);
      toast.success(
        `${result.created} creati · ${result.updated} aggiornati · ${result.categoriesCreated} nuove categorie`,
      );
      if (result.errors.length) toast.error(result.errors.slice(0, 3).join(" · "));
    },
    onError: () => toast.error("Importazione non riuscita"),
  });

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg">Import / export CSV</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Aggiorna prezzi, durata, categoria e pubblicazione in blocco. I trattamenti vengono
            abbinati per nome: quelli esistenti sono aggiornati, gli altri creati.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="min-h-11 rounded-md border border-border px-4 text-sm"
          >
            Modello CSV
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm"
          >
            <Download className="size-4" aria-hidden /> Esporta listino
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground"
          >
            <Upload className="size-4" aria-hidden /> Carica CSV
          </button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="File CSV del listino"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      {preview && (
        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {preview.length} righe pronte
              {skipped > 0 ? ` · ${skipped} righe ignorate (nome mancante)` : ""}
            </p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={createMissing}
                onChange={(event) => setCreateMissing(event.target.checked)}
              />
              Crea i trattamenti non presenti
            </label>
          </div>

          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-normal">Trattamento</th>
                  <th className="p-3 font-normal">Categoria</th>
                  <th className="p-3 font-normal">Durata</th>
                  <th className="p-3 font-normal">Prezzo</th>
                  <th className="p-3 font-normal">Pubblicato</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="border-t border-border">
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 text-muted-foreground">{row.categoryName ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.durationMinutes ? `${row.durationMinutes} min` : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.priceCents !== undefined
                        ? `${(row.priceCents / 100).toFixed(2).replace(".", ",")} €`
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.isActive === undefined ? "—" : row.isActive ? "Sì" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={importMutation.isPending}
              onClick={() => importMutation.mutate(preview)}
              className="min-h-11 rounded-md bg-primary px-5 text-sm text-primary-foreground disabled:opacity-60"
            >
              {importMutation.isPending ? "Importazione…" : "Conferma importazione"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="min-h-11 rounded-md border border-border px-5 text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
