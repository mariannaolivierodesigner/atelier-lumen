import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { localToIso } from "@/lib/slots";

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accesso riservato allo staff.");
}

export const listAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, patient_note, staff_note, reminder_channel, reminder_sent_at, services(name, price_cents), doctors(id, full_name, color), profiles(full_name, phone, email)",
      )
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .order("starts_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Registra l'invio (simulato) di un promemoria SMS/WhatsApp per un appuntamento. */
export const sendAppointmentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), channel: z.enum(["sms", "whatsapp"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("appointments")
      .update({ reminder_channel: data.channel, reminder_sent_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("appointments")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, phone, birth_date, allergies, conditions, created_at")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** ---- Listino trattamenti ---- */

export const listServicesForStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("services")
      .select("id, slug, name, short_description, duration_min, price_cents, published, sort_order")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const serviceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  shortDescription: z.string().trim().min(2).max(300),
  durationMin: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(10_000_00),
  published: z.boolean(),
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => serviceInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      name: data.name,
      short_description: data.shortDescription,
      duration_min: data.durationMin,
      price_cents: data.priceCents,
      published: data.published,
    };
    if (data.id) {
      const { error } = await context.supabase.from("services").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      let slug = slugify(data.name);
      const { data: clash } = await context.supabase
        .from("services")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (clash) slug = `${slug}-${Date.now().toString(36)}`;
      const { error } = await context.supabase.from("services").insert({ ...payload, slug });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        throw new Error(
          "Questo trattamento è già collegato ad appuntamenti esistenti: disattivalo invece di eliminarlo.",
        );
      }
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** ---- Documenti pazienti ---- */

export const listPatientDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ patientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("documents")
      .select("*")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return Promise.all(
      (rows ?? []).map(async (doc) => {
        if (!doc.file_url) return doc;
        const { data: signed } = await context.supabase.storage
          .from("documents")
          .createSignedUrl(doc.file_url, 60 * 10);
        return { ...doc, file_url: signed?.signedUrl ?? null };
      }),
    );
  });

const documentInput = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  kind: z.enum(["referto", "radiografia", "piano", "preventivo", "altro"]),
  filePath: z.string().trim().min(1),
});

/** Registra un documento già caricato su storage (bucket "documents"). */
export const addPatientDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => documentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("documents").insert({
      patient_id: data.patientId,
      title: data.title,
      kind: data.kind,
      file_url: data.filePath,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePatientDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: doc } = await context.supabase
      .from("documents")
      .select("file_url")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (doc?.file_url) {
      await context.supabase.storage.from("documents").remove([doc.file_url]);
    }
    return { ok: true as const };
  });

/** ---- Ferie / permessi (indisponibilità) ---- */

const blockedInput = z
  .object({
    doctor_id: z.string().uuid(),
    starts_at: z.string().min(1),
    ends_at: z.string().min(1),
    reason: z.string().trim().min(3).max(200),
    recurrence: z.enum(["none", "monthly", "yearly"]).default("none"),
    recurrence_count: z.number().int().min(1).max(24).default(1),
  })
  .refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), {
    message: "La data di fine deve essere successiva a quella di inizio.",
    path: ["ends_at"],
  });

/** Giorno/ora locali (fuso studio) di un timestamp ISO. */
function splitRome(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}

/** Sposta un ISO di `n` mesi o anni mantenendo l'ora locale dello studio. */
function shiftIso(iso: string, unit: "monthly" | "yearly", n: number) {
  const s = splitRome(iso);
  const base = new Date(Date.UTC(s.year, s.month - 1, 1));
  if (unit === "monthly") base.setUTCMonth(base.getUTCMonth() + n);
  else base.setUTCFullYear(base.getUTCFullYear() + n);
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(s.day, lastDay);
  const iso10 = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return localToIso(iso10, s.time);
}

