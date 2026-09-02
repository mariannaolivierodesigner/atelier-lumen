import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTenantId } from "./crm.server";
import {
  availabilityInputSchema,
  catalogImportSchema,
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

/** Storico delle modifiche al listino: chi ha cambiato cosa e quando. */
export const getCatalogAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) return { entries: [] };

    const { data, error } = await context.supabase
      .from("catalog_audit_log")
      .select("id, entity_type, entity_id, entity_label, action, changes, actor_name, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.error("[catalog-audit]", error);
      throw new Error("Non siamo riusciti a caricare lo storico modifiche.");
    }
    return { entries: data ?? [] };
  });

/** Importa o aggiorna in blocco i trattamenti del listino da un file CSV. */
export const importCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => catalogImportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const [existingServices, existingCategories] = await Promise.all([
      context.supabase.from("services").select("id, name").eq("tenant_id", tenantId),
      context.supabase.from("service_categories").select("id, name").eq("tenant_id", tenantId),
    ]);
    if (existingServices.error) throw existingServices.error;
    if (existingCategories.error) throw existingCategories.error;

    const key = (value: string) => value.trim().toLowerCase();
    const serviceByName = new Map(
      (existingServices.data ?? []).map((s) => [key(s.name), s.id] as const),
    );
    const categoryByName = new Map(
      (existingCategories.data ?? []).map((c) => [key(c.name), c.id] as const),
    );

    let created = 0;
    let updated = 0;
    let categoriesCreated = 0;
    const errors: string[] = [];

    for (const row of data.rows) {
      try {
        let categoryId: string | null | undefined;
        if (row.categoryName && row.categoryName.trim()) {
          const name = row.categoryName.trim();
          categoryId = categoryByName.get(key(name)) ?? null;
          if (!categoryId) {
            const inserted = await context.supabase
              .from("service_categories")
              .insert({
                tenant_id: tenantId,
                name,
                slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
                sort_order: 0,
                is_active: true,
              })
              .select("id")
              .single();
            if (inserted.error) throw inserted.error;
            categoryId = inserted.data.id;
            categoryByName.set(key(name), categoryId);
            categoriesCreated += 1;
          }
        }

        const existingId = serviceByName.get(key(row.name));
        const fields: Record<string, unknown> = {};
        if (categoryId !== undefined) fields["category_id"] = categoryId;
        if (row.description !== undefined) fields["description"] = row.description || null;
        if (row.durationMinutes !== undefined) fields["duration_minutes"] = row.durationMinutes;
        if (row.priceCents !== undefined) fields["price_cents"] = row.priceCents;
        if (row.sortOrder !== undefined) fields["sort_order"] = row.sortOrder;
        if (row.isActive !== undefined) fields["is_active"] = row.isActive;
        if (row.isBookable !== undefined) fields["is_bookable"] = row.isBookable;
        if (row.isFeatured !== undefined) fields["is_featured"] = row.isFeatured;

        if (existingId) {
          if (Object.keys(fields).length === 0) continue;
          const { error } = await context.supabase
            .from("services")
            .update(fields)
            .eq("id", existingId)
            .eq("tenant_id", tenantId);
          if (error) throw error;
          updated += 1;
          continue;
        }

        if (!data.createMissing) {
          errors.push(`${row.name}: trattamento non presente a listino`);
          continue;
        }

        const inserted = await context.supabase
          .from("services")
          .insert({
            tenant_id: tenantId,
            name: row.name,
            slug: `${slugify(row.name)}-${Math.random().toString(36).slice(2, 6)}`,
            category_id: (categoryId ?? null) as string | null,
            description: row.description || null,
            duration_minutes: row.durationMinutes ?? 60,
            price_cents: row.priceCents ?? 0,
            sort_order: row.sortOrder ?? 0,
            is_active: row.isActive ?? true,
            is_bookable: row.isBookable ?? true,
            is_featured: row.isFeatured ?? false,
          })
          .select("id")
          .single();
        if (inserted.error) throw inserted.error;
        serviceByName.set(key(row.name), inserted.data.id);
        created += 1;
      } catch (error) {
        console.error("[catalog-import]", error);
        errors.push(`${row.name}: riga non importata`);
      }
    }

    return { created, updated, categoriesCreated, errors };
  });
