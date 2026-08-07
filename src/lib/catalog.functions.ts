import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import {
  availabilityInputSchema,
  categoryInputSchema,
  idSchema,
  serviceInputSchema,
  slugify,
} from "./catalog.server";

/** Listino completo del centro: categorie, trattamenti e regole di disponibilità. */
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId)
      return { categories: [], services: [], staff: [], availability: [], serviceStaff: [] };

    const [categories, services, staff, availability, serviceStaff] = await Promise.all([
      context.supabase
        .from("service_categories")
        .select("id, name, slug, description, sort_order, is_active")
        .eq("tenant_id", tenantId)
        .order("sort_order"),
      context.supabase
        .from("services")
        .select(
          "id, category_id, name, slug, description, duration_minutes, price_cents, image_url, sort_order, is_active, is_bookable, is_featured",
        )
        .eq("tenant_id", tenantId)
        .order("sort_order"),
      context.supabase
        .from("staff")
        .select("id, full_name, role_title")
        .eq("tenant_id", tenantId)
        .order("sort_order"),
      context.supabase
        .from("service_availability")
        .select("id, service_id, weekday, start_time, end_time")
        .eq("tenant_id", tenantId)
        .order("weekday"),
      context.supabase
        .from("service_staff")
        .select("service_id, staff_id")
        .eq("tenant_id", tenantId),
    ]);

    if (categories.error || services.error) {
      console.error("[catalog]", categories.error, services.error);
      throw new Error("Non siamo riusciti a caricare il listino.");
    }

    return {
      categories: categories.data ?? [],
      services: services.data ?? [],
      staff: staff.data ?? [],
      availability: availability.data ?? [],
      serviceStaff: serviceStaff.data ?? [],
    };
  });

/** Sostituisce le regole di disponibilità e gli operatori abilitati di un trattamento. */
export const saveServiceAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => availabilityInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const owned = await context.supabase
      .from("services")
      .select("id")
      .eq("id", data.serviceId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (owned.error) throw owned.error;
    if (!owned.data) throw new Error("Trattamento non trovato");

    const wipeRules = await context.supabase
      .from("service_availability")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("service_id", data.serviceId);
    if (wipeRules.error) throw wipeRules.error;

    if (data.rules.length) {
      const { error } = await context.supabase.from("service_availability").insert(
        data.rules.map((r) => ({
          tenant_id: tenantId,
          service_id: data.serviceId,
          weekday: r.weekday,
          start_time: r.startTime,
          end_time: r.endTime,
        })),
      );
      if (error) throw error;
    }

    const wipeStaff = await context.supabase
      .from("service_staff")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("service_id", data.serviceId);
    if (wipeStaff.error) throw wipeStaff.error;

    if (data.staffIds.length) {
      const { error } = await context.supabase.from("service_staff").insert(
        data.staffIds.map((staffId) => ({
          tenant_id: tenantId,
          service_id: data.serviceId,
          staff_id: staffId,
        })),
      );
      if (error) throw error;
    }

    return { ok: true as const };
  });

/** Crea o aggiorna un trattamento del listino. */
export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => serviceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      category_id: data.categoryId || null,
      name: data.name,
      slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`,
      description: data.description || null,
      duration_minutes: data.durationMinutes,
      price_cents: data.priceCents,
      image_url: data.imageUrl || null,
      sort_order: data.sortOrder,
      is_active: data.isActive,
      is_bookable: data.isBookable,
      is_featured: data.isFeatured,
    };

    if (data.id) {
      const { slug: _slug, tenant_id: _tenant, ...update } = payload;
      const { error } = await context.supabase
        .from("services")
        .update(update)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina un trattamento (solo titolari e responsabili). */
export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Crea o aggiorna una categoria del listino. */
export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categoryInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      name: data.name,
      slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`,
      description: data.description || null,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };

    if (data.id) {
      const { slug: _slug, tenant_id: _tenant, ...update } = payload;
      const { error } = await context.supabase
        .from("service_categories")
        .update(update)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("service_categories")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina una categoria (solo titolari e responsabili). */
export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("service_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
