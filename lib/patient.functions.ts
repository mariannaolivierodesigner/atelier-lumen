import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function myProfileId(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profilo non trovato.");
  return data.id as string;
}

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const patientId = await myProfileId(context);
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      read_at: string | null;
      created_at: string;
    }>;
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patientId = await myProfileId(context);
    let query = context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .is("read_at", null);
    if (!data.all && data.id) query = query.eq("id", data.id);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getMyContactPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("notify_in_app, notify_whatsapp, notify_sms, email, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? {
      notify_in_app: true,
      notify_whatsapp: true,
      notify_sms: false,
      email: null,
      phone: null,
    }) as {
      notify_in_app: boolean;
      notify_whatsapp: boolean;
      notify_sms: boolean;
      email: string | null;
      phone: string | null;
    };
  });

export const updateMyContactPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        notify_in_app: z.boolean(),
        notify_whatsapp: z.boolean(),
        notify_sms: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