/** Espande un periodo nelle sue occorrenze ricorrenti. */
function expandOccurrences(input: {
  starts_at: string;
  ends_at: string;
  recurrence: "none" | "monthly" | "yearly";
  recurrence_count: number;
}) {
  const count = input.recurrence === "none" ? 1 : input.recurrence_count;
  const durationMs = new Date(input.ends_at).getTime() - new Date(input.starts_at).getTime();
  const out: Array<{ starts_at: string; ends_at: string }> = [];
  for (let i = 0; i < count; i++) {
    if (i === 0 || input.recurrence === "none") {
      out.push({ starts_at: input.starts_at, ends_at: input.ends_at });
      continue;
    }
    const starts = shiftIso(input.starts_at, input.recurrence, i);
    out.push({ starts_at: starts, ends_at: new Date(new Date(starts).getTime() + durationMs).toISOString() });
  }
  return out;
}

export const listBlockedSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("blocked_slots")
      .select(
        "id, doctor_id, starts_at, ends_at, reason, recurrence, recurrence_count, recurrence_group_id, doctors(full_name, color)",
      )
      .gte("ends_at", new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
      .order("starts_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listStaffDoctors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("doctors")
      .select("id, full_name, specialization, active")
      .eq("active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** ---- Turni settimanali ---- */

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido");

export const listDoctorShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ doctorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("doctor_availability")
      .select("id, doctor_id, weekday, start_time, end_time")
      .eq("doctor_id", data.doctorId)
      .order("weekday")
      .order("start_time");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const shiftInput = z
  .object({
    id: z.string().uuid().optional(),
    doctorId: z.string().uuid(),
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "L'orario di fine deve seguire quello di inizio",
    path: ["endTime"],
  });

export const saveDoctorShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shiftInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      doctor_id: data.doctorId,
      weekday: data.weekday,
      start_time: data.startTime,
      end_time: data.endTime,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("doctor_availability")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("doctor_availability").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteDoctorShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("doctor_availability").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Appuntamenti attivi che si sovrappongono al periodo indicato. */
async function findConflicts(
  context: { supabase: any },
  input: { doctor_id: string; starts_at: string; ends_at: string },
) {
  const { data, error } = await context.supabase
    .from("appointments")
    .select("id, patient_id, starts_at, ends_at, profiles(full_name)")
    .eq("doctor_id", input.doctor_id)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", input.ends_at)
    .gt("ends_at", input.starts_at)
    .order("starts_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    patient_id: string;
    starts_at: string;
    ends_at: string;
    profiles: { full_name: string } | null;
  }>;
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const checkBlockedConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        doctor_id: z.string().uuid(),
        starts_at: z.string(),
        ends_at: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    return findConflicts(context, data);
  });

export const saveBlockedSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid().optional(), force: z.boolean().optional() })
      .and(blockedInput)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    const occurrences = data.id
      ? [{ starts_at: data.starts_at, ends_at: data.ends_at }]
      : expandOccurrences(data);

    // Conflitti su tutte le occorrenze generate.
    const conflictLists = await Promise.all(
      occurrences.map((o) => findConflicts(context, { doctor_id: data.doctor_id, ...o })),
    );
    const conflicts = conflictLists.flat();
    if (!data.force && conflicts.length > 0) {
      return { ok: false as const, conflicts, notified: 0, created: 0 };
    }

    if (data.id) {
      const { error } = await context.supabase
        .from("blocked_slots")
        .update({
          doctor_id: data.doctor_id,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          reason: data.reason,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const groupId =
        data.recurrence !== "none" && occurrences.length > 1 ? crypto.randomUUID() : null;
      const rows = occurrences.map((o) => ({
        doctor_id: data.doctor_id,
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        reason: data.reason,
        recurrence: data.recurrence,
        recurrence_count: data.recurrence === "none" ? 1 : data.recurrence_count,
        recurrence_group_id: groupId,
      }));
      const { error } = await context.supabase.from("blocked_slots").insert(rows);
      if (error) throw new Error(error.message);
    }

    // Avvisa i pazienti i cui appuntamenti ricadono nel periodo di indisponibilità,
    // rispettando le preferenze di contatto di ciascun paziente.
    let notified = 0;
    let emailed = 0;
    if (conflicts.length > 0) {
      const patientIds = [...new Set(conflicts.map((c) => c.patient_id))];
      const { data: prefs } = await context.supabase
        .from("profiles")
        .select("id, full_name, notify_in_app")
        .in("id", patientIds);
      const prefMap = new Map((prefs ?? []).map((p: any) => [p.id, p]));

      const rows: any[] = [];
      for (const c of conflicts) {
        const p: any = prefMap.get(c.patient_id);
        const title = "Il tuo appuntamento va riprogrammato";
        const body = `L'appuntamento del ${dateLabel(c.starts_at)} ricade in un periodo di indisponibilità del medico (${data.reason}). Ti invitiamo a spostarlo dall'area personale o a contattare lo studio.`;

        // Canale predefinito: notifica in app (email non più prevista, sostituita da SMS/WhatsApp).
        if (p?.notify_in_app !== false) {
          rows.push({
            patient_id: c.patient_id,
            appointment_id: c.id,
            type: "conflict",
            title,
            body,
          });
        }
      }

      if (rows.length > 0) {
        const { error: nErr } = await context.supabase.from("notifications").insert(rows);
        if (!nErr) notified = rows.length;
      }
    }

    return {
      ok: true as const,
      conflicts: [],
      notified,
      emailed,
      recipients: conflicts.length,
      created: occurrences.length,
    };
  });

