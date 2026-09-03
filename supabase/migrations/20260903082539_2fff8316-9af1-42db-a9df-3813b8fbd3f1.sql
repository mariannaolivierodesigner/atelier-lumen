CREATE TABLE public.closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX closures_tenant_range_idx ON public.closures (tenant_id, start_date, end_date);

GRANT SELECT ON public.closures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closures TO authenticated;
GRANT ALL ON public.closures TO service_role;

ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chiusure visibili pubblicamente"
ON public.closures FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Membri gestiscono le chiusure"
ON public.closures FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Membri aggiornano le chiusure"
ON public.closures FOR UPDATE TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Titolari eliminano le chiusure"
ON public.closures FOR DELETE TO authenticated
USING (
  public.has_tenant_role(tenant_id, 'owner'::app_role)
  OR public.has_tenant_role(tenant_id, 'manager'::app_role)
);

CREATE TRIGGER closures_updated
BEFORE UPDATE ON public.closures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La data di fine deve seguire quella di inizio';
  END IF;
  IF char_length(btrim(NEW.reason)) < 2 THEN
    RAISE EXCEPTION 'Indica un motivo per la chiusura';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER closures_validate
BEFORE INSERT OR UPDATE ON public.closures
FOR EACH ROW EXECUTE FUNCTION public.validate_closure();

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
  v_date date;
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

  v_local := _starts_at AT TIME ZONE 'Europe/Rome';
  v_date := v_local::date;
  v_weekday := EXTRACT(DOW FROM v_local)::smallint;
  v_start := v_local::time;
  v_end := (v_local + make_interval(mins => v_duration))::time;

  -- Chiusure straordinarie e ferie
  IF EXISTS (
    SELECT 1 FROM public.closures c
    WHERE c.tenant_id = v_tenant_id
      AND (c.location_id IS NULL OR c.location_id = _location_id)
      AND v_date BETWEEN c.start_date AND c.end_date
  ) THEN
    RAISE EXCEPTION 'Il centro è chiuso in questa data';
  END IF;

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