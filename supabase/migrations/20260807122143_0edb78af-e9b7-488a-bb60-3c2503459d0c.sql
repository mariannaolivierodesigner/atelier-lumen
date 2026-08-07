ALTER TABLE public.service_availability
  ADD CONSTRAINT service_availability_service_weekday_key UNIQUE (service_id, weekday);

DROP POLICY "responsabili eliminano disponibilita" ON public.service_availability;

CREATE POLICY "staff elimina disponibilita" ON public.service_availability
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid() AND tu.tenant_id = service_availability.tenant_id AND tu.is_active));