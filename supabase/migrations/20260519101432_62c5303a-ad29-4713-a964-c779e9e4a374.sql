-- Restore EXECUTE grants on signature ownership helper (lost when redefined)
GRANT EXECUTE ON FUNCTION public.assinatura_pertence_ao_utilizador(uuid, text, text, uuid) TO authenticated, anon, public;

-- Also widen the SELECT policy on contratos so signatories always see their contracts
DROP POLICY IF EXISTS "Signatories can view contracts they must sign" ON public.contratos;
CREATE POLICY "Signatories can view contracts they must sign"
ON public.contratos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assinaturas_digitais ad
    WHERE ad.contrato_id = contratos.id
      AND (
        ad.signatario_user_id = auth.uid()
        OR lower(COALESCE(ad.signatario_email::text, '')) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
      )
  )
);

-- Allow signatories to read the linked template (needed for the contract reader)
DROP POLICY IF EXISTS "Signatories can view templates of their contracts" ON public.templates_contrato;
CREATE POLICY "Signatories can view templates of their contracts"
ON public.templates_contrato
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contratos c
    JOIN public.assinaturas_digitais ad ON ad.contrato_id = c.id
    WHERE c.template_id = templates_contrato.id
      AND (
        ad.signatario_user_id = auth.uid()
        OR lower(COALESCE(ad.signatario_email::text, '')) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
      )
  )
);