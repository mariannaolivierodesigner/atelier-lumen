CREATE TABLE public.catalog_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catalog_audit_log_tenant_created_idx ON public.catalog_audit_log (tenant_id, created_at DESC);
CREATE INDEX catalog_audit_log_entity_idx ON public.catalog_audit_log (entity_type, entity_id);

GRANT SELECT ON public.catalog_audit_log TO authenticated;
GRANT ALL ON public.catalog_audit_log TO service_role;

ALTER TABLE public.catalog_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own tenant catalog audit log"
ON public.catalog_audit_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = catalog_audit_log.tenant_id
    AND tu.user_id = auth.uid()
    AND tu.is_active
));

CREATE OR REPLACE FUNCTION public.log_catalog_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_old jsonb;
  v_new jsonb;
  v_tenant uuid;
  v_action text;
  v_label text;
  v_changes jsonb := '[]'::jsonb;
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_key text;
  v_ignored text[] := ARRAY['id','tenant_id','created_at','updated_at'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD); v_action := 'delete';
  ELSIF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW); v_action := 'create';
  ELSE
    v_row := to_jsonb(NEW); v_action := 'update';
  END IF;

  v_tenant := (v_row->>'tenant_id')::uuid;
  IF v_tenant IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_TABLE_NAME = 'services' OR TG_TABLE_NAME = 'service_categories' THEN
    v_label := v_row->>'name';
  ELSIF TG_TABLE_NAME = 'service_availability' THEN
    v_label := (SELECT s.name FROM public.services s WHERE s.id = (v_row->>'service_id')::uuid);
  ELSIF TG_TABLE_NAME = 'service_staff' THEN
    v_label := (SELECT s.name FROM public.services s WHERE s.id = (v_row->>'service_id')::uuid);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF NOT (v_key = ANY(v_ignored))
         AND (v_old->v_key) IS DISTINCT FROM (v_new->v_key) THEN
        v_changes := v_changes || jsonb_build_array(jsonb_build_object(
          'field', v_key, 'from', v_old->v_key, 'to', v_new->v_key));
      END IF;
    END LOOP;
    IF jsonb_array_length(v_changes) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT tu.full_name INTO v_actor_name
    FROM public.tenant_users tu
    WHERE tu.user_id = v_actor AND tu.tenant_id = v_tenant
    LIMIT 1;
    IF v_actor_name IS NULL THEN
      SELECT u.email INTO v_actor_name FROM auth.users u WHERE u.id = v_actor;
    END IF;
  END IF;

  INSERT INTO public.catalog_audit_log (
    tenant_id, entity_type, entity_id, entity_label, action, changes, actor_id, actor_name
  ) VALUES (
    v_tenant, TG_TABLE_NAME, (v_row->>'id')::uuid, v_label, v_action, v_changes, v_actor,
    COALESCE(v_actor_name, 'Sistema')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_catalog_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER services_audit
AFTER INSERT OR UPDATE OR DELETE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

CREATE TRIGGER service_categories_audit
AFTER INSERT OR UPDATE OR DELETE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

CREATE TRIGGER service_availability_audit
AFTER INSERT OR UPDATE OR DELETE ON public.service_availability
FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

CREATE TRIGGER service_staff_audit
AFTER INSERT OR UPDATE OR DELETE ON public.service_staff
FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();