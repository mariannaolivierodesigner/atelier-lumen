import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import { closureInputSchema, idSchema } from "./catalog.server";

/** Chiusure straordinarie e ferie del centro. */
export const getClosures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) return { closures: [] };

    const { data, error } = await context.supabase
      .from("closures")
      .select("id, location_id, start_date, end_date, reason, notes")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: true });
    if (error) {
      console.error("[closures]", error);
      throw new Error("Non siamo riusciti a caricare le chiusure.");
    }
    return { closures: data ?? [] };
  });

/** Crea o aggiorna una chiusura. */
export const saveClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => closureInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      location_id: data.locationId || null,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || null,
    };

    if (data.id) {
      const { tenant_id: _t, ...update } = payload;
      const { error } = await context.supabase
        .from("closures")
        .update(update)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("closures")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina una chiusura (solo titolari e responsabili). */
export const deleteClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("closures").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