/** Appuntamenti + indisponibilità di un intervallo, per la vista calendario. */
export const listCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().min(1),
        to: z.string().min(1),
        doctor_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    let apptQuery = context.supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, doctor_id, patient_id, services(name), doctors(full_name, color), profiles(full_name, email, phone)",
      )
      .lt("starts_at", data.to)
      .gt("ends_at", data.from)
      .order("starts_at");
    if (data.doctor_id) apptQuery = apptQuery.eq("doctor_id", data.doctor_id);

    let blockedQuery = context.supabase
      .from("blocked_slots")
      .select("id, doctor_id, starts_at, ends_at, reason, recurrence, doctors(full_name, color)")
      .lt("starts_at", data.to)
      .gt("ends_at", data.from)
      .order("starts_at");
    if (data.doctor_id) blockedQuery = blockedQuery.eq("doctor_id", data.doctor_id);

    const [appts, blocked] = await Promise.all([apptQuery, blockedQuery]);
    if (appts.error) throw new Error(appts.error.message);
    if (blocked.error) throw new Error(blocked.error.message);

    return {
      appointments: (appts.data ?? []) as Array<{
        id: string;
        starts_at: string;
        ends_at: string;
        status: string;
        doctor_id: string;
        patient_id: string;
        services: { name: string } | null;
        doctors: { full_name: string; color: string } | null;
        profiles: { full_name: string; email: string | null; phone: string | null } | null;
      }>,
      blocked: (blocked.data ?? []) as Array<{
        id: string;
        doctor_id: string;
        starts_at: string;
        ends_at: string;
        reason: string;
        recurrence: string;
        doctors: { full_name: string; color: string } | null;
      }>,
    };
  });

export const deleteBlockedSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), whole_series: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    if (data.whole_series) {
      const { data: row } = await context.supabase
        .from("blocked_slots")
        .select("recurrence_group_id")
        .eq("id", data.id)
        .maybeSingle();
      const groupId = row?.recurrence_group_id as string | null | undefined;
      if (groupId) {
        const { error } = await context.supabase
          .from("blocked_slots")
          .delete()
          .eq("recurrence_group_id", groupId);
        if (error) throw new Error(error.message);
        return { ok: true as const };
      }
    }

    const { error } = await context.supabase.from("blocked_slots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Libera uno slot in conflitto: annulla l'appuntamento e avvisa il paziente. */
export const releaseConflictingAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["cancel", "notify"]),
        reason: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    const { data: appt, error } = await context.supabase
      .from("appointments")
      .select("id, patient_id, starts_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Appuntamento non trovato.");

    if (data.mode === "cancel") {
      const { error: uErr } = await context.supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", data.id);
      if (uErr) throw new Error(uErr.message);
    }

    const title =
      data.mode === "cancel"
        ? "Appuntamento annullato dallo studio"
        : "Il tuo appuntamento va riprogrammato";
    const body =
      data.mode === "cancel"
        ? `L'appuntamento del ${dateLabel(appt.starts_at)} è stato annullato${data.reason ? ` (${data.reason})` : ""}. Puoi prenotare un nuovo orario dall'area personale.`
        : `L'appuntamento del ${dateLabel(appt.starts_at)} è in conflitto con un'indisponibilità del medico${data.reason ? ` (${data.reason})` : ""}. Ti chiediamo di spostarlo dall'area personale.`;

    const { error: nErr } = await context.supabase.from("notifications").insert({
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      type: "conflict",
      title,
      body,
    });
    if (nErr) throw new Error(nErr.message);

    return { ok: true as const };
  });

