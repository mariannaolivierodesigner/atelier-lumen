import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Plus, RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import { customersQuery, formatDate } from "@/lib/crm-query";
import {
  addCustomerNote,
  deleteCustomer,
  eraseCustomerData,
  exportCustomerData,
  importCustomersFromBookings,
  saveCustomer,
} from "@/lib/crm.functions";
import { workspaceQuery, STATUS_LABEL, dayFmt, timeFmt } from "@/lib/admin-query";
import type { BookingStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/gestionale/clienti")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(customersQuery);
  },
  component: Crm,
});

type FormState = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  notes: string;
  tags: string;
  marketingConsent: boolean;
  privacyConsent: boolean;
};

const EMPTY: FormState = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  notes: "",
  tags: "",
  marketingConsent: false,
  privacyConsent: false,
};

function Crm() {
  const { data } = useSuspenseQuery(customersQuery);
  const { data: workspace } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [search, setSearch] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const save = useServerFn(saveCustomer);
  const remove = useServerFn(deleteCustomer);
  const addNote = useServerFn(addCustomerNote);
  const importFromBookings = useServerFn(importCustomersFromBookings);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  };

  const saveMutation = useMutation({
    mutationFn: save,
    onSuccess: (res) => {
      refresh();
      setForm(null);
      setSelectedId(res.id);
      toast.success("Scheda cliente salvata");
    },
    onError: () => toast.error("Salvataggio non riuscito"),
  });

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      refresh();
      setSelectedId(null);
      toast.success("Scheda eliminata");
    },
    onError: () => toast.error("Eliminazione non consentita"),
  });

  const noteMutation = useMutation({
    mutationFn: addNote,
    onSuccess: () => {
      refresh();
      setNoteBody("");
      toast.success("Nota aggiunta");
    },
    onError: () => toast.error("Nota non salvata"),
  });

  const importMutation = useMutation({
    mutationFn: () => importFromBookings(),
    onSuccess: (res) => {
      refresh();
      toast.success(
        res.created > 0
          ? `${res.created} nuove schede create dalle prenotazioni`
          : "Nessuna nuova scheda da importare",
      );
    },
    onError: () => toast.error("Importazione non riuscita"),
  });

  const term = search.trim().toLowerCase();
  const customers = data.customers.filter((c) =>
    term ? `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(term) : true,
  );

  const selected = data.customers.find((c) => c.id === selectedId) ?? null;
  const notes = data.notes.filter((n) => n.customer_id === selectedId);
  const serviceById = new Map(workspace.services.map((s) => [s.id, s]));
  const history = workspace.bookings
    .filter((b) => selected && b.customer_email?.toLowerCase() === selected.email?.toLowerCase())
    .slice()
    .reverse();

  function startEdit(customer?: (typeof data.customers)[number]) {
    setForm(
      customer
        ? {
            id: customer.id,
            fullName: customer.full_name,
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            birthDate: customer.birth_date ?? "",
            notes: customer.notes ?? "",
            tags: (customer.tags ?? []).join(", "),
            marketingConsent: customer.marketing_consent,
            privacyConsent: customer.privacy_consent,
          }
        : EMPTY,
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="mt-3 text-4xl">Schede cliente</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.customers.length} clienti · {data.customers.filter((c) => c.marketing_consent).length}{" "}
            con consenso marketing
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => importMutation.mutate(undefined)}
            disabled={importMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Importa da prenotazioni
          </button>
          <button
            onClick={() => startEdit()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuovo cliente
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <label className="sr-only" htmlFor="cerca-cliente">
            Cerca cliente
          </label>
          <input
            id="cerca-cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email o telefono"
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          />
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {customers.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">
                Nessun cliente. Importa le schede dalle prenotazioni oppure creane una nuova.
              </li>
            )}
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setSelectedId(c.id);
                    setForm(null);
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50 ${
                    selectedId === c.id ? "bg-accent/60" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm">{c.full_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.email ?? c.phone ?? "Nessun contatto"}
                    </span>
                  </span>
                  {c.marketing_consent && (
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-[0.7rem] whitespace-nowrap">
                      Marketing
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-background p-6">
          {form ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({
                  data: {
                    id: form.id,
                    fullName: form.fullName,
                    email: form.email,
                    phone: form.phone,
                    birthDate: form.birthDate,
                    notes: form.notes,
                    tags: form.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                    marketingConsent: form.marketingConsent,
                    privacyConsent: form.privacyConsent,
                  },
                });
              }}
            >
              <h2 className="text-2xl">{form.id ? "Modifica scheda" : "Nuovo cliente"}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome e cognome" required>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="input-base"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-base"
                  />
                </Field>
                <Field label="Telefono">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-base"
                  />
                </Field>
                <Field label="Data di nascita">
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="input-base"
                  />
                </Field>
              </div>
              <Field label="Tag (separati da virgola)">
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="viso, abbonamento, VIP"
                  className="input-base"
                />
              </Field>
              <Field label="Note interne">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-base"
                />
              </Field>
              <div className="space-y-2 rounded-md border border-border p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">Consensi</p>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.privacyConsent}
                    onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                  />
                  Informativa privacy accettata
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.marketingConsent}
                    onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })}
                  />
                  Consenso a comunicazioni marketing
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-60"
                >
                  Salva scheda
                </button>
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-md border border-border px-5 py-2.5 text-sm"
                >
                  Annulla
                </button>
              </div>
            </form>
          ) : selected ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl">{selected.full_name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.email ?? "—"} · {selected.phone ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cliente dal {formatDate(selected.created_at)} · Nascita{" "}
                    {formatDate(selected.birth_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selected)}
                    className="rounded-md border border-border px-4 py-2.5 text-sm"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ data: { id: selected.id } })}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Elimina
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(selected.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-md bg-secondary px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
                <span className="rounded-md bg-secondary px-3 py-1 text-xs">
                  Privacy: {selected.privacy_consent ? "sì" : "no"}
                </span>
                <span className="rounded-md bg-secondary px-3 py-1 text-xs">
                  Marketing: {selected.marketing_consent ? "sì" : "no"}
                </span>
              </div>

              {selected.notes && (
                <p className="rounded-md bg-secondary/60 p-4 text-sm">{selected.notes}</p>
              )}

              <section className="space-y-3">
                <h3 className="text-xs tracking-wide text-muted-foreground uppercase">
                  Storico trattamenti
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun appuntamento registrato.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {history.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <span className="text-sm">
                          {serviceById.get(b.service_id ?? "")?.name ?? "Trattamento"}
                          <span className="block text-xs text-muted-foreground">
                            {dayFmt.format(new Date(b.starts_at))} ·{" "}
                            {timeFmt.format(new Date(b.starts_at))}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs tracking-wide text-muted-foreground uppercase">
                  Note e interazioni
                </h3>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    noteMutation.mutate({ data: { customerId: selected.id, body: noteBody } });
                  }}
                >
                  <input
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Aggiungi una nota…"
                    className="input-base flex-1"
                  />
                  <button
                    type="submit"
                    disabled={noteBody.trim().length < 2 || noteMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-60"
                  >
                    Aggiungi
                  </button>
                </form>
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-md border border-border px-4 py-3 text-sm">
                      {n.body}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {n.author_name ?? "Staff"} · {formatDate(n.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seleziona un cliente per vedere scheda, storico e note.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}
