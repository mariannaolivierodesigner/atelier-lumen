import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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
          "Prenota il tuo trattamento in pochi passaggi: trattamento e operatore, data e ora, conferma.",
      },
      { property: "og:title", content: "Prenota online — Atelier Lumen" },
      { property: "og:description", content: "Pochi passaggi, meno di un minuto." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Prenota,
});

const STEPS = ["Sede", "Trattamento", "Data e ora", "Conferma"] as const;

function Prenota() {
  const { data } = useSuspenseQuery(siteQuery);
  const submit = useServerFn(createBooking);

  // Se il centro ha una sola sede, la selezioniamo da sola e saltiamo
  // il passaggio "Scegli la sede": non ha senso far scegliere qualcosa
  // quando c'è una sola opzione possibile.
  const singleLocation = data.locations.length === 1 ? data.locations[0] : null;
  const firstStep = singleLocation ? 1 : 0;
  const visibleSteps = singleLocation ? STEPS.slice(1) : STEPS;

  const [step, setStep] = useState(firstStep);
  const [locationId, setLocationId] = useState<string | null>(
    singleLocation ? singleLocation.id : null,
  );
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [rejection, setRejection] = useState<{ code: string; message: string } | null>(null);
  const [done, setDone] = useState(false);

  // Su mobile, dopo "Continua"/"Indietro" la pagina resta scrollata dov'era
  // (vicino ai bottoni di navigazione, in fondo): il nuovo step appare sopra,
  // fuori dallo schermo, e l'utente non se ne accorge. Riportiamo la pagina
  // in cima a ogni cambio di step così il nuovo contenuto è sempre visibile.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const rawDays = useMemo(() => nextDays(21), []);
  const bookableServices = useMemo(
    () => data.services.filter((s) => s.is_bookable),
    [data.services],
  );
  const location = data.locations.find((l) => l.id === locationId) ?? null;
  const selectedServices = useMemo(
    () => data.services.filter((s) => serviceIds.includes(s.id)),
    [data.services, serviceIds],
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price_cents, 0);
  const treatmentsLabel = selectedServices.map((s) => s.name).join(" + ");

  /** Chiusure straordinarie e ferie che riguardano la sede scelta. */
  const closures = useMemo(
    () => closuresForLocation(data.closures, locationId),
    [data.closures, locationId],
  );

  const upcomingClosures = useMemo(() => {
    const today = ymd(new Date());
    return closures.filter((c) => c.end_date >= today).slice(0, 3);
  }, [closures]);

  /**
   * Regole giorno/orario di OGNI trattamento scelto. Con più trattamenti insieme,
   * un giorno/orario è valido solo se lo è per tutti i trattamenti richiesti
   * (si eseguono uno di seguito all'altro, per la durata totale): calcoliamo
   * quindi giorni e orari validi trattamento per trattamento, poi teniamo solo
   * l'intersezione — riusando la stessa logica già testata per un trattamento solo.
   */
  const rulesPerService = useMemo(
    () => selectedServices.map((s) => data.availability.filter((a) => a.service_id === s.id)),
    [data.availability, selectedServices],
  );
  const rules = useMemo(() => rulesPerService[0] ?? [], [rulesPerService]);

  /** Operatori abilitati a TUTTI i trattamenti scelti (nessun trattamento scelto = nessun vincolo). */
  const allowedStaff = useMemo(() => {
    const byService = (() => {
      if (selectedServices.length === 0)
        return allowedStaffFor(data.staff, data.serviceStaff, null);
      const perService = selectedServices.map((s) =>
        allowedStaffFor(data.staff, data.serviceStaff, s.id),
      );
      return perService.reduce((acc, list) => acc.filter((p) => list.some((x) => x.id === p.id)));
    })();

    // Finché non è stato scelto un giorno, non possiamo ancora sapere chi è
    // assente o fuori turno quel giorno specifico: mostriamo tutti quelli
    // abilitati al trattamento, il filtro si restringe non appena si sceglie
    // il giorno (stesso identico controllo che comunque avviene di nuovo,
    // in modo definitivo, sul server al momento della conferma).
    if (!day) return byService;

    const weekday = new Date(`${day}T12:00:00`).getDay();

    return byService.filter((p) => {
      const isAbsent = data.staffAbsences.some(
        (a) => a.staff_id === p.id && day >= a.start_date && day <= a.end_date,
      );
      if (isAbsent) return false;

      const shifts = data.staffShifts.filter((s) => s.staff_id === p.id);
      if (shifts.length === 0) return true; // nessun turno impostato = sempre disponibile
      return shifts.some((s) => s.weekday === weekday);
    });
  }, [data.staff, data.serviceStaff, data.staffAbsences, data.staffShifts, selectedServices, day]);

  const staff = allowedStaff.find((p) => p.id === staffId) ?? null;

  const days = useMemo(() => {
    if (rulesPerService.length === 0) return bookableDays(rawDays, [], closures).slice(0, 8);
    const perService = rulesPerService.map((r) => bookableDays(rawDays, r, closures));
    const intersected = perService.reduce((acc, list) =>
      acc.filter((d) => list.some((x) => ymd(x) === ymd(d))),
    );
    return intersected.slice(0, 8);
  }, [rawDays, rulesPerService, closures]);

  const slots = useMemo(() => {
    if (!day || selectedServices.length === 0) return SLOTS;
    if (isClosedOn(closures, day)) return [];
    const perService = rulesPerService.map((r) => slotsForDay(r, day, totalDuration));
    return perService.reduce((acc, list) => acc.filter((s) => list.includes(s)));
  }, [day, rulesPerService, selectedServices, totalDuration, closures]);

  /** Prime combinazioni giorno/orario realmente erogabili per il trattamento scelto.
   *  Con più trattamenti insieme, ci basiamo sul primo per suggerire alternative:
   *  un'approssimazione ragionevole, il vero controllo di validità resta comunque
   *  quello sull'intersezione fatto sopra (`days`/`slots`). */
  const alternatives = useMemo(
    () =>
      selectedServices.length > 0 ? buildAlternatives(rawDays, rules, closures, totalDuration) : [],
    [rawDays, rules, closures, selectedServices, totalDuration],
  );

  function toggleService(id: string) {
    setRejection(null);
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setDay(null);
    setSlot(null);
    setStaffId(null);
  }

  const canContinue = [!!locationId, serviceIds.length > 0, !!day && !!slot, true][step];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || serviceIds.length === 0 || !day || !slot) return;
    setSending(true);
    setRejection(null);
    try {
      const result = await submit({
        data: {
          locationId,
          serviceIds,
          staffId,
          startsAt: toUtcISO(day, slot),
          durationMinutes: totalDuration,
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
          Ti abbiamo riservato {treatmentsLabel} il{" "}
          {day && new Date(day).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} alle{" "}
          {slot} presso {location?.name}. Riceverai la conferma via email.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground"
        >
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Prenotazione"
        title={singleLocation ? "Tre passaggi" : "Quattro passaggi"}
      />

      <div className="shell max-w-3xl pb-24">
        <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-5">
          {visibleSteps.map((s, i) => {
            const realIndex = i + firstStep;
            return (
              <li
                key={s}
                aria-current={realIndex === step ? "step" : undefined}
                className={`text-xs tracking-[0.16em] uppercase ${realIndex === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {String(i + 1).padStart(2, "0")} {s}
              </li>
            );
          })}
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
                  <p className="text-sm">Prime disponibilità per {treatmentsLabel}:</p>
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
                <legend className="mb-5 text-2xl">Scegli uno o più trattamenti</legend>
                <div className="space-y-3">
                  {bookableServices.map((s) => {
                    const checked = serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleService(s.id)}
                        className={`flex w-full flex-wrap items-baseline justify-between gap-3 rounded-lg border p-5 text-left transition-colors ${checked ? "border-accent bg-accent/10" : "border-border hover:border-foreground/30"}`}
                      >
                        <span className="flex items-center gap-3 text-lg">
                          <span
                            aria-hidden="true"
                            className={`flex size-5 items-center justify-center rounded border ${checked ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                          >
                            {checked && <Check className="size-3.5" />}
                          </span>
                          {s.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {s.duration_minutes}′ · {formatPrice(s.price_cents)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedServices.length > 1 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Totale: {totalDuration}′ · {formatPrice(totalPrice)} per{" "}
                    {selectedServices.length} trattamenti
                  </p>
                )}
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
                {serviceIds.length > 0 && allowedStaff.length < data.staff.length && (
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
                        {d.toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
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
                <p className="text-lg">{treatmentsLabel}</p>
                {selectedServices.length > 1 && (
                  <p className="text-muted-foreground">
                    {totalDuration}′ complessivi · {formatPrice(totalPrice)}
                  </p>
                )}
                <p className="mt-2 text-muted-foreground">
                  {location?.name} ·{" "}
                  {day &&
                    new Date(day).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })}{" "}
                  alle {slot}
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

        {/* Su mobile resta agganciata in fondo allo schermo (comoda quando lo step
            ha molti orari e si scorre parecchio), su desktop torna al posto
            normale nel flusso della pagina, come prima. */}
        <div className="sticky bottom-0 z-10 mt-12 flex items-center justify-between border-t border-border bg-background/95 py-4 backdrop-blur sm:static sm:border-t-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(firstStep, s - 1))}
            disabled={step === firstStep}
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
