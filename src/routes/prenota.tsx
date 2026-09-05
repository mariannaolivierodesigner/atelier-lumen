import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { createBooking } from "@/lib/booking.functions";
import { PageHeader } from "@/components/site/Section";
import {
  SLOTS,
  allowedStaffFor,
  bookableDays,
  buildAlternatives,
  closuresForLocation,
  isClosedOn,
  nextDays,
  slotsForDay,
  toUtcISO,
  ymd,
} from "@/lib/availability";

export const Route = createFileRoute("/prenota")({
  head: () => ({
    meta: [
      { title: "Prenota online — Atelier Lumen" },
      {
        name: "description",
        content:
          "Prenota il tuo trattamento in quattro passaggi: sede, trattamento e operatore, data e ora, conferma.",
      },
      { property: "og:title", content: "Prenota online — Atelier Lumen" },
      { property: "og:description", content: "Quattro passaggi, meno di un minuto." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Prenota,
});

const STEPS = ["Sede", "Trattamento", "Data e ora", "Conferma"] as const;

function Prenota() {
  const { data } = useSuspenseQuery(siteQuery);
  const submit = useServerFn(createBooking);

  const [step, setStep] = useState(0);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [rejection, setRejection] = useState<{ code: string; message: string } | null>(null);
  const [done, setDone] = useState(false);

  const rawDays = useMemo(() => nextDays(21), []);
  const bookableServices = useMemo(
    () => data.services.filter((s) => s.is_bookable),
    [data.services],
  );
  const service = data.services.find((s) => s.id === serviceId) ?? null;
  const location = data.locations.find((l) => l.id === locationId) ?? null;

  /** Chiusure straordinarie e ferie che riguardano la sede scelta. */
  const closures = useMemo(
    () => closuresForLocation(data.closures, locationId),
    [data.closures, locationId],
  );

  const upcomingClosures = useMemo(() => {
    const today = ymd(new Date());
    return closures.filter((c) => c.end_date >= today).slice(0, 3);
  }, [closures]);

  /** Regole giorno/orario del trattamento scelto. Nessuna regola = sempre disponibile. */
  const rules = useMemo(
    () => data.availability.filter((a) => a.service_id === serviceId),
    [data.availability, serviceId],
  );

  /** Operatori abilitati al trattamento. Nessuna abilitazione = tutti. */
  const allowedStaff = useMemo(
    () => allowedStaffFor(data.staff, data.serviceStaff, serviceId),
    [data.staff, data.serviceStaff, serviceId],
  );

  const staff = allowedStaff.find((p) => p.id === staffId) ?? null;

  const days = useMemo(
    () => bookableDays(rawDays, rules, closures).slice(0, 8),
    [rawDays, rules, closures],
  );

  const slots = useMemo(() => {
    if (!day || !service) return SLOTS;
    if (isClosedOn(closures, day)) return [];
    return slotsForDay(rules, day, service.duration_minutes);
  }, [day, rules, service, closures]);

  /** Prime combinazioni giorno/orario realmente erogabili per il trattamento scelto. */
  const alternatives = useMemo(
    () =>
      service ? buildAlternatives(rawDays, rules, closures, service.duration_minutes) : [],
    [rawDays, rules, closures, service],
  );

  function chooseService(id: string) {
    setRejection(null);
    setServiceId(id);
    setDay(null);
    setSlot(null);
    setStaffId(null);
  }

  const canContinue = [!!locationId, !!serviceId, !!day && !!slot, true][step];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !serviceId || !day || !slot || !service) return;
    setSending(true);
    setRejection(null);
    try {
      const result = await submit({
        data: {
          locationId,
          serviceId,
          staffId,
          startsAt: new Date(`${day}T${slot}:00`).toISOString(),
          durationMinutes: service.duration_minutes,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          notes: form.notes,
        },
      });
      if (!result.ok) {
        setRejection({ code: result.code, message: result.message });
        toast.error(result.message);
        if (result.code === "availability" || result.code === "date" || result.code === "closure")
          setStep(2);
        if (result.code === "staff" || result.code === "service") setStep(1);
        return;
      }
      setDone(true);
    } catch {
      setRejection({
        code: "unknown",
        message: "Non siamo riusciti a registrare la richiesta. Riprova o contattaci.",
      });
      toast.error("Non siamo riusciti a registrare la richiesta. Riprova.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="shell flex min-h-[60dvh] max-w-xl flex-col items-center justify-center py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent/25">
          <Check className="size-6 text-clay" />
        </span>
        <h1 className="mt-8 text-4xl">Richiesta inviata</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Ti abbiamo riservato {service?.name} il{" "}
          {day && new Date(day).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} alle{" "}
          {slot} presso {location?.name}. Riceverai la conferma via email.
        </p>
        <Link to="/" className="mt-8 rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Prenotazione" title="Quattro passaggi" />

      <div className="shell max-w-3xl pb-24">
        <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-5">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={`text-xs tracking-[0.16em] uppercase ${i === step ? "text-foreground" : "text-muted-foreground"}`}
            >
              {String(i + 1).padStart(2, "0")} {s}
            </li>
          ))}
        </ol>

        {rejection && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-6"
          >
            <p className="text-base">Prenotazione non confermata</p>
            <p className="mt-2 text-sm text-muted-foreground">{rejection.message}</p>

            {(rejection.code === "availability" ||
              rejection.code === "date" ||
              rejection.code === "closure") &&
              (alternatives.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm">Prime disponibilità per {service?.name}:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alternatives.map((a) => (
                      <button
                        key={`${a.day}-${a.slot}`}
                        type="button"
                        onClick={() => {
                          setDay(a.day);
                          setSlot(a.slot);
                          setRejection(null);
                          setStep(3);
                        }}
                        className="min-h-11 rounded-md border border-border bg-background px-4 py-2 text-sm hover:border-foreground/40"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nessuna disponibilità nelle prossime settimane:{" "}
                  <Link to="/contatti" className="underline underline-offset-4">
                    scrivici
                  </Link>{" "}
                  per un appuntamento su misura.
                </p>
              ))}

            {rejection.code === "staff" && (
              <div className="mt-4">
                <p className="text-sm">Operatori abilitati a questo trattamento:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffId(null);
                      setRejection(null);
                      setStep(3);
                    }}
                    className="min-h-11 rounded-full border border-border bg-background px-4 py-2 text-sm"
                  >
                    Nessuna preferenza
                  </button>
                  {allowedStaff.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setStaffId(p.id);
                        setRejection(null);
                        setStep(3);
                      }}
                      className="min-h-11 rounded-full border border-border bg-background px-4 py-2 text-sm hover:border-foreground/40"
                    >
                      {p.full_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rejection.code === "service" && (
              <p className="mt-4 text-sm text-muted-foreground">
                Scegli un altro trattamento tra quelli prenotabili online.
              </p>
            )}
          </div>
        )}

        <div className="mt-10">
          {step === 0 && (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-5 text-2xl">Scegli la sede</legend>
              {data.locations.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocationId(l.id)}
                  className={`rounded-lg border p-6 text-left transition-colors ${locationId === l.id ? "border-accent bg-accent/10" : "border-border hover:border-foreground/30"}`}
                >
                  <p className="text-lg">{l.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {l.address}, {l.city}
                  </p>
                </button>
              ))}
            </fieldset>
          )}

          {step === 1 && (
            <div className="space-y-10">
              <fieldset>
                <legend className="mb-5 text-2xl">Scegli il trattamento</legend>
                <div className="space-y-3">
                  {bookableServices.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => chooseService(s.id)}
                      className={`flex w-full flex-wrap items-baseline justify-between gap-3 rounded-lg border p-5 text-left transition-colors ${serviceId === s.id ? "border-accent bg-accent/10" : "border-border hover:border-foreground/30"}`}
                    >
                      <span className="text-lg">{s.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {s.duration_minutes}′ · {formatPrice(s.price_cents)}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 text-lg">Operatore (facoltativo)</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffId(null)}
                    className={`rounded-full border px-4 py-2 text-sm ${staffId === null ? "border-accent bg-accent/10" : "border-border"}`}
                  >
                    Nessuna preferenza
                  </button>
                  {allowedStaff.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStaffId(p.id)}
                      className={`rounded-full border px-4 py-2 text-sm ${staffId === p.id ? "border-accent bg-accent/10" : "border-border"}`}
                    >
                      {p.full_name}
                    </button>
                  ))}
                </div>
                {serviceId && allowedStaff.length < data.staff.length && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Solo questi operatori sono abilitati al trattamento scelto.
                  </p>
                )}
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10">
              <fieldset>
                <legend className="mb-5 text-2xl">Scegli il giorno</legend>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const value = ymd(d);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setDay(value);
                          setSlot(null);
                        }}
                        className={`min-h-11 rounded-md border px-4 py-2 text-sm ${day === value ? "border-accent bg-accent/10" : "border-border"}`}
                      >
                        {d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                      </button>
                    );
                  })}
                  {days.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nessun giorno disponibile per questo trattamento nelle prossime settimane.
                      Contattaci per un appuntamento su misura.
                    </p>
                  )}
                </div>
                {upcomingClosures.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Chiusure previste:{" "}
                    {upcomingClosures
                      .map((c) => {
                        const from = new Date(`${c.start_date}T00:00:00`).toLocaleDateString(
                          "it-IT",
                          { day: "numeric", month: "short" },
                        );
                        const to = new Date(`${c.end_date}T00:00:00`).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                        });
                        return `${c.reason} (${from === to ? from : `${from} – ${to}`})`;
                      })
                      .join(" · ")}
                    .
                  </p>
                )}
                {rules.length > 0 && days.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Mostriamo solo i giorni in cui il trattamento è erogabile.
                  </p>
                )}
              </fieldset>

              <fieldset>
                <legend className="mb-5 text-2xl">Scegli l'orario</legend>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`min-h-11 min-w-20 rounded-md border px-4 py-2 text-sm ${slot === s ? "border-accent bg-accent/10" : "border-border"}`}
                    >
                      {s}
                    </button>
                  ))}
                  {day && slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nessun orario disponibile in questa giornata: scegli un altro giorno.
                    </p>
                  )}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg bg-secondary/60 p-6 text-sm">
                <p className="text-lg">{service?.name}</p>
                <p className="mt-2 text-muted-foreground">
                  {location?.name} ·{" "}
                  {day && new Date(day).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} alle {slot}
                  {staff ? ` · ${staff.full_name}` : ""}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm">
                  Nome e cognome
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 text-base"
                  />
                </label>
                <label className="block text-sm">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 text-base"
                  />
                </label>
              </div>

              <label className="block text-sm">
                Telefono
                <input
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 text-base"
                />
              </label>

              <label className="block text-sm">
                Note per l'operatore
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 text-base"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-md bg-primary px-7 py-4 text-sm text-primary-foreground disabled:opacity-60"
              >
                {sending ? "Invio in corso…" : "Conferma prenotazione"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden /> Indietro
          </button>
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canContinue}
              className="rounded-md bg-primary px-7 py-3 text-sm text-primary-foreground disabled:opacity-40"
            >
              Continua
            </button>
          )}
        </div>
      </div>
    </>
  );
}
