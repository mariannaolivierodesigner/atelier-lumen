ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.service_categories TO service_role;

CREATE POLICY "staff legge tutto il listino"
  ON public.services FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "staff crea trattamenti"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "staff aggiorna trattamenti"
  ON public.services FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "responsabili eliminano trattamenti"
  ON public.services FOR DELETE TO authenticated
  USING (public.has_tenant_role(tenant_id, 'owner'::app_role) OR public.has_tenant_role(tenant_id, 'manager'::app_role));

CREATE POLICY "staff legge tutte le categorie"
  ON public.service_categories FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "staff crea categorie"
  ON public.service_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "staff aggiorna categorie"
  ON public.service_categories FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "responsabili eliminano categorie"
  ON public.service_categories FOR DELETE TO authenticated
  USING (public.has_tenant_role(tenant_id, 'owner'::app_role) OR public.has_tenant_role(tenant_id, 'manager'::app_role));