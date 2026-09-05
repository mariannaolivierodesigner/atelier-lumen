import { describe, expect, it } from "vitest";

import {
  allowedStaffFor,
  bookableDays,
  buildAlternatives,
  closuresForLocation,
  hasOverlappingRules,
  isClosedOn,
  nextDays,
  rulesOverlap,
  slotsForDay,
  timezoneOffsetMinutes,
  toMinutes,
  toUtcISO,
  weekdayOf,
  ymd,
} from "@/lib/availability";

const rule = (weekday: number, start_time: string, end_time: string) => ({
  weekday,
  start_time,
  end_time,
});

describe("conversioni di base", () => {
  it("converte orari con e senza secondi", () => {
    expect(toMinutes("09:00")).toBe(540);
    expect(toMinutes("09:30:00")).toBe(570);
    expect(toMinutes("00:00")).toBe(0);
  });

  it("calcola il giorno della settimana senza slittamenti di fuso", () => {
    expect(weekdayOf("2026-09-05")).toBe(6); // sabato
    expect(weekdayOf("2026-09-06")).toBe(0); // domenica
    expect(weekdayOf("2026-01-01")).toBe(4);
  });

  it("formatta la data locale senza passare da UTC", () => {
    expect(ymd(new Date(2026, 2, 29, 23, 30))).toBe("2026-03-29");
    expect(ymd(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

describe("sovrapposizioni delle fasce orarie", () => {
  it("rileva fasce che si accavallano nello stesso giorno", () => {
    expect(rulesOverlap(rule(2, "09:00", "13:00"), rule(2, "12:00", "18:00"))).toBe(true);
  });

  it("considera valide fasce contigue e giorni diversi", () => {
    expect(rulesOverlap(rule(2, "09:00", "13:00"), rule(2, "13:00", "18:00"))).toBe(false);
    expect(rulesOverlap(rule(2, "09:00", "18:00"), rule(3, "09:00", "18:00"))).toBe(false);
  });

  it("rileva una fascia interamente contenuta in un'altra", () => {
    expect(
      hasOverlappingRules([rule(4, "09:00", "19:00"), rule(4, "10:00", "11:00")]),
    ).toBe(true);
  });

  it("accetta un insieme di fasce disgiunte", () => {
    expect(
      hasOverlappingRules([
        rule(1, "09:00", "13:00"),
        rule(1, "14:00", "19:00"),
        rule(2, "09:00", "13:00"),
      ]),
    ).toBe(false);
  });
});

describe("slot compatibili con le regole", () => {
  const rules = [rule(6, "09:00", "13:00"), rule(6, "15:00", "19:00")];

  it("senza regole propone tutti gli slot", () => {
    expect(slotsForDay([], "2026-09-05", 60).length).toBeGreaterThan(0);
  });

  it("esclude gli slot in cui il trattamento non finirebbe dentro la fascia", () => {
    // sabato 5 settembre 2026, trattamento da 90 minuti
    expect(slotsForDay(rules, "2026-09-05", 90)).toEqual(["09:00", "16:00"]);
  });

  it("con trattamenti brevi apre più slot", () => {
    expect(slotsForDay(rules, "2026-09-05", 30)).toEqual(["09:00", "10:30", "12:00", "16:00", "17:30"]);
  });

  it("non propone slot in un giorno senza regole", () => {
    expect(slotsForDay(rules, "2026-09-07", 60)).toEqual([]); // lunedì
  });

  it("rispetta il limite esatto di fine fascia", () => {
    expect(slotsForDay([rule(6, "09:00", "10:00")], "2026-09-05", 60)).toEqual(["09:00"]);
    expect(slotsForDay([rule(6, "09:00", "09:59")], "2026-09-05", 60)).toEqual([]);
  });
});

describe("chiusure e ferie", () => {
  const closures = [
    { location_id: null, start_date: "2026-08-10", end_date: "2026-08-20" },
    { location_id: "sede-b", start_date: "2026-09-07", end_date: "2026-09-07" },
  ];

  it("include gli estremi del periodo", () => {
    expect(isClosedOn(closures, "2026-08-10")).toBe(true);
    expect(isClosedOn(closures, "2026-08-20")).toBe(true);
    expect(isClosedOn(closures, "2026-08-21")).toBe(false);
  });

  it("filtra le chiusure per sede", () => {
    const forA = closuresForLocation(closures, "sede-a");
    expect(forA).toHaveLength(1);
    expect(isClosedOn(forA, "2026-09-07")).toBe(false);
    const forB = closuresForLocation(closures, "sede-b");
    expect(isClosedOn(forB, "2026-09-07")).toBe(true);
  });

  it("esclude i giorni chiusi dai giorni prenotabili", () => {
    const days = [new Date(2026, 7, 19), new Date(2026, 7, 21)];
    expect(bookableDays(days, [], closures).map(ymd)).toEqual(["2026-08-21"]);
  });
});

describe("giorni proposti e alternative", () => {
  it("propone solo giorni futuri e mai la domenica", () => {
    const days = nextDays(21, new Date(2026, 8, 5));
    expect(days).toHaveLength(21);
    expect(days.every((d) => d.getDay() !== 0)).toBe(true);
    expect(ymd(days[0]!)).toBe("2026-09-07");
  });

  it("propone alternative valide per regole, chiusure e durata", () => {
    const days = nextDays(21, new Date(2026, 8, 5));
    const rules = [rule(1, "09:00", "13:00")]; // solo lunedì mattina
    const closures = [{ location_id: null, start_date: "2026-09-07", end_date: "2026-09-07" }];
    const alt = buildAlternatives(days, rules, closures, 90, 4);
    expect(alt.length).toBeGreaterThan(0);
    expect(alt.every((a) => weekdayOf(a.day) === 1)).toBe(true);
    expect(alt.some((a) => a.day === "2026-09-07")).toBe(false);
    expect(alt.every((a) => ["09:00", "10:30"].includes(a.slot))).toBe(true);
  });

  it("senza regole propone comunque delle alternative", () => {
    const alt = buildAlternatives(nextDays(21, new Date(2026, 8, 5)), [], [], 60, 6);
    expect(alt).toHaveLength(6);
  });
});

describe("operatori abilitati", () => {
  const staff = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];

  it("mostra solo gli operatori abilitati al trattamento", () => {
    const link = [{ service_id: "svc", staff_id: "s2" }];
    expect(allowedStaffFor(staff, link, "svc").map((s) => s.id)).toEqual(["s2"]);
  });

  it("senza abilitazioni configurate restano tutti disponibili", () => {
    expect(allowedStaffFor(staff, [], "svc")).toHaveLength(3);
    expect(allowedStaffFor(staff, [{ service_id: "altro", staff_id: "s1" }], "svc")).toHaveLength(3);
  });
});

describe("fuso orario e cambi d'ora", () => {
  it("usa l'ora solare in inverno (UTC+1)", () => {
    expect(toUtcISO("2026-01-15", "09:00")).toBe("2026-01-15T08:00:00.000Z");
    expect(timezoneOffsetMinutes(new Date("2026-01-15T08:00:00Z"))).toBe(60);
  });

  it("usa l'ora legale in estate (UTC+2)", () => {
    expect(toUtcISO("2026-07-15", "09:00")).toBe("2026-07-15T07:00:00.000Z");
    expect(timezoneOffsetMinutes(new Date("2026-07-15T07:00:00Z"))).toBe(120);
  });

  it("gestisce il passaggio all'ora legale (29 marzo 2026)", () => {
    expect(toUtcISO("2026-03-28", "09:00")).toBe("2026-03-28T08:00:00.000Z");
    expect(toUtcISO("2026-03-29", "09:00")).toBe("2026-03-29T07:00:00.000Z");
  });

  it("gestisce il ritorno all'ora solare (25 ottobre 2026)", () => {
    expect(toUtcISO("2026-10-24", "09:00")).toBe("2026-10-24T07:00:00.000Z");
    expect(toUtcISO("2026-10-25", "09:00")).toBe("2026-10-25T08:00:00.000Z");
  });

  it("il risultato non dipende dal fuso del dispositivo", () => {
    const original = process.env["TZ"];
    process.env["TZ"] = "America/New_York";
    expect(toUtcISO("2026-07-15", "09:00")).toBe("2026-07-15T07:00:00.000Z");
    process.env["TZ"] = original;
  });
});
