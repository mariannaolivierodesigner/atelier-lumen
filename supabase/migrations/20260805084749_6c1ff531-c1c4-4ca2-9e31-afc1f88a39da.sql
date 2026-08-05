DROP POLICY IF EXISTS "staff legge tutto il listino" ON public.services;
DROP POLICY IF EXISTS "staff crea trattamenti" ON public.services;
DROP POLICY IF EXISTS "staff aggiorna trattamenti" ON public.services;
DROP POLICY IF EXISTS "responsabili eliminano trattamenti" ON public.services;
DROP POLICY IF EXISTS "staff legge tutte le categorie" ON public.service_categories;
DROP POLICY IF EXISTS "staff crea categorie" ON public.service_categories;
DROP POLICY IF EXISTS "staff aggiorna categorie" ON public.service_categories;
DROP POLICY IF EXISTS "responsabili eliminano categorie" ON public.service_categories;

CREATE POLICY "staff legge tutto il listino"
  ON public.services FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = services.tenant_id AND tu.is_active));

CREATE POLICY "staff crea trattamenti"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = services.tenant_id AND tu.is_active));

CREATE POLICY "staff aggiorna trattamenti"
  ON public.services FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = services.tenant_id AND tu.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = services.tenant_id AND tu.is_active));

CREATE POLICY "responsabili eliminano trattamenti"
  ON public.services FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = services.tenant_id AND tu.is_active
      AND tu.role IN ('owner'::app_role, 'manager'::app_role)));

CREATE POLICY "staff legge tutte le categorie"
  ON public.service_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_categories.tenant_id AND tu.is_active));

CREATE POLICY "staff crea categorie"
  ON public.service_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_categories.tenant_id AND tu.is_active));

CREATE POLICY "staff aggiorna categorie"
  ON public.service_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_categories.tenant_id AND tu.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_categories.tenant_id AND tu.is_active));

CREATE POLICY "responsabili eliminano categorie"
  ON public.service_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_categories.tenant_id AND tu.is_active
      AND tu.role IN ('owner'::app_role, 'manager'::app_role)));