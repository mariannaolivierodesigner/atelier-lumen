REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, public.app_role) FROM public, anon, authenticated;
