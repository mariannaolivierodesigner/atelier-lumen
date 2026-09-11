-- Promemoria appuntamento via SMS o WhatsApp.
--
-- Per la demo l'invio è SIMULATO (nessun collegamento reale a Twilio o ad
-- altri fornitori): quando lo staff clicca "Invia promemoria", il sistema
-- compone davvero il messaggio (recuperando data, ora e trattamento dalla
-- prenotazione) e lo registra qui come "inviato", mostrandolo nel
-- gestionale — ma il messaggio non parte per davvero verso il telefono del
-- cliente. Quando/se in futuro si collegherà un fornitore reale, basterà
-- aggiungere la chiamata vera nella funzione server, senza toccare
-- l'interfaccia.

CREATE TABLE public.booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_reminders_booking_idx ON public.booking_reminders (booking_id, sent_at DESC);

ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff legge i promemoria delle prenotazioni del centro"
ON public.booking_reminders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND public.is_tenant_member(b.tenant_id)
  )
);

CREATE POLICY "staff registra un promemoria per il centro"
ON public.booking_reminders FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND public.is_tenant_member(b.tenant_id)
  )
);

GRANT SELECT, INSERT ON public.booking_reminders TO authenticated;
GRANT ALL ON public.booking_reminders TO service_role;
