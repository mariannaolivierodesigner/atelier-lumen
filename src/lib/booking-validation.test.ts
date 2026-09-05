import { describe, expect, it } from "vitest";

import { describeBookingError } from "@/lib/booking.functions";
import { availabilityInputSchema, closureInputSchema } from "@/lib/catalog.server";

const SERVICE = "11111111-1111-4111-8111-111111111111";
const STAFF = "22222222-2222-4222-8222-222222222222";

describe("validazione delle regole salvate dal gestionale", () => {
  it("accetta fasce valide e non sovrapposte", () => {
    const parsed = availabilityInputSchema.safeParse({
      serviceId: SERVICE,
      rules: [
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "14:00", endTime: "19:00" },
      ],
      staffIds: [STAFF],
    });
    expect(parsed.success).toBe(true);
  });

  it("rifiuta fasce sovrapposte nello stesso giorno", () => {
    const parsed = availabilityInputSchema.safeParse({
      serviceId: SERVICE,
      rules: [
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "12:30", endTime: "19:00" },
      ],
      staffIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rifiuta un orario di fine precedente all'inizio", () => {
    expect(
      availabilityInputSchema.safeParse({
        serviceId: SERVICE,
        rules: [{ weekday: 3, startTime: "18:00", endTime: "09:00" }],
        staffIds: [],
      }).success,
    ).toBe(false);
  });

  it("rifiuta formati orari non validi e giorni fuori scala", () => {
    expect(
      availabilityInputSchema.safeParse({
        serviceId: SERVICE,
        rules: [{ weekday: 1, startTime: "9:00", endTime: "13:00" }],
        staffIds: [],
      }).success,
    ).toBe(false);
    expect(
      availabilityInputSchema.safeParse({
        serviceId: SERVICE,
        rules: [{ weekday: 7, startTime: "09:00", endTime: "13:00" }],
        staffIds: [],
      }).success,
    ).toBe(false);
  });
});

describe("validazione delle chiusure", () => {
  it("accetta un intervallo di un solo giorno", () => {
    expect(
      closureInputSchema.safeParse({
        startDate: "2026-08-15",
        endDate: "2026-08-15",
        reason: "Ferragosto",
      }).success,
    ).toBe(true);
  });

  it("rifiuta un intervallo invertito o un motivo mancante", () => {
    expect(
      closureInputSchema.safeParse({
        startDate: "2026-08-20",
        endDate: "2026-08-10",
        reason: "Ferie",
      }).success,
    ).toBe(false);
    expect(
      closureInputSchema.safeParse({
        startDate: "2026-08-10",
        endDate: "2026-08-20",
        reason: "",
      }).success,
    ).toBe(false);
  });
});

describe("messaggi di rifiuto al momento della prenotazione", () => {
  const cases: [string, string][] = [
    ["Il centro è chiuso in questa data", "closure"],
    ["Il trattamento non è disponibile in questo giorno o orario", "availability"],
    ["Operatore non abilitato a questo trattamento", "staff"],
    ["Operatore non valido", "staff"],
    ["Data non valida", "date"],
    ["Trattamento non valido", "service"],
    ["Sede non valida", "location"],
    ["Email non valida", "data"],
    ["Telefono non valido", "data"],
    ["qualcosa è andato storto", "unknown"],
  ];

  it.each(cases)("traduce «%s» nel codice %s", (raw, code) => {
    const result = describeBookingError(raw);
    expect(result.code).toBe(code);
    expect(result.message.length).toBeGreaterThan(10);
  });
});
