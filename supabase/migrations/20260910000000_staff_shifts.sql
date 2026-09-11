-- Turni settimanali dello staff.
--
-- Le "assenze" (staff_absences) coprono le eccezioni puntuali (ferie di
-- 3 giorni, malattia di oggi). I "turni" (staff_shifts) coprono invece il
-- pattern normale e ricorrente: "Marta lavora Lun-Ven 9-13 e 14-18, il
-- sabato solo mattina". Senza questa tabella, il sistema considerava ogni
-- operatore attivo sempre disponibile in ogni slot dell'orario di apertura
-- della sede, anche quando in realtà quel giorno non lavora affatto.
--
-- Un operatore SENZA nessun turno impostato viene considerato "sempre in
-- turno" (stesso comportamento di oggi, per non rompere nulla per chi non
-- ha ancora configurato i turni) — il controllo scatta solo per chi ha
-- almeno una riga impostata.

CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX staff_shifts_staff_idx ON public.staff_shifts (staff_id, weekday);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.staff_shifts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shifts TO authenticated;
GRANT ALL ON public.staff_shifts TO service_role;

CREATE POLICY "chiunque legge i turni" ON public.staff_shifts
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff gestisce i turni" ON public.staff_shifts
FOR ALL TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE TRIGGER staff_shifts_updated BEFORE UPDATE ON public.staff_shifts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- request_booking: aggiungiamo anche il controllo turno, oltre a quelli già
-- presenti (orario di apertura, assenze, sovrapposizioni).
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
  v_has_shifts boolean;
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

  IF _staff_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.staff_absences
    WHERE staff_id = _staff_id
      AND v_local::date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Operatore assente';
  END IF;

  -- Turno: un operatore SENZA nessuna riga in staff_shifts è considerato
  -- sempre in turno (compatibilità con chi non ha ancora configurato nulla).
  -- Chi invece HA turni impostati deve avere una fascia che copra l'intero
  -- appuntamento richiesto, quel giorno della settimana.
  IF _staff_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.staff_shifts WHERE staff_id = _staff_id) INTO v_has_shifts;
    IF v_has_shifts AND NOT EXISTS (
      SELECT 1 FROM public.staff_shifts
      WHERE staff_id = _staff_id AND weekday = v_weekday
        AND start_time <= v_local::time
        AND end_time >= (v_local + make_interval(mins => v_total_duration))::time
    ) THEN
      RAISE EXCEPTION 'Operatore non in turno';
    END IF;
  END IF;

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
    -- "Nessuna preferenza": contiamo solo gli operatori davvero disponibili
    -- in quel momento — attivi, non assenti, e (se hanno turni impostati)
    -- effettivamente in turno a quell'ora.
    SELECT count(*) INTO v_active_staff_count
    FROM public.staff s
    WHERE s.tenant_id = v_tenant_id AND s.is_active
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_absences a
        WHERE a.staff_id = s.id AND v_local::date BETWEEN a.start_date AND a.end_date
      )
      AND (
        NOT EXISTS (SELECT 1 FROM public.staff_shifts WHERE staff_id = s.id)
        OR EXISTS (
          SELECT 1 FROM public.staff_shifts sh
          WHERE sh.staff_id = s.id AND sh.weekday = v_weekday
            AND sh.start_time <= v_local::time
            AND sh.end_time >= (v_local + make_interval(mins => v_total_duration))::time
        )
      );

    SELECT count(*) INTO v_overlapping_count
    FROM public.bookings
    WHERE tenant_id = v_tenant_id
      AND status NOT IN ('cancelled', 'rejected')
      AND starts_at < v_ends_at
      AND (starts_at + make_interval(mins => duration_minutes)) > _starts_at;

    IF v_overlapping_count >= greatest(v_active_staff_count, 0) OR v_active_staff_count = 0 THEN
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

-- Stesso problema già risolto per is_tenant_member/has_tenant_role: senza
-- questo permesso esplicito, qualunque nuova policy che li richiama fallisce
-- silenziosamente in lettura e con errore visibile in scrittura. Lo
-- ripetiamo qui per sicurezza (non fa danno se era già stato concesso).
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.app_role) TO authenticated;
