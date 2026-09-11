import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

const reminderInputSchema = z.object({
  bookingId: z.string().uuid(),
  channel: z.enum(["sms", "whatsapp"]),
});

/**
 * Invio (simulato) di un promemoria appuntamento via SMS o WhatsApp.
 *
 * Il messaggio è composto davvero, recuperando data/ora/trattamento dalla
 * prenotazione lato server (mai da dati mandati dal browser). Non è
 * collegato a nessun fornitore reale (Twilio, ecc.): viene solo registrato
 * come "inviato" per mostrarlo nel gestionale.
 */
export const sendReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reminderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: booking, error: bookingError } = await context.supabase
      .from("bookings")
      .select("id, tenant_id, customer_name, starts_at, service_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingError || !booking) throw new Error("Prenotazione non trovata");

    const names: string[] = [];
    const { data: bookingServices } = await context.supabase
      .from("booking_services")
      .select("service_id")
      .eq("booking_id", booking.id);
    const serviceIds =
      bookingServices && bookingServices.length > 0
        ? bookingServices.map((s) => s.service_id)
        : booking.service_id
          ? [booking.service_id]
          : [];
    if (serviceIds.length > 0) {
      const { data: services } = await context.supabase
        .from("services")
        .select("name")
        .in("id", serviceIds);
      names.push(...(services ?? []).map((s) => s.name));
    }
    const treatment = names.length > 0 ? names.join(" + ") : "il tuo trattamento";

    const when = new Date(booking.starts_at);
    const message = `Ciao ${booking.customer_name.split(" ")[0]}, ti ricordiamo il tuo appuntamento per ${treatment} di ${dayFmt.format(when)} alle ${timeFmt.format(when)} presso Atelier Lumen. A presto!`;

    const { error: insertError } = await context.supabase.from("booking_reminders").insert({
      booking_id: booking.id,
      channel: data.channel,
      message,
    });
    if (insertError) throw insertError;

    return { message, channel: data.channel };
  });

/** Ultimo promemoria inviato per ciascuna prenotazione (per mostrarlo nel gestionale). */
export const getReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("booking_reminders")
      .select("booking_id, channel, sent_at")
      .order("sent_at", { ascending: false });
    if (error) throw error;
    return { reminders: data ?? [] };
  });
