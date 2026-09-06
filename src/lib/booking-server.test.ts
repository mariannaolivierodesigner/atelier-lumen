/**
 * Test di integrazione: verifica che la validazione lato server (procedura
 * `request_booking`) rifiuti davvero le richieste non conformi alle regole.
 * Vengono provate solo richieste che devono essere respinte: nessun dato viene creato.
 * Se le variabili del backend non sono disponibili i test vengono saltati.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { describeBookingError } from "@/lib/booking.functions";
import { toUtcISO } from "@/lib/availability";

const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const key =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

const ZERO = "00000000-0000-4000-8000-000000000000";

function client() {
  return createClient(url!, key!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key!.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key!);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function attempt(overrides: Record<string, unknown>) {
  const { error } = await client().rpc("request_booking", {
    _tenant_slug: "atelier-lumen",
    _location_id: ZERO,
    _service_id: ZERO,
    _staff_id: null,
    _starts_at: toUtcISO("2027-01-11", "10:00"),
    _customer_name: "Test Automatico",
    _customer_email: "test@example.com",
    ...overrides,
  });
  return error ? describeBookingError(error.message) : null;
}

describe.skipIf(!url || !key)("validazione lato server al momento della prenotazione", () => {
  it("rifiuta un centro inesistente", async () => {
    const r = await attempt({ _tenant_slug: "centro-che-non-esiste" });
    expect(r).not.toBeNull();
  });

  it("rifiuta una sede non valida", async () => {
    const r = await attempt({});
    expect(r?.code).toBe("location");
  });

  it("rifiuta una data nel passato", async () => {
    const r = await attempt({ _starts_at: "2020-01-01T09:00:00.000Z" });
    expect(r?.code).toBe("date");
  });

  it("rifiuta dati di contatto non validi", async () => {
    const r = await attempt({ _customer_email: "non-una-email" });
    expect(r?.code).toBe("data");
  });

  it("rifiuta un trattamento inesistente su una sede reale", async () => {
    const supabase = client();
    const { data: locations } = await supabase
      .from("locations")
      .select("id")
      .eq("is_active", true)
      .limit(1);
    const locationId = locations?.[0]?.id;
    if (!locationId) return;
    const r = await attempt({ _location_id: locationId });
    expect(r?.code).toBe("service");
  });

  it("rifiuta una prenotazione in un giorno di chiusura", async () => {
    const supabase = client();
    const [{ data: locations }, { data: services }, { data: closures }] = await Promise.all([
      supabase.from("locations").select("id").eq("is_active", true).limit(1),
      supabase.from("services").select("id").eq("is_bookable", true).eq("is_active", true).limit(1),
      supabase.from("closures").select("location_id,start_date,end_date").limit(20),
    ]);
    const locationId = locations?.[0]?.id;
    const serviceId = services?.[0]?.id;
    const closure = closures?.find(
      (c) => (!c.location_id || c.location_id === locationId) && c.start_date >= "2026-01-01",
    );
    if (!locationId || !serviceId || !closure) return; // nessuna chiusura configurata
    const r = await attempt({
      _location_id: locationId,
      _service_id: serviceId,
      _starts_at: toUtcISO(closure.start_date, "10:00"),
    });
    expect(r?.code).toBe("closure");
  });
});
