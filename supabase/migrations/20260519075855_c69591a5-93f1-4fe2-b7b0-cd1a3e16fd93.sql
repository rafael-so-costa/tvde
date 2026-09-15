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
  IF v_contrato.id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total
    FROM public.assinaturas_digitais WHERE contrato_id = NEW.contrato_id;
  SELECT COUNT(*) INTO v_assinadas
    FROM public.assinaturas_digitais
    WHERE contrato_id = NEW.contrato_id AND verificado = true;

  IF v_total > 0 AND v_total = v_assinadas THEN
    UPDATE public.contratos
       SET status = 'assinado',
           data_assinatura = COALESCE(data_assinatura, now()),
           updated_at = now()
     WHERE id = NEW.contrato_id
       AND status <> 'assinado'
       AND status <> 'encerrado';

    IF NEW.solicitado_por IS NOT NULL THEN
      INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
      VALUES (
        NEW.tenant_id,
        'Contrato ativo',
        'Todas as assinaturas foram concluídas. O contrato está agora ATIVO.',
        'documento_motorista'::tipo_alerta,
        CURRENT_DATE
      );
    END IF;
  ELSIF v_total > 0 THEN
    -- Some signatures still pending: ensure contract is in 'enviado' (Pendente)
    UPDATE public.contratos
       SET status = 'enviado',
           updated_at = now()
     WHERE id = NEW.contrato_id
       AND status NOT IN ('encerrado', 'cancelado', 'enviado');
  END IF;

  -- Per-signature notification
  IF TG_OP = 'UPDATE' AND NEW.verificado = true
     AND (OLD.verificado IS DISTINCT FROM NEW.verificado)
     AND NEW.solicitado_por IS NOT NULL THEN
    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Assinatura concluída',
      NEW.signatario_nome || ' assinou o contrato.',
      'documento_motorista'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  -- Notify the requested signatory when a new pending signature is created
  IF TG_OP = 'INSERT' AND NEW.status = 'pendente' AND NEW.verificado = false THEN
    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Nova assinatura solicitada',
      'Foi-lhe pedida a assinatura de um contrato. Aceda à aba "Assinaturas".',
      'documento_motorista'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$function$;