/**
 * Logica pura delle regole di disponibilità (giorni, fasce orarie, chiusure, fuso orario).
 * Vive fuori dai componenti così da essere condivisa e coperta da test automatici.
 */

export const BOOKING_TIMEZONE = "Europe/Rome";

/** Slot orari standard proposti dal wizard di prenotazione. */
export const SLOTS = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00"];

export type AvailabilityRule = {
  service_id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type Closure = {
  location_id?: string | null;
  start_date: string;
  end_date: string;
};

/** Converte "HH:MM" o "HH:MM:SS" in minuti dalla mezzanotte. */
export function toMinutes(value: string) {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

/** Data locale in formato ISO (YYYY-MM-DD), senza slittamenti di fuso. */
export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Giorno della settimana (0 = domenica) di una data "YYYY-MM-DD", senza slittamenti di fuso. */
export function weekdayOf(day: string) {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Prossimi `count` giorni prenotabili (esclude la domenica), a partire da domani. */
export function nextDays(count: number, from: Date = new Date()) {
  const out: Date[] = [];
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  for (let i = 1; out.length < count && i < count * 3 + 14; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    if (day.getDay() !== 0) out.push(day);
  }
  return out;
}

/** Chiusure che riguardano la sede scelta (quelle senza sede valgono per tutte). */
export function closuresForLocation<T extends Closure>(closures: T[], locationId?: string | null) {
  return closures.filter((c) => !c.location_id || !locationId || c.location_id === locationId);
}

/** Vero se la data (YYYY-MM-DD) cade dentro un periodo di chiusura, estremi inclusi. */
export function isClosedOn(closures: Closure[], day: string) {
  return closures.some((c) => day >= c.start_date && day <= c.end_date);
}

/** Slot compatibili con le regole del giorno e con la durata piena del trattamento. */
export function slotsForDay(
  rules: AvailabilityRule[],
  day: string,
  durationMinutes: number,
  slots: string[] = SLOTS,
) {
  if (!rules.length) return [...slots];
  const weekday = weekdayOf(day);
  const dayRules = rules.filter((r) => r.weekday === weekday);
  return slots.filter((s) => {
    const start = toMinutes(s);
    const end = start + durationMinutes;
    return dayRules.some(
      (r) => toMinutes(r.start_time) <= start && toMinutes(r.end_time) >= end,
    );
  });
}

/** Giorni realmente prenotabili: niente chiusure e coerenti con le regole del trattamento. */
export function bookableDays(
  days: Date[],
  rules: AvailabilityRule[],
  closures: Closure[],
) {
  return days.filter((d) => {
    if (isClosedOn(closures, ymd(d))) return false;
    if (!rules.length) return true;
    return rules.some((r) => r.weekday === d.getDay());
  });
}

/** Prime combinazioni giorno/orario davvero erogabili, da proporre come alternative. */
export function buildAlternatives(
  days: Date[],
  rules: AvailabilityRule[],
  closures: Closure[],
  durationMinutes: number,
  limit = 6,
) {
  const out: { day: string; slot: string; label: string }[] = [];
  for (const d of bookableDays(days, rules, closures)) {
    const day = ymd(d);
    for (const s of slotsForDay(rules, day, durationMinutes)) {
      out.push({
        day,
        slot: s,
        label: `${d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · ${s}`,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Operatori abilitati al trattamento. Nessuna abilitazione configurata = tutti. */
export function allowedStaffFor<T extends { id: string }>(
  staff: T[],
  serviceStaff: { service_id: string; staff_id: string }[],
  serviceId: string | null,
) {
  if (!serviceId) return staff;
  const ids = serviceStaff.filter((x) => x.service_id === serviceId).map((x) => x.staff_id);
  return ids.length ? staff.filter((p) => ids.includes(p.id)) : staff;
}

/** Due fasce dello stesso giorno si sovrappongono (contatto agli estremi escluso). */
export function rulesOverlap(a: AvailabilityRule, b: AvailabilityRule) {
  if (a.weekday !== b.weekday) return false;
  return (
    toMinutes(a.start_time) < toMinutes(b.end_time) &&
    toMinutes(b.start_time) < toMinutes(a.end_time)
  );
}

/** Vero se nell'insieme di regole esiste almeno una sovrapposizione. */
export function hasOverlappingRules(rules: AvailabilityRule[]) {
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a && b && rulesOverlap(a, b)) return true;
    }
  }
  return false;
}

/** Scostamento (in minuti) del fuso del centro rispetto a UTC in un dato istante. */
export function timezoneOffsetMinutes(instant: Date, timeZone = BOOKING_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000;
}

/**
 * Converte giorno + orario del centro (Europe/Rome) nell'istante UTC corrispondente,
 * indipendentemente dal fuso del dispositivo del cliente e gestendo i cambi d'ora.
 */
export function toUtcISO(day: string, slot: string, timeZone = BOOKING_TIMEZONE) {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  const [hh = 0, mm = 0] = slot.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  let ts = naive;
  for (let i = 0; i < 3; i++) {
    const offset = timezoneOffsetMinutes(new Date(ts), timeZone);
    const next = naive - offset * 60000;
    if (next === ts) break;
    ts = next;
  }
  return new Date(ts).toISOString();
}
