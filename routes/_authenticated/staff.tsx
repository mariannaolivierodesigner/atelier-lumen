import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Download, FileText, ShieldCheck, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addPatientDocument,
  deletePatientDocument,
  listAgenda,
  listMessages,
  listPatientDocuments,
  listPatients,
  setAppointmentStatus,
} from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";
import { BlockedSlotsManager } from "@/components/site/BlockedSlotsManager";
import { ShiftsManager } from "@/components/site/ShiftsManager";
import { StaffCalendar } from "@/components/site/StaffCalendar";
import { useRoles, useSession } from "@/hooks/useAuth";
import { STATUS_LABEL, formatDate, formatPrice, formatTime, isoDay } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Gestionale studio — Studio Evergreen" },
      {
        name: "description",
        content: "Agenda giornaliera, anagrafica pazienti e messaggi in arrivo per lo staff.",
      },
      { property: "og:title", content: "Gestionale — Studio Evergreen" },
      { property: "og:description", content: "Agenda, pazienti e messaggi." },
      { property: "og:url", content: "/staff" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "/staff" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: StaffPage,
});

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

const DOCUMENT_KINDS = ["referto", "radiografia", "piano", "preventivo", "altro"] as const;
const DOCUMENT_KIND_LABEL: Record<(typeof DOCUMENT_KINDS)[number], string> = {
  referto: "Referto",
  radiografia: "Radiografia",
  piano: "Piano di cura",
  preventivo: "Preventivo",
  altro: "Altro",
};

