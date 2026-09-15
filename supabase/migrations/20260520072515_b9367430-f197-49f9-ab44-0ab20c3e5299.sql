
CREATE OR REPLACE FUNCTION public.is_external_profile(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('motorista'::app_role,'proprietario'::app_role)
    )
    AND NOT public.is_tenant_admin(_user_id);
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'veiculos','multas','sinistros','contratos',
    'checklist_entrega','checklist_devolucao','checklist_records'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS external_readonly_no_insert ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS external_readonly_no_update ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS external_readonly_no_delete ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY external_readonly_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_external_profile(auth.uid()));', t);
    EXECUTE format(
      'CREATE POLICY external_readonly_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_external_profile(auth.uid())) WITH CHECK (NOT public.is_external_profile(auth.uid()));', t);
    EXECUTE format(
      'CREATE POLICY external_readonly_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_external_profile(auth.uid()));', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "external_readonly_no_storage_insert" ON storage.objects;
CREATE POLICY "external_readonly_no_storage_insert"
ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id NOT IN ('documents','vehicle-photos','invoices','checklist-media','contract-templates')
  OR NOT public.is_external_profile(auth.uid())
);

DROP POLICY IF EXISTS "external_readonly_no_storage_update" ON storage.objects;
CREATE POLICY "external_readonly_no_storage_update"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  bucket_id NOT IN ('documents','vehicle-photos','invoices','checklist-media','contract-templates')
  OR NOT public.is_external_profile(auth.uid())
);

DROP POLICY IF EXISTS "external_readonly_no_storage_delete" ON storage.objects;
CREATE POLICY "external_readonly_no_storage_delete"
ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  bucket_id NOT IN ('documents','vehicle-photos','invoices','checklist-media','contract-templates')
  OR NOT public.is_external_profile(auth.uid())
);
