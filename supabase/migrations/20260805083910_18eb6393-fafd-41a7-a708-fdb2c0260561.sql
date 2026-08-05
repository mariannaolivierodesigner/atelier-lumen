-- 1) Remove the permissive anon insert policy on bookings
DROP POLICY IF EXISTS "anyone can request a booking" ON public.bookings;

-- 2) Controlled, validated public booking intake
CREATE OR REPLACE FUNCTION public.request_booking(
  _tenant_slug text,
  _location_id uuid,
  _service_id uuid,
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
  v_duration int;
  v_name text := btrim(coalesce(_customer_name, ''));
  v_email text := lower(btrim(coalesce(_customer_email, '')));
  v_phone text := nullif(btrim(coalesce(_customer_phone, '')), '');
  v_notes text := nullif(btrim(coalesce(_notes, '')), '');
  v_id uuid;
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
  WHERE id = _service_id AND tenant_id = v_tenant_id AND is_active;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Trattamento non valido';
  END IF;

  IF _staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = _staff_id AND tenant_id = v_tenant_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Operatore non valido';
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
$$;

REVOKE ALL ON FUNCTION public.request_booking(text, uuid, uuid, uuid, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking(text, uuid, uuid, uuid, timestamptz, text, text, text, text) TO anon, authenticated, service_role;

-- 3) Prevent self-escalation on tenant membership, regardless of future policies
CREATE OR REPLACE FUNCTION public.prevent_tenant_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / internal jobs (no auth context) are allowed.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Non puoi assegnare a te stesso una appartenenza';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.user_id = auth.uid()
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.is_active IS DISTINCT FROM OLD.is_active
          OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    RAISE EXCEPTION 'Non puoi modificare il tuo ruolo o la tua abilitazione';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_users_no_self_escalation ON public.tenant_users;
CREATE TRIGGER tenant_users_no_self_escalation
BEFORE INSERT OR UPDATE ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_role_self_escalation();