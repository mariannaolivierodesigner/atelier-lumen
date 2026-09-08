-- Prenotazione con più di un trattamento.
--
-- `bookings.service_id` resta il "trattamento principale" (il primo scelto) per
-- compatibilità con tutto ciò che già lo usa (dashboard, filtri, compatibilità
-- operatore/trattamento). La nuova tabella `booking_services` registra invece
-- l'elenco completo dei trattamenti scelti, con durata e prezzo "fotografati"
-- al momento della prenotazione (così se il prezzo di un trattamento cambia in
-- futuro, le prenotazioni passate restano corrette).

CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  duration_minutes int NOT NULL,
  price_cents int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_services_booking_idx ON public.booking_services (booking_id);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff legge i trattamenti delle prenotazioni del centro"
ON public.booking_services FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND public.is_tenant_member(b.tenant_id)
  )
);

GRANT SELECT ON public.booking_services TO authenticated;
GRANT ALL ON public.booking_services TO service_role;

-- Sostituiamo request_booking: accetta ora un elenco di trattamenti (_service_ids)
-- invece di uno solo. La firma cambia, quindi rimuoviamo prima la vecchia versione.
DROP FUNCTION IF EXISTS public.request_booking(text, uuid, uuid, uuid, timestamptz, text, text, text, text);

CREATE OR REPLACE FUNCTION public.request_booking(
  _tenant_slug text,
  _location_id uuid,
  _service_ids uuid[],
  _staff_id uuid,
  _starts_at timestamptz,
  _customer_name text,
  _customer_email text,
  _customer_phone text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_total_duration int := 0;
  v_name text := btrim(coalesce(_customer_name, ''));
  v_email text := lower(btrim(coalesce(_customer_email, '')));
  v_phone text := nullif(btrim(coalesce(_customer_phone, '')), '');
  v_notes text := nullif(btrim(coalesce(_notes, '')), '');
  v_id uuid;
  v_service_id uuid;
  v_duration int;
  v_price int;
BEGIN
  IF _service_ids IS NULL OR array_length(_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Trattamento non valido';
  END IF;

  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = _tenant_slug AND is_active;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Centro non disponibile';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Nome non valido';
  END IF;
  IF char_length(v_email) > 255 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email non valida';
  END IF;
  IF v_phone IS NOT NULL AND (char_length(v_phone) > 40 OR v_phone !~ '^[0-9+()\s.-]+$') THEN
    RAISE EXCEPTION 'Telefono non valido';
  END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'Note troppo lunghe';
  END IF;
  IF _starts_at IS NULL OR _starts_at < now() OR _starts_at > now() + interval '1 year' THEN
    RAISE EXCEPTION 'Data non valida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = _location_id AND tenant_id = v_tenant_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Sede non valida';
  END IF;

  IF _staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = _staff_id AND tenant_id = v_tenant_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Operatore non valido';
  END IF;

  -- Convalida ogni trattamento richiesto e somma le durate (il prezzo si calcola
  -- allo stesso modo più sotto, quando registriamo le singole righe).
  FOREACH v_service_id IN ARRAY _service_ids LOOP
    SELECT duration_minutes INTO v_duration
    FROM public.services
    WHERE id = v_service_id AND tenant_id = v_tenant_id AND is_active;
    IF v_duration IS NULL THEN
      RAISE EXCEPTION 'Trattamento non valido';
    END IF;
    v_total_duration := v_total_duration + v_duration;
  END LOOP;

  INSERT INTO public.bookings (
    tenant_id, location_id, service_id, staff_id, starts_at,
    duration_minutes, customer_name, customer_email, customer_phone, notes, status
  ) VALUES (
    v_tenant_id, _location_id, _service_ids[1], _staff_id, _starts_at,
    v_total_duration, v_name, v_email, v_phone, v_notes, 'pending'
  )
  RETURNING id INTO v_id;

  FOREACH v_service_id IN ARRAY _service_ids LOOP
    SELECT duration_minutes, price_cents INTO v_duration, v_price
    FROM public.services WHERE id = v_service_id;

    INSERT INTO public.booking_services (booking_id, service_id, duration_minutes, price_cents)
    VALUES (v_id, v_service_id, v_duration, v_price);
  END LOOP;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_booking(text, uuid, uuid[], uuid, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking(text, uuid, uuid[], uuid, timestamptz, text, text, text, text) TO anon, authenticated, service_role;
