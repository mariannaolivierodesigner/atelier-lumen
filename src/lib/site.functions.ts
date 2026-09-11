import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Lettura pubblica dei contenuti del tenant (sito vetrina).
 *
 * Usa la chiave publishable lato server: le policy `TO anon` espongono solo
 * i contenuti attivi/pubblicati. Nessun dato sensibile passa da qui.
 */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
}

/** Slug del tenant servito. In produzione deriva dal dominio richiesto. */
const DEFAULT_TENANT = "atelier-lumen";

export const getSite = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, slug, name, tagline, logo_url, theme, seo, modules, social")
    .eq("slug", DEFAULT_TENANT)
    .maybeSingle();

  if (error) throw error;
  if (!tenant) throw new Error("Tenant non trovato");

  const tenantId = tenant.id;

  const [
    locations,
    categories,
    services,
    staff,
    sections,
    posts,
    faqs,
    reviews,
    availability,
    serviceStaff,
    closures,
    staffShifts,
    staffAbsences,
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, address, city, postal_code, phone, email, opening_hours")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("service_categories")
      .select("id, slug, name, description")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("services")
      .select(
        "id, slug, name, description, duration_minutes, price_cents, image_url, is_featured, is_bookable, category_id",
      )
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("staff")
      .select("id, full_name, role_title, bio, specialties")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("site_sections")
      .select("key, content")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("posts")
      .select("slug, title, excerpt, body, published_at")
      .eq("tenant_id", tenantId)
      .order("published_at", { ascending: false }),
    supabase
      .from("faqs")
      .select("id, question, answer")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    supabase
      .from("reviews")
      .select("id, author_name, rating, body, source")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_availability")
      .select("service_id, weekday, start_time, end_time")
      .eq("tenant_id", tenantId)
      .order("weekday"),
    supabase.from("service_staff").select("service_id, staff_id").eq("tenant_id", tenantId),
    supabase
      .from("closures")
      .select("id, location_id, start_date, end_date, reason")
      .eq("tenant_id", tenantId)
      .order("start_date"),
    supabase
      .from("staff_shifts")
      .select("staff_id, weekday, start_time, end_time")
      .eq("tenant_id", tenantId),
    supabase
      .from("staff_absences")
      .select("staff_id, start_date, end_date")
      .eq("tenant_id", tenantId),
  ]);

  return {
    tenant,
    locations: locations.data ?? [],
    categories: categories.data ?? [],
    services: services.data ?? [],
    staff: staff.data ?? [],
    sections: Object.fromEntries((sections.data ?? []).map((s) => [s.key, s.content])) as Record<
      string,
      Record<string, string>
    >,
    posts: posts.data ?? [],
    faqs: faqs.data ?? [],
    reviews: reviews.data ?? [],
    availability: availability.data ?? [],
    serviceStaff: serviceStaff.data ?? [],
    closures: closures.data ?? [],
    staffShifts: staffShifts.data ?? [],
    staffAbsences: staffAbsences.data ?? [],
  };
});
