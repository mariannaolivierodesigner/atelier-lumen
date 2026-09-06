import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_TENANT = "atelier-lumen";

export type BookingStatus =
  "pending" | "confirmed" | "rejected" | "completed" | "cancelled" | "no_show";

/**
 * Dati operativi del back office per il centro dell'utente autenticato.
 * Le policy RLS garantiscono che si vedano solo le prenotazioni del proprio centro.
 */
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", DEFAULT_TENANT)
      .maybeSingle();
    if (!tenant) throw new Error("Centro non trovato");

    let { data: membership } = await supabase
      .from("tenant_users")
      .select("id, role, full_name, staff_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    // Demo: il primo utente che accede diventa titolare del centro.
    // I successivi devono essere invitati da un titolare.
    if (!membership) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("tenant_users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);

      if ((count ?? 0) === 0) {
        const { data: created } = await supabaseAdmin
          .from("tenant_users")
          .insert({ user_id: userId, tenant_id: tenant.id, role: "owner" })
          .select("id, role, full_name, staff_id")
          .maybeSingle();
        membership = created ?? null;
      }
    }

    if (!membership) {
      return { tenant, membership: null, bookings: [], services: [], staff: [], locations: [] };
    }

    const [bookings, services, staff, locations] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, customer_name, customer_email, customer_phone, starts_at, duration_minutes, status, notes, service_id, staff_id, location_id",
        )
        .eq("tenant_id", tenant.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, price_cents, duration_minutes")
        .eq("tenant_id", tenant.id)
        .order("sort_order"),
      supabase
        .from("staff")
        .select("id, full_name, role_title")
        .eq("tenant_id", tenant.id)
        .order("sort_order"),
      supabase
        .from("locations")
        .select("id, name, city")
        .eq("tenant_id", tenant.id)
        .order("sort_order"),
    ]);

    return {
      tenant,
      membership,
      bookings: bookings.data ?? [],
      services: services.data ?? [],
      staff: staff.data ?? [],
      locations: locations.data ?? [],
    };
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "rejected", "completed", "cancelled", "no_show"]),
});

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

const rescheduleSchema = z.object({
  id: z.string().uuid(),
  startsAt: z.string().min(10),
  staffId: z.string().uuid().nullable(),
});

export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rescheduleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ starts_at: data.startsAt, staff_id: data.staffId })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
