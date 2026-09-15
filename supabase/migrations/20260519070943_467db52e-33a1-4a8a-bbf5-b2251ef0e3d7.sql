
-- 1. Add new columns to assinaturas_digitais
ALTER TABLE public.assinaturas_digitais
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS solicitado_por uuid,
  ADD COLUMN IF NOT EXISTS solicitado_em timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS placeholder text;

CREATE INDEX IF NOT EXISTS idx_assinaturas_email_status
  ON public.assinaturas_digitais (lower(signatario_email), status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_contrato
  ON public.assinaturas_digitais (contrato_id);

-- 2. Allow signatários (by JWT email) to UPDATE their pending signatures
DROP POLICY IF EXISTS "Signatarios can update their own signatures" ON public.assinaturas_digitais;
CREATE POLICY "Signatarios can update their own signatures"
ON public.assinaturas_digitais
FOR UPDATE
USING (lower(signatario_email) = lower(current_setting('request.jwt.claim.email', true)))
WITH CHECK (lower(signatario_email) = lower(current_setting('request.jwt.claim.email', true)));

-- 3. Trigger: when all signatures for a contract are verified, set contract to 'assinado' (Active)
CREATE OR REPLACE FUNCTION public.verificar_contrato_totalmente_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Notify requester that contract is now active
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
  ELSE
    UPDATE public.contratos
       SET status = 'enviado',
           updated_at = now()
     WHERE id = NEW.contrato_id
       AND status = 'rascunho';
  END IF;

  -- Per-signature notification
  IF NEW.verificado = true AND (OLD.verificado IS DISTINCT FROM NEW.verificado) AND NEW.solicitado_por IS NOT NULL THEN
    INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento)
    VALUES (
      NEW.tenant_id,
      'Assinatura concluída',
      NEW.signatario_nome || ' assinou o contrato.',
      'documento_motorista'::tipo_alerta,
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verificar_contrato_assinado ON public.assinaturas_digitais;
CREATE TRIGGER trg_verificar_contrato_assinado
AFTER INSERT OR UPDATE OF verificado ON public.assinaturas_digitais
FOR EACH ROW
EXECUTE FUNCTION public.verificar_contrato_totalmente_assinado();
