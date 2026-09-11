import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import { idSchema } from "./catalog.server";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido");

export const shiftInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    staffId: z.string().uuid(),
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((s) => s.endTime > s.startTime, {
    message: "L'orario di fine deve seguire quello di inizio",
    path: ["endTime"],
  });

/** Turni settimanali dello staff del centro. */
export const getStaffShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) return { shifts: [] };

    const { data, error } = await context.supabase
      .from("staff_shifts")
      .select("id, staff_id, weekday, start_time, end_time")
      .eq("tenant_id", tenantId)
      .order("weekday")
      .order("start_time");
    if (error) {
      console.error("[staff_shifts]", error);
      throw new Error("Non siamo riusciti a caricare i turni.");
    }
    return { shifts: data ?? [] };
  });

/** Crea o aggiorna un turno. */
export const saveStaffShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => shiftInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      staff_id: data.staffId,
      weekday: data.weekday,
      start_time: data.startTime,
      end_time: data.endTime,
    };

    if (data.id) {
      const { tenant_id: _t, ...update } = payload;
      const { error } = await context.supabase
        .from("staff_shifts")
        .update(update)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("staff_shifts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina un turno. */
export const deleteStaffShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff_shifts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
