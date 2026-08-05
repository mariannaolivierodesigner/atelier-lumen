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
      _customer_phone: data.customerPhone || undefined,
      _notes: data.notes || undefined,
    });
    if (error) {
      console.error("[booking] request_booking failed", error);
      throw new Error("Non siamo riusciti a registrare la richiesta.");
    }

    return { ok: true as const };
  });
