CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  birth_date date,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  marketing_consent boolean NOT NULL DEFAULT false,
  privacy_consent boolean NOT NULL DEFAULT false,
  consent_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customers_tenant_email_key ON public.customers (tenant_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX customers_tenant_idx ON public.customers (tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff legge i clienti del centro" ON public.customers
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "staff crea clienti" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "staff aggiorna clienti" ON public.customers
  FOR UPDATE TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "responsabili eliminano clienti" ON public.customers
  FOR DELETE TO authenticated USING (public.has_tenant_role(tenant_id, 'owner') OR public.has_tenant_role(tenant_id, 'manager'));

CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_notes_customer_idx ON public.customer_notes (customer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff legge le note del centro" ON public.customer_notes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "staff crea note" ON public.customer_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "staff elimina le proprie note" ON public.customer_notes
  FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id) AND author_id = auth.uid());

ALTER TABLE public.bookings ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX bookings_customer_idx ON public.bookings (customer_id);