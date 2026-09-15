REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM anon;
REVOKE EXECUTE ON FUNCTION public.proteger_assinatura_remota_signatario() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.verificar_contrato_totalmente_assinado() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verificar_contrato_totalmente_assinado() FROM anon;
REVOKE EXECUTE ON FUNCTION public.verificar_contrato_totalmente_assinado() FROM authenticated;