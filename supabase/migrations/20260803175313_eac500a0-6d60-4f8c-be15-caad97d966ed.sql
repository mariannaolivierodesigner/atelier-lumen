CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');

CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

GRANT SELECT ON public.tenant_users TO authenticated;
GRANT ALL ON public.tenant_users TO service_role;

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membri leggono la propria appartenenza"
ON public.tenant_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER tenant_users_updated
BEFORE UPDATE ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND is_active
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND role = _role
      AND is_active
  )
$$;

CREATE POLICY "staff legge le prenotazioni del centro"
ON public.bookings FOR SELECT TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "staff aggiorna le prenotazioni del centro"
ON public.bookings FOR UPDATE TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "staff crea prenotazioni interne"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "responsabili eliminano prenotazioni"
ON public.bookings FOR DELETE TO authenticated
USING (
  public.has_tenant_role(tenant_id, 'owner')
  OR public.has_tenant_role(tenant_id, 'manager')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
