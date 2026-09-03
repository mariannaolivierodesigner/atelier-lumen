import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const bookingSchema = z.object({
  locationId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  startsAt: z.string().min(10),
  durationMinutes: z.number().int().min(10).max(480),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingRejection = {
  code: "availability" | "staff" | "date" | "service" | "location" | "data" | "unknown";
  message: string;
};

/** Traduce l'errore della procedura di prenotazione in un messaggio chiaro per il cliente. */
function describeBookingError(raw: string): BookingRejection {
  const text = raw.toLowerCase();
  if (text.includes("non \u00e8 disponibile in questo giorno")) {
    return {
      code: "availability",
      message:
        "Questo trattamento non viene erogato nel giorno o nell'orario scelto: scegli una delle disponibilit\u00e0 qui sotto.",
    };
  }
  if (text.includes("operatore non abilitato")) {
    return {
      code: "staff",
      message:
        "L'operatore selezionato non esegue questo trattamento: scegli uno dei professionisti abilitati.",
    };
  }
  if (text.includes("operatore non valido")) {
    return { code: "staff", message: "L'operatore selezionato non \u00e8 pi\u00f9 disponibile." };
  }
  if (text.includes("data non valida")) {
    return {
      code: "date",
      message: "La data scelta non \u00e8 pi\u00f9 prenotabile: seleziona un nuovo giorno.",
    };
  }
  if (text.includes("trattamento non valido")) {
    return {
      code: "service",
      message: "Questo trattamento non \u00e8 pi\u00f9 prenotabile online.",
    };
  }
  if (text.includes("sede non valida")) {
    return { code: "location", message: "La sede selezionata non \u00e8 pi\u00f9 attiva." };
  }
  if (text.includes("nome non valido") || text.includes("email non valida") || text.includes("telefono non valido") || text.includes("note troppo lunghe")) {
    return { code: "data", message: "Controlla i dati di contatto inseriti: alcuni non sono validi." };
  }
  return {
    code: "unknown",
    message: "Non siamo riusciti a registrare la richiesta. Riprova o contattaci.",
  };
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await supabase.rpc("request_booking", {
      _tenant_slug: "atelier-lumen",
      _location_id: data.locationId,
      _service_id: data.serviceId,
      _staff_id: data.staffId as unknown as string,
      _starts_at: data.startsAt,
      _customer_name: data.customerName,
      _customer_email: data.customerEmail,
      ...(data.customerPhone ? { _customer_phone: data.customerPhone } : {}),
      ...(data.notes ? { _notes: data.notes } : {}),
    });
    if (error) {
      console.error("[booking] request_booking failed", error);
      return { ok: false as const, ...describeBookingError(error.message ?? "") };
    }

    return { ok: true as const };
  });