/** Sposta un appuntamento su un nuovo orario (staff), con avviso al paziente. */
export const staffRescheduleAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        starts_at: z.string().min(1),
        ends_at: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    const { data: appt, error } = await context.supabase
      .from("appointments")
      .select("id, patient_id, doctor_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Appuntamento non trovato.");

    const clashes = await findConflicts(context, {
      doctor_id: appt.doctor_id,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
    });
    if (clashes.some((c) => c.id !== data.id)) {
      return { ok: false as const, reason: "Il nuovo orario è già occupato." };
    }

    const { error: uErr } = await context.supabase
      .from("appointments")
      .update({ starts_at: data.starts_at, ends_at: data.ends_at, status: "pending" })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    await context.supabase.from("notifications").insert({
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      type: "reschedule",
      title: "Appuntamento riprogrammato",
      body: `Il tuo appuntamento è stato spostato al ${dateLabel(data.starts_at)}. Se l'orario non ti è comodo, contattaci o riprogrammalo dall'area personale.`,
    });

    return { ok: true as const };
  });

/** Registro modifiche ferie/permessi (solo admin), con filtri e paginazione. */
export const listBlockedSlotsAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        action: z.enum(["all", "created", "updated", "deleted"]).default("all"),
        doctor_id: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(5).max(100).default(10),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { allowed: false as const, rows: [], total: 0 };

    let query = context.supabase
      .from("blocked_slots_audit_log")
      .select(
        "id, action, created_at, actor_user_id, doctor_id, old_starts_at, old_ends_at, old_reason, new_starts_at, new_ends_at, new_reason",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (data.action !== "all") query = query.eq("action", data.action);
    if (data.doctor_id) query = query.eq("doctor_id", data.doctor_id);
    if (data.from) query = query.gte("created_at", data.from);
    if (data.to) query = query.lte("created_at", data.to);

    const start = (data.page - 1) * data.page_size;
    const { data: rows0, error, count } = await query.range(start, start + data.page_size - 1);
    if (error) throw new Error(error.message);

    const rows = rows0 ?? [];
    const actorIds = [...new Set(rows.map((r: any) => r.actor_user_id).filter(Boolean))];
    const doctorIds = [...new Set(rows.map((r: any) => r.doctor_id).filter(Boolean))];

    const [actors, docs] = await Promise.all([
      actorIds.length
        ? context.supabase.from("profiles").select("user_id, full_name").in("user_id", actorIds)
        : Promise.resolve({ data: [] }),
      doctorIds.length
        ? context.supabase.from("doctors").select("id, full_name").in("id", doctorIds)
        : Promise.resolve({ data: [] }),
    ]);

    const actorMap = new Map((actors.data ?? []).map((p: any) => [p.user_id, p.full_name]));
    const doctorMap = new Map((docs.data ?? []).map((d: any) => [d.id, d.full_name]));

    return {
      allowed: true as const,
      total: count ?? 0,
      rows: rows.map((r: any) => ({
        ...r,
        actor_name: (actorMap.get(r.actor_user_id) as string | undefined) ?? "Sistema",
        doctor_name: (doctorMap.get(r.doctor_id) as string | undefined) ?? "—",
      })),
    };
  });
