CREATE OR REPLACE FUNCTION public.verificar_contrato_totalmente_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total int;
  v_assinadas int;
  v_contrato public.contratos;
BEGIN
  SELECT * INTO v_contrato FROM public.contratos WHERE id = NEW.contrato_id;
  IF v_contrato.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.assinaturas_digitais
  WHERE contrato_id = NEW.contrato_id;

  SELECT COUNT(*) INTO v_assinadas
  FROM public.assinaturas_digitais
  WHERE contrato_id = NEW.contrato_id
    AND verificado = true
    AND status = 'assinado';

  IF v_total > 0 AND v_total = v_assinadas THEN
    UPDATE public.contratos
    SET status = 'assinado',
        data_assinatura = COALESCE(data_assinatura, now()),
        updated_at = now()
    WHERE id = NEW.contrato_id
      AND status NOT IN ('assinado', 'encerrado', 'cancelado');

    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Contrato ativo',
      'Todas as assinaturas foram concluídas. O contrato está agora ATIVO.',
      'system'::tipo_alerta,
      CURRENT_DATE
    );
  ELSIF v_total > 0 THEN
    UPDATE public.contratos
    SET status = 'enviado',
        data_assinatura = NULL,
        updated_at = now()
    WHERE id = NEW.contrato_id
      AND status NOT IN ('enviado', 'encerrado', 'cancelado');
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.verificado = true
     AND NEW.status = 'assinado'
     AND (OLD.verificado IS DISTINCT FROM NEW.verificado OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Assinatura concluída',
      NEW.signatario_nome || ' assinou o contrato.',
      'system'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'pendente' AND COALESCE(NEW.verificado, false) = false THEN
    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Nova assinatura solicitada',
      'Foi-lhe pedida a assinatura de um contrato. Aceda à aba "Assinaturas".',
      'system'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$function$;