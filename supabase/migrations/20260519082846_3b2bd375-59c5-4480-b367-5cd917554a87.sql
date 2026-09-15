CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_digitais_contrato_placeholder_uidx
ON public.assinaturas_digitais (contrato_id, placeholder)
WHERE placeholder IS NOT NULL;

DROP POLICY IF EXISTS "Signatories can view their signatures" ON public.assinaturas_digitais;
CREATE POLICY "Signatories can view their signatures"
ON public.assinaturas_digitais
FOR SELECT
USING (
  lower(signatario_email::text) = lower(current_setting('request.jwt.claim.email'::text, true))
);

DROP POLICY IF EXISTS "Signatarios can update their own signatures" ON public.assinaturas_digitais;
CREATE POLICY "Signatarios can update their own signatures"
ON public.assinaturas_digitais
FOR UPDATE
USING (
  lower(signatario_email::text) = lower(current_setting('request.jwt.claim.email'::text, true))
)
WITH CHECK (
  lower(signatario_email::text) = lower(current_setting('request.jwt.claim.email'::text, true))
);

CREATE OR REPLACE FUNCTION public.proteger_assinatura_remota_signatario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_tenant_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF lower(OLD.signatario_email::text) = lower(current_setting('request.jwt.claim.email'::text, true)) THEN
    NEW.id := OLD.id;
    NEW.contrato_id := OLD.contrato_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.signatario_tipo := OLD.signatario_tipo;
    NEW.signatario_id := OLD.signatario_id;
    NEW.signatario_nome := OLD.signatario_nome;
    NEW.signatario_email := OLD.signatario_email;
    NEW.placeholder := OLD.placeholder;
    NEW.solicitado_por := OLD.solicitado_por;
    NEW.solicitado_em := OLD.solicitado_em;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar esta assinatura';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_assinatura_remota_signatario ON public.assinaturas_digitais;
CREATE TRIGGER trg_proteger_assinatura_remota_signatario
BEFORE UPDATE ON public.assinaturas_digitais
FOR EACH ROW
EXECUTE FUNCTION public.proteger_assinatura_remota_signatario();

CREATE OR REPLACE FUNCTION public.verificar_contrato_totalmente_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      'documento_motorista'::tipo_alerta,
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
      'documento_motorista'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'pendente' AND COALESCE(NEW.verificado, false) = false THEN
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
$$;

DROP TRIGGER IF EXISTS trg_verificar_contrato_assinado ON public.assinaturas_digitais;
CREATE TRIGGER trg_verificar_contrato_assinado
AFTER INSERT OR UPDATE OF verificado, status ON public.assinaturas_digitais
FOR EACH ROW
EXECUTE FUNCTION public.verificar_contrato_totalmente_assinado();