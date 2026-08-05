import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import {
  categoryInputSchema,
  idSchema,
  serviceInputSchema,
  slugify,
} from "./catalog.server";

/** Listino completo del centro: categorie e trattamenti, anche non pubblicati. */
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("[catalog] tenant non risolto");

    const [categories, services] = await Promise.all([
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
    ]);

    if (categories.error || services.error) {
      throw new Error(
        `[catalog] t=${tenantId} c=${categories.error?.message} s=${services.error?.message}`,
      );
    }
    return { categories: categories.data ?? [], services: services.data ?? [] };
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
