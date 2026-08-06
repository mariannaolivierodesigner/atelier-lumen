import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  customerInputSchema,
  customerIdSchema,
  noteInputSchema,
  resolveTenantId,
} from "./crm.server";

/** Elenco clienti del centro con le note collegate. */
export const getCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) return { customers: [], notes: [] };

    const [customers, notes] = await Promise.all([
      context.supabase
        .from("customers")
        .select(
          "id, full_name, email, phone, birth_date, notes, tags, marketing_consent, privacy_consent, consent_updated_at, created_at",
        )
        .eq("tenant_id", tenantId)
        .order("full_name"),
      context.supabase
        .from("customer_notes")
        .select("id, customer_id, body, author_name, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    return { customers: customers.data ?? [], notes: notes.data ?? [] };
  });

/** Crea o aggiorna una scheda cliente, consensi inclusi. */
export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const payload = {
      tenant_id: tenantId,
      full_name: data.fullName,
      email: data.email || null,
      phone: data.phone || null,
      birth_date: data.birthDate || null,
      notes: data.notes || null,
      tags: data.tags,
      marketing_consent: data.marketingConsent,
      privacy_consent: data.privacyConsent,
      consent_updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("customers")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("customers")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

/** Elimina una scheda cliente (solo titolari e responsabili). */
export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Aggiunge una nota allo storico del cliente. */
export const addCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => noteInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const { data: membership } = await context.supabase
      .from("tenant_users")
      .select("full_name")
      .eq("user_id", context.userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const { error } = await context.supabase.from("customer_notes").insert({
      tenant_id: tenantId,
      customer_id: data.customerId,
      author_id: context.userId,
      author_name: membership?.full_name ?? null,
      body: data.body,
    });
    if (error) throw error;
    return { ok: true as const };
  });

/** Crea le schede cliente mancanti a partire dalle prenotazioni ricevute. */
export const importCustomersFromBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const [{ data: bookings }, { data: existing }] = await Promise.all([
      context.supabase
        .from("bookings")
        .select("id, customer_name, customer_email, customer_phone, customer_id")
        .eq("tenant_id", tenantId),
      context.supabase.from("customers").select("id, email").eq("tenant_id", tenantId),
    ]);

    const byEmail = new Map(
      (existing ?? [])
        .filter((c) => c.email)
        .map((c) => [c.email!.toLowerCase(), c.id] as const),
    );

    let created = 0;
    for (const booking of bookings ?? []) {
      const email = booking.customer_email?.toLowerCase();
      if (!email) continue;
      let customerId = byEmail.get(email);

      if (!customerId) {
        const { data: inserted } = await context.supabase
          .from("customers")
          .insert({
            tenant_id: tenantId,
            full_name: booking.customer_name,
            email: booking.customer_email,
            phone: booking.customer_phone,
            privacy_consent: true,
            consent_updated_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();
        if (!inserted) continue;
        customerId = inserted.id;
        byEmail.set(email, customerId);
        created += 1;
      }

      if (!booking.customer_id) {
        await context.supabase
          .from("bookings")
          .update({ customer_id: customerId })
          .eq("id", booking.id);
      }
    }

    return { created };
  });

/** GDPR — Esporta tutti i dati collegati a un cliente (diritto di accesso/portabilità). */
export const exportCustomerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const { data: customer, error } = await context.supabase
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!customer) throw new Error("Cliente non trovato");

    const [notes, bookings] = await Promise.all([
      context.supabase
        .from("customer_notes")
        .select("body, author_name, created_at")
        .eq("tenant_id", tenantId)
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("bookings")
        .select(
          "id, starts_at, duration_minutes, status, notes, customer_name, customer_email, customer_phone, service_id, staff_id, location_id, created_at",
        )
        .eq("tenant_id", tenantId)
        .or(
          customer.email
            ? `customer_id.eq.${data.id},customer_email.eq.${customer.email}`
            : `customer_id.eq.${data.id}`,
        )
        .order("starts_at", { ascending: false }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      customer,
      notes: notes.data ?? [],
      bookings: bookings.data ?? [],
    };
  });

/** GDPR — Cancella i dati personali di un cliente (diritto all'oblio). */
export const eraseCustomerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenantId(context.supabase);
    if (!tenantId) throw new Error("Centro non trovato");

    const { data: customer } = await context.supabase
      .from("customers")
      .select("id, email")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!customer) throw new Error("Cliente non trovato");

    // Le prenotazioni restano per contabilità ma vengono anonimizzate.
    const anonymize = {
      customer_id: null,
      customer_name: "Cliente anonimizzato",
      customer_email: `anon+${data.id}@gdpr.local`,
      customer_phone: null,
      notes: null,
    };
    await context.supabase
      .from("bookings")
      .update(anonymize)
      .eq("tenant_id", tenantId)
      .eq("customer_id", data.id);
    if (customer.email) {
      await context.supabase
        .from("bookings")
        .update(anonymize)
        .eq("tenant_id", tenantId)
        .eq("customer_email", customer.email);
    }

    const { error: notesError } = await context.supabase
      .from("customer_notes")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("customer_id", data.id);
    if (notesError) throw notesError;

    const { error } = await context.supabase
      .from("customers")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw error;

    return { ok: true as const };
  });

