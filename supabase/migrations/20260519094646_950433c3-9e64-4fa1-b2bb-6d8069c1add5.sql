DROP POLICY IF EXISTS "Signatories can view contracts they must sign" ON public.contratos;
CREATE POLICY "Signatories can view contracts they must sign"
ON public.contratos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assinaturas_digitais ad
    WHERE ad.contrato_id = contratos.id
      AND public.assinatura_pertence_ao_utilizador(ad.signatario_user_id, ad.signatario_email::text, ad.signatario_tipo::text, ad.signatario_id)
  )
);

REVOKE EXECUTE ON FUNCTION public.preencher_assinatura_signatario_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.preencher_assinatura_signatario_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.preencher_assinatura_signatario_user_id() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.assinatura_pertence_ao_utilizador(uuid, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assinatura_pertence_ao_utilizador(uuid, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assinatura_pertence_ao_utilizador(uuid, text, text, uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM anon;
REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM authenticated;