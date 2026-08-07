import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { siteQuery, formatPrice } from "@/lib/site-query";
import { createBooking } from "@/lib/booking.functions";
import { PageHeader } from "@/components/site/Section";

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
const SLOTS = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00"];

/** Converte "HH:MM" o "HH:MM:SS" in minuti dalla mezzanotte. */
function toMinutes(value: string) {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function nextDays(count: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 1; out.length < count; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    if (day.getDay() !== 0) out.push(day);
  }
  return out;
}

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
  const [done, setDone] = useState(false);

  const allDays = useMemo(() => nextDays(21), []);
  const bookableServices = useMemo(
    () => data.services.filter((s) => s.is_bookable),
    [data.services],
  );
  const service = data.services.find((s) => s.id === serviceId) ?? null;
  const location = data.locations.find((l) => l.id === locationId) ?? null;

  /** Regole giorno/orario del trattamento scelto. Nessuna regola = sempre disponibile. */
  const rules = useMemo(
    () => data.availability.filter((a) => a.service_id === serviceId),
    [data.availability, serviceId],
  );

  /** Operatori abilitati al trattamento. Nessuna abilitazione = tutti. */
  const allowedStaff = useMemo(() => {
    if (!serviceId) return data.staff;
    const ids = data.serviceStaff
      .filter((x) => x.service_id === serviceId)
      .map((x) => x.staff_id);
    return ids.length ? data.staff.filter((p) => ids.includes(p.id)) : data.staff;
  }, [data.staff, data.serviceStaff, serviceId]);

  const staff = allowedStaff.find((p) => p.id === staffId) ?? null;

  const days = useMemo(() => {
    const filtered = rules.length
      ? allDays.filter((d) => rules.some((r) => r.weekday === d.getDay()))
      : allDays;
    return filtered.slice(0, 8);
  }, [allDays, rules]);

  const slots = useMemo(() => {
    if (!day || !service) return SLOTS;
    if (!rules.length) return SLOTS;
    const weekday = new Date(`${day}T00:00:00`).getDay();
    const dayRules = rules.filter((r) => r.weekday === weekday);
    return SLOTS.filter((s) => {
      const start = toMinutes(s);
      const end = start + service.duration_minutes;
      return dayRules.some(
        (r) => toMinutes(r.start_time) <= start && toMinutes(r.end_time) >= end,
      );
    });
  }, [day, rules, service]);

  function chooseService(id: string) {
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
    try {
      await submit({
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
      setDone(true);
    } catch {
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
                      onClick={() => setServiceId(s.id)}
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
                  {data.staff.map((p) => (
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
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10">
              <fieldset>
                <legend className="mb-5 text-2xl">Scegli il giorno</legend>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const value = d.toISOString().slice(0, 10);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDay(value)}
                        className={`min-h-11 rounded-md border px-4 py-2 text-sm ${day === value ? "border-accent bg-accent/10" : "border-border"}`}
                      >
                        {d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-5 text-2xl">Scegli l'orario</legend>
                <div className="flex flex-wrap gap-2">
                  {SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`min-h-11 min-w-20 rounded-md border px-4 py-2 text-sm ${slot === s ? "border-accent bg-accent/10" : "border-border"}`}
                    >
                      {s}
                    </button>
                  ))}
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
