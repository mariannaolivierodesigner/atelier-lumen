import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import { absenceInputSchema, idSchema } from "./catalog.server";

/** Assenze dello staff (ferie, malattia, permessi) del centro. */
export const getStaffAbsences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) return { absences: [] };

    const { data, error } = await context.supabase
      .from("staff_absences")
      .select("id, staff_id, start_date, end_date, reason")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: true });
    if (error) {
      console.error("[staff_absences]", error);
      throw new Error("Non siamo riusciti a caricare le assenze.");
    }
    return { absences: data ?? [] };
  });

/** Crea o aggiorna un'assenza. */
export const saveStaffAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => absenceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      staff_id: data.staffId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason.trim(),
    };

    if (data.id) {
      const { tenant_id: _t, ...update } = payload;
      const { error } = await context.supabase
        .from("staff_absences")
        .update(update)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("staff_absences")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina un'assenza. */
export const deleteStaffAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff_absences").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
