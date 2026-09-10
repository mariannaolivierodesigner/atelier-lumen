-- Tre problemi reali risolti insieme, perché collegati tra loro:
--
-- 1) Gli orari di apertura della sede (location.opening_hours) erano solo testo
--    per il sito, mai usati per calcolare gli orari prenotabili: un cliente
--    poteva prenotare più trattamenti che finivano ben oltre l'orario di
--    chiusura. Aggiungiamo `location_hours`, orari veri e strutturati.
--
-- 2) Non esisteva modo di segnare un membro dello staff assente (ferie,
--    malattia, permesso): il sito continuava a proporlo come disponibile.
--    Aggiungiamo `staff_absences`.
--
-- 3) La prenotazione non controllava mai se lo slot richiesto si sovrapponeva
--    a un'altra prenotazione già esistente: bastava che passasse le regole
--    "statiche" di disponibilità. Aggiungiamo il controllo reale dentro
--    request_booking, il punto in cui *ogni* prenotazione passa comunque.

-- ============================================================
-- 1) Orari di apertura per sede, strutturati
-- ============================================================
CREATE TABLE public.location_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX location_hours_location_idx ON public.location_hours (location_id, weekday);

ALTER TABLE public.location_hours ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.location_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_hours TO authenticated;
GRANT ALL ON public.location_hours TO service_role;

CREATE POLICY "chiunque legge gli orari di apertura" ON public.location_hours
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff gestisce gli orari di apertura" ON public.location_hours
FOR ALL TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE TRIGGER location_hours_updated BEFORE UPDATE ON public.location_hours
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Orari reali della sede attuale di Atelier Lumen (Lun-Ven 9-20, Sab 9-18,
-- Domenica chiusa) — stessi orari già mostrati sul sito, ora anche rispettati
-- davvero dal motore di prenotazione.
INSERT INTO public.location_hours (tenant_id, location_id, weekday, start_time, end_time)
SELECT l.tenant_id, l.id, wd, '09:00', '20:00'
FROM public.locations l, generate_series(1, 5) AS wd
WHERE l.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'atelier-lumen');

INSERT INTO public.location_hours (tenant_id, location_id, weekday, start_time, end_time)
SELECT l.tenant_id, l.id, 6, '09:00', '18:00'
FROM public.locations l
WHERE l.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'atelier-lumen');
-- Nessuna riga per weekday 0 (domenica) = chiuso, coerente con "Nessuna regola = chiuso"
-- che applichiamo qui sotto in request_booking.

-- ============================================================
-- 2) Assenze dello staff (ferie, malattia, permesso)
-- ============================================================
CREATE TABLE public.staff_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX staff_absences_staff_idx ON public.staff_absences (staff_id, start_date, end_date);

ALTER TABLE public.staff_absences ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.staff_absences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_absences TO authenticated;
GRANT ALL ON public.staff_absences TO service_role;

-- Lettura pubblica: serve al sito per non proporre come disponibile un
-- operatore assente. Non contiene dati di pazienti/clienti, solo il fatto
-- che quel giorno l'operatore non c'è.
CREATE POLICY "chiunque legge le assenze" ON public.staff_absences
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff gestisce le assenze" ON public.staff_absences
FOR ALL TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE TRIGGER staff_absences_updated BEFORE UPDATE ON public.staff_absences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3) request_booking: orari di apertura, assenze e sovrapposizioni vere
-- ============================================================
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
  v_local timestamp;
  v_weekday int;
  v_start_time time;
  v_ends_at timestamptz;
  v_active_staff_count int;
  v_overlapping_count int;
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

  FOREACH v_service_id IN ARRAY _service_ids LOOP
    SELECT duration_minutes INTO v_duration
    FROM public.services
    WHERE id = v_service_id AND tenant_id = v_tenant_id AND is_active;
    IF v_duration IS NULL THEN
      RAISE EXCEPTION 'Trattamento non valido';
    END IF;
    v_total_duration := v_total_duration + v_duration;
  END LOOP;

  v_ends_at := _starts_at + make_interval(mins => v_total_duration);

  -- Orario di apertura: l'intero trattamento (o l'insieme di trattamenti)
  -- deve stare dentro l'orario di apertura della sede quel giorno.
  v_local := _starts_at AT TIME ZONE 'Europe/Rome';
  v_weekday := extract(dow FROM v_local);

  SELECT start_time INTO v_start_time
  FROM public.location_hours
  WHERE location_id = _location_id AND weekday = v_weekday
    AND start_time <= v_local::time
    AND end_time >= (v_local + make_interval(mins => v_total_duration))::time
  LIMIT 1;

  IF v_start_time IS NULL THEN
    RAISE EXCEPTION 'Orario fuori apertura';
  END IF;

  -- Assenza dell'operatore scelto, se ne è stato scelto uno.
  IF _staff_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.staff_absences
    WHERE staff_id = _staff_id
      AND v_local::date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Operatore assente';
  END IF;

  -- Sovrapposizione con prenotazioni già esistenti (attive, non rifiutate
  -- né annullate). Con un operatore scelto: nessun'altra prenotazione dello
  -- stesso operatore può sovrapporsi. Senza preferenza: teniamo conto della
  -- capienza reale (quanti operatori attivi e non assenti ci sono).
  IF _staff_id IS NOT NULL THEN
    SELECT count(*) INTO v_overlapping_count
    FROM public.bookings
    WHERE staff_id = _staff_id
      AND status NOT IN ('cancelled', 'rejected')
      AND starts_at < v_ends_at
      AND (starts_at + make_interval(mins => duration_minutes)) > _starts_at;

    IF v_overlapping_count > 0 THEN
      RAISE EXCEPTION 'Slot non più disponibile';
    END IF;
  ELSE
    SELECT count(*) INTO v_active_staff_count
    FROM public.staff s
    WHERE s.tenant_id = v_tenant_id AND s.is_active
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_absences a
        WHERE a.staff_id = s.id AND v_local::date BETWEEN a.start_date AND a.end_date
      );

    SELECT count(*) INTO v_overlapping_count
    FROM public.bookings
    WHERE tenant_id = v_tenant_id
      AND status NOT IN ('cancelled', 'rejected')
      AND starts_at < v_ends_at
      AND (starts_at + make_interval(mins => duration_minutes)) > _starts_at;

    IF v_overlapping_count >= greatest(v_active_staff_count, 1) THEN
      RAISE EXCEPTION 'Slot non più disponibile';
    END IF;
  END IF;

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