function StaffPage() {
  const { user } = useSession();
  const { isStaff, isAdmin, isPending } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const [day, setDay] = useState(isoDay(new Date()));
  const [docPatientId, setDocPatientId] = useState<string>("");
  const [docTitle, setDocTitle] = useState("");
  const [docKind, setDocKind] = useState<(typeof DOCUMENT_KINDS)[number]>("referto");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAgenda = useServerFn(listAgenda);
  const fetchPatients = useServerFn(listPatients);
  const fetchMessages = useServerFn(listMessages);
  const fetchPatientDocuments = useServerFn(listPatientDocuments);
  const registerDocument = useServerFn(addPatientDocument);
  const removeDocument = useServerFn(deletePatientDocument);
  const updateStatus = useServerFn(setAppointmentStatus);

  const agenda = useQuery({
    queryKey: ["agenda", day],
    enabled: isStaff,
    queryFn: () =>
      fetchAgenda({ data: { from: `${day}T00:00:00Z`, to: `${day}T23:59:59Z` } }),
  });
  const patients = useQuery({
    queryKey: ["staff-patients"],
    enabled: isStaff,
    queryFn: () => fetchPatients(),
  });
  const messages = useQuery({
    queryKey: ["staff-messages"],
    enabled: isStaff,
    queryFn: () => fetchMessages(),
  });
  const patientDocuments = useQuery({
    queryKey: ["staff-patient-documents", docPatientId],
    enabled: isStaff && !!docPatientId,
    queryFn: () => fetchPatientDocuments({ data: { patientId: docPatientId } }),
  });

  const statusMutation = useMutation({
    mutationFn: updateStatus,
    onSuccess: () => {
      toast.success("Stato aggiornato.");
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
    onError: () => toast.error("Aggiornamento non riuscito."),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!docPatientId || !docFile || !docTitle.trim()) {
        throw new Error("Compila paziente, titolo e file prima di caricare.");
      }
      setIsUploading(true);
      const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${docPatientId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, docFile, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      await registerDocument({
        data: { patientId: docPatientId, title: docTitle.trim(), kind: docKind, filePath: path },
      });
    },
    onSuccess: () => {
      toast.success("Documento caricato.");
      setDocTitle("");
      setDocFile(null);
      queryClient.invalidateQueries({ queryKey: ["staff-patient-documents", docPatientId] });
    },
    onError: (e: Error) => toast.error(e.message || "Caricamento non riuscito."),
    onSettled: () => setIsUploading(false),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => removeDocument({ data: { id } }),
    onSuccess: () => {
      toast.success("Documento eliminato.");
      queryClient.invalidateQueries({ queryKey: ["staff-patient-documents", docPatientId] });
    },
    onError: () => toast.error("Eliminazione non riuscita."),
  });

  function shiftDay(delta: number) {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDay(isoDay(d));
  }

  if (!isPending && !isStaff) {
    return (
      <SiteLayout>
        <PageHeader
          title="Area riservata allo staff"
          description="Il tuo account non ha i permessi per accedere al gestionale."
        />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Gestionale"
        title="Agenda dello studio"
        description="Conferma gli appuntamenti, consulta l'anagrafica e rispondi ai messaggi in arrivo."
      />

      <div className="mx-auto max-w-6xl px-5 py-12">
        {isAdmin ? (
          <div className="mb-6">
            <Button asChild variant="outline">
              <Link to="/staff-ruoli">
                <ShieldCheck /> Gestisci ruoli e permessi
              </Link>
            </Button>
          </div>
        ) : null}
        <Tabs defaultValue="agenda">
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="pazienti">Pazienti</TabsTrigger>
            <TabsTrigger value="documenti">Documenti</TabsTrigger>
            <TabsTrigger value="indisponibilita">Ferie e permessi</TabsTrigger>
            <TabsTrigger value="turni">Turni</TabsTrigger>
            <TabsTrigger value="messaggi">Messaggi</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Giorno precedente"
                onClick={() => shiftDay(-1)}
              >
                <ChevronLeft />
              </Button>
              <p className="font-display flex-1 text-lg font-semibold capitalize">
                {formatDate(`${day}T12:00:00`)}
              </p>
              <Button
                variant="outline"
                size="icon"
                aria-label="Giorno successivo"
                onClick={() => shiftDay(1)}
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="mt-6">
              {agenda.isPending ? (
                <Skeleton className="h-40 w-full rounded-3xl" />
              ) : (agenda.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun appuntamento in questa data.</p>
              ) : (
                <ul className="space-y-3">
                  {(agenda.data ?? []).map((a) => (
                    <li key={a.id} className="surface-card flex flex-wrap items-center gap-4 p-5">
                      <span className="font-display w-20 text-lg font-semibold">
                        {formatTime(a.starts_at)}
                      </span>
                      <div className="min-w-52 flex-1">
                        <p className="font-medium">{a.profiles?.full_name}</p>
                        <p className="text-muted-foreground text-sm">
                          {a.services?.name} · {a.doctors?.full_name}
                        </p>
                        {a.patient_note && (
                          <p className="text-muted-foreground mt-1 text-xs italic">
                            “{a.patient_note}”
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">{STATUS_LABEL[a.status]}</Badge>
                      <Select
                        value={a.status}
                        onValueChange={(value) =>
                          statusMutation.mutate({
                            data: { id: a.id, status: value as (typeof STATUSES)[number] },
                          })
                        }
                      >
                        <SelectTrigger className="w-44" aria-label="Cambia stato">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <StaffCalendar />
          </TabsContent>

          <TabsContent value="pazienti" className="mt-6">
            {patients.isPending ? (
              <Skeleton className="h-40 w-full rounded-3xl" />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {(patients.data ?? []).map((p) => (
                  <li key={p.id} className="surface-card p-5">
                    <p className="font-semibold">{p.full_name}</p>
                    <p className="text-muted-foreground text-sm">
                      {p.email ?? "—"} · {p.phone ?? "—"}
                    </p>
                    {p.allergies?.length ? (
                      <p className="text-destructive mt-2 text-xs">
                        Allergie: {p.allergies.join(", ")}
                      </p>
                    ) : null}
                    {p.conditions?.length ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Condizioni: {p.conditions.join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="documenti" className="mt-6 space-y-6">
            <div className="surface-card space-y-4 p-6">
              <div>
                <Label htmlFor="doc-patient">Paziente</Label>
                <Select value={docPatientId} onValueChange={setDocPatientId}>
                  <SelectTrigger id="doc-patient" className="mt-2">
                    <SelectValue placeholder="Scegli un paziente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(patients.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {docPatientId ? (
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    uploadDocumentMutation.mutate();
                  }}
                >
                  <div>
                    <Label htmlFor="doc-title">Titolo</Label>
                    <Input
                      id="doc-title"
                      className="mt-2"
                      placeholder="Es. Referto igiene dentale"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-kind">Tipo</Label>
                    <Select
                      value={docKind}
                      onValueChange={(v) => setDocKind(v as (typeof DOCUMENT_KINDS)[number])}
                    >
                      <SelectTrigger id="doc-kind" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {DOCUMENT_KIND_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="doc-file">File (PDF, JPG, PNG…)</Label>
                    <Input
                      id="doc-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                      className="mt-2"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={isUploading}>
                      <Upload /> {isUploading ? "Caricamento…" : "Carica documento"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Scegli un paziente per vedere e caricare i suoi documenti.
                </p>
              )}
            </div>

            {docPatientId ? (
              patientDocuments.isPending ? (
                <Skeleton className="h-24 w-full rounded-3xl" />
              ) : (patientDocuments.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nessun documento caricato per questo paziente.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {(patientDocuments.data ?? []).map((d) => (
                    <li key={d.id} className="surface-card flex items-center gap-4 p-5">
                      <span className="bg-primary-soft text-primary grid h-10 w-10 place-items-center rounded-2xl">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{d.title}</p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {DOCUMENT_KIND_LABEL[d.kind as (typeof DOCUMENT_KINDS)[number]] ?? d.kind}
                          {" · "}
                          {formatDate(d.created_at)}
                        </p>
                      </div>
                      {d.file_url ? (
                        <Button variant="ghost" size="icon" aria-label={`Scarica ${d.title}`} asChild>
                          <a href={d.file_url} target="_blank" rel="noreferrer">
                            <Download />
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Elimina ${d.title}`}
                        onClick={() => {
                          if (confirm(`Eliminare il documento "${d.title}"?`))
                            deleteDocumentMutation.mutate(d.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </TabsContent>

          <TabsContent value="indisponibilita" className="mt-6">
            <BlockedSlotsManager />
          </TabsContent>

          <TabsContent value="turni" className="mt-6">
            <ShiftsManager />
          </TabsContent>

          <TabsContent value="messaggi" className="mt-6">
            {messages.isPending ? (
              <Skeleton className="h-40 w-full rounded-3xl" />
            ) : (messages.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessun messaggio ricevuto.</p>
            ) : (
              <ul className="space-y-3">
                {(messages.data ?? []).map((m) => (
                  <li key={m.id} className="surface-card p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{m.name}</p>
                      <span className="text-muted-foreground text-sm">{m.email}</span>
                      {m.phone ? (
                        <a
                          href={`tel:${m.phone}`}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          {m.phone}
                        </a>
                      ) : null}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-muted-foreground mt-10 text-xs">
          Fatturato indicativo di giornata:{" "}
          {formatPrice(
            (agenda.data ?? []).reduce((sum, a) => sum + (a.services?.price_cents ?? 0), 0),
          )}
        </p>
      </div>
    </SiteLayout>
  );
}