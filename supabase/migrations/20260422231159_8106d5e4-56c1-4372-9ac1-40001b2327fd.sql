
-- Tabela de alugueres (perfis de aluguer)
CREATE TYPE public.status_aluguer AS ENUM ('rascunho', 'ativo', 'finalizado', 'cancelado');

CREATE TABLE public.alugueres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status public.status_aluguer NOT NULL DEFAULT 'rascunho',
  motorista_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  proprietario_id uuid REFERENCES public.proprietarios(id) ON DELETE SET NULL,
  contrato_aluguer_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  contrato_prestacao_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  checklist_entrega_id uuid REFERENCES public.checklist_entrega(id) ON DELETE SET NULL,
  checklist_devolucao_id uuid REFERENCES public.checklist_devolucao(id) ON DELETE SET NULL,
  data_inicio date,
  data_fim date,
  data_finalizacao timestamptz,
  rascunho_passo integer NOT NULL DEFAULT 1,
  rascunho_dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alugueres_tenant_status ON public.alugueres(tenant_id, status);
CREATE INDEX idx_alugueres_motorista ON public.alugueres(motorista_id);
CREATE INDEX idx_alugueres_veiculo ON public.alugueres(veiculo_id);

ALTER TABLE public.alugueres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage alugueres"
ON public.alugueres FOR ALL
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Motoristas view own alugueres"
ON public.alugueres FOR SELECT
USING (motorista_id IN (SELECT id FROM public.motoristas WHERE user_id = auth.uid()));

CREATE POLICY "Proprietarios view own alugueres"
ON public.alugueres FOR SELECT
USING (proprietario_id IN (SELECT id FROM public.proprietarios WHERE user_id = auth.uid()));

CREATE TRIGGER trg_alugueres_updated_at
BEFORE UPDATE ON public.alugueres
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC para finalizar aluguer manualmente (encerra contratos)
CREATE OR REPLACE FUNCTION public.finalizar_aluguer(_aluguer_id uuid)
RETURNS public.alugueres
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.alugueres;
BEGIN
  IF NOT public.is_tenant_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_row FROM public.alugueres WHERE id = _aluguer_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Aluguer não encontrado';
  END IF;

  -- Encerrar contratos vinculados (apenas se ainda assinados)
  IF v_row.contrato_aluguer_id IS NOT NULL THEN
    UPDATE public.contratos
       SET status = 'encerrado', bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date), updated_at = now()
     WHERE id = v_row.contrato_aluguer_id AND status = 'assinado';
  END IF;

  IF v_row.contrato_prestacao_id IS NOT NULL THEN
    UPDATE public.contratos
       SET status = 'encerrado', bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date), updated_at = now()
     WHERE id = v_row.contrato_prestacao_id AND status = 'assinado';
  END IF;

  -- Finalizar associação motorista-veículo
  UPDATE public.contratos_ativos_veiculos
     SET ativo = false, data_fim = now()
   WHERE (contrato_id = v_row.contrato_aluguer_id OR
         (motorista_id = v_row.motorista_id AND veiculo_id = v_row.veiculo_id))
     AND ativo = true;

  UPDATE public.alugueres
     SET status = 'finalizado',
         data_finalizacao = now(),
         data_fim = COALESCE(data_fim, now()::date)
   WHERE id = _aluguer_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Trigger: ao registar checklist_devolucao vinculado, finalizar aluguer correspondente
CREATE OR REPLACE FUNCTION public.finalizar_aluguer_apos_devolucao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contrato_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.alugueres
     SET status = 'finalizado',
         data_finalizacao = now(),
         data_fim = COALESCE(data_fim, now()::date),
         checklist_devolucao_id = NEW.id
   WHERE contrato_aluguer_id = NEW.contrato_id
     AND status = 'ativo';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finalizar_aluguer_apos_devolucao ON public.checklist_devolucao;
CREATE TRIGGER trg_finalizar_aluguer_apos_devolucao
AFTER INSERT ON public.checklist_devolucao
FOR EACH ROW EXECUTE FUNCTION public.finalizar_aluguer_apos_devolucao();
