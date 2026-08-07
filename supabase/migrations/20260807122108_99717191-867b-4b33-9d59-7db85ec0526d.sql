CREATE TABLE public.service_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '19:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

GRANT SELECT ON public.service_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_availability TO authenticated;
GRANT ALL ON public.service_availability TO service_role;

ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active availability" ON public.service_availability
  FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "staff legge disponibilita" ON public.service_availability
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active));

CREATE POLICY "staff crea disponibilita" ON public.service_availability
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active));

CREATE POLICY "staff aggiorna disponibilita" ON public.service_availability
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active));

CREATE POLICY "responsabili eliminano disponibilita" ON public.service_availability
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active
      AND tu.role = ANY (ARRAY['owner'::app_role, 'manager'::app_role])));

CREATE TRIGGER service_availability_updated BEFORE UPDATE ON public.service_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX service_availability_service_idx ON public.service_availability (service_id, weekday);

CREATE TABLE public.service_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, staff_id)
);

GRANT SELECT ON public.service_staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_staff TO authenticated;
GRANT ALL ON public.service_staff TO service_role;

ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read service staff" ON public.service_staff
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff crea abilitazioni" ON public.service_staff
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_staff.tenant_id AND tu.is_active));

CREATE POLICY "staff elimina abilitazioni" ON public.service_staff
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_staff.tenant_id AND tu.is_active));

CREATE OR REPLACE FUNCTION public.request_booking(_tenant_slug text, _location_id uuid, _service_id uuid, _staff_id uuid, _starts_at timestamp with time zone, _customer_name text, _customer_email text, _customer_phone text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_duration int;
  v_name text := btrim(coalesce(_customer_name, ''));
  v_email text := lower(btrim(coalesce(_customer_email, '')));
  v_phone text := nullif(btrim(coalesce(_customer_phone, '')), '');
  v_notes text := nullif(btrim(coalesce(_notes, '')), '');
  v_id uuid;
  v_local timestamp;
  v_weekday smallint;
  v_start time;
  v_end time;
  v_has_rules boolean;
  v_has_staff_rules boolean;
BEGIN
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

  SELECT duration_minutes INTO v_duration
  FROM public.services
  WHERE id = _service_id AND tenant_id = v_tenant_id AND is_active AND is_bookable;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Trattamento non valido';
  END IF;

  IF _staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = _staff_id AND tenant_id = v_tenant_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Operatore non valido';
  END IF;

  -- Regole di disponibilità (giorni/orari). Nessuna regola = sempre disponibile.
  v_local := _starts_at AT TIME ZONE 'Europe/Rome';
  v_weekday := EXTRACT(DOW FROM v_local)::smallint;
  v_start := v_local::time;
  v_end := (v_local + make_interval(mins => v_duration))::time;

  SELECT EXISTS (
    SELECT 1 FROM public.service_availability
    WHERE service_id = _service_id AND tenant_id = v_tenant_id AND is_active
  ) INTO v_has_rules;

  IF v_has_rules AND NOT EXISTS (
    SELECT 1 FROM public.service_availability
    WHERE service_id = _service_id AND tenant_id = v_tenant_id AND is_active
      AND weekday = v_weekday
      AND start_time <= v_start
      AND end_time >= v_end
  ) THEN
    RAISE EXCEPTION 'Il trattamento non è disponibile in questo giorno o orario';
  END IF;

  -- Operatori abilitati. Nessuna abilitazione = tutti gli operatori.
  SELECT EXISTS (
    SELECT 1 FROM public.service_staff
    WHERE service_id = _service_id AND tenant_id = v_tenant_id
  ) INTO v_has_staff_rules;

  IF v_has_staff_rules AND _staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_staff
    WHERE service_id = _service_id AND tenant_id = v_tenant_id AND staff_id = _staff_id
  ) THEN
    RAISE EXCEPTION 'Operatore non abilitato a questo trattamento';
  END IF;

  INSERT INTO public.bookings (
    tenant_id, location_id, service_id, staff_id, starts_at,
    duration_minutes, customer_name, customer_email, customer_phone, notes, status
  ) VALUES (
    v_tenant_id, _location_id, _service_id, _staff_id, _starts_at,
    v_duration, v_name, v_email, v_phone, v_notes, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;