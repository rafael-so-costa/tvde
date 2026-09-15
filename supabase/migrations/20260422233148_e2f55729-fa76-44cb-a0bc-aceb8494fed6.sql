-- Adicionar colunas para devolução
ALTER TABLE public.alugueres
  ADD COLUMN IF NOT EXISTS devolucao_tipo text,
  ADD COLUMN IF NOT EXISTS devolucao_dias_atraso integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devolucao_valor_dia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devolucao_multa_atraso numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devolucao_multas_adicionais jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS devolucao_penalizacoes_checklist numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devolucao_total_pagar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS devolucao_declaracao_aceite boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS devolucao_assinatura_motorista_url text,
  ADD COLUMN IF NOT EXISTS devolucao_assinatura_empresa_url text,
  ADD COLUMN IF NOT EXISTS devolucao_pdf_url text,
  ADD COLUMN IF NOT EXISTS devolucao_observacoes text;

-- RPC para finalizar devolução
CREATE OR REPLACE FUNCTION public.finalizar_devolucao_aluguer(
  _aluguer_id uuid,
  _checklist_devolucao_id uuid,
  _contrato_prestacao_id uuid,
  _devolucao_tipo text,
  _dias_atraso integer,
  _valor_dia numeric,
  _multa_atraso numeric,
  _multas_adicionais jsonb,
  _penalizacoes_checklist numeric,
  _total_pagar numeric,
  _assinatura_motorista_url text,
  _assinatura_empresa_url text,
  _pdf_url text,
  _observacoes text
) RETURNS public.alugueres
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

  -- Encerrar contrato de aluguer
  IF v_row.contrato_aluguer_id IS NOT NULL THEN
    UPDATE public.contratos
       SET status = 'encerrado', bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date), updated_at = now()
     WHERE id = v_row.contrato_aluguer_id AND status IN ('assinado', 'enviado');
  END IF;

  -- Encerrar contrato de prestação (o existente ou o novo passado)
  IF _contrato_prestacao_id IS NOT NULL THEN
    UPDATE public.contratos
       SET status = 'encerrado', bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date), updated_at = now()
     WHERE id = _contrato_prestacao_id AND status IN ('assinado', 'enviado');
  ELSIF v_row.contrato_prestacao_id IS NOT NULL THEN
    UPDATE public.contratos
       SET status = 'encerrado', bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date), updated_at = now()
     WHERE id = v_row.contrato_prestacao_id AND status IN ('assinado', 'enviado');
  END IF;

  -- Libertar motorista do veículo
  UPDATE public.contratos_ativos_veiculos
     SET ativo = false, data_fim = now()
   WHERE (contrato_id = v_row.contrato_aluguer_id
          OR (motorista_id = v_row.motorista_id AND veiculo_id = v_row.veiculo_id))
     AND ativo = true;

  -- Atualizar aluguer
  UPDATE public.alugueres
     SET status = 'finalizado',
         data_finalizacao = now(),
         data_fim = COALESCE(data_fim, now()::date),
         checklist_devolucao_id = COALESCE(_checklist_devolucao_id, checklist_devolucao_id),
         contrato_prestacao_id = COALESCE(_contrato_prestacao_id, contrato_prestacao_id),
         devolucao_tipo = _devolucao_tipo,
         devolucao_dias_atraso = COALESCE(_dias_atraso, 0),
         devolucao_valor_dia = COALESCE(_valor_dia, 0),
         devolucao_multa_atraso = COALESCE(_multa_atraso, 0),
         devolucao_multas_adicionais = COALESCE(_multas_adicionais, '[]'::jsonb),
         devolucao_penalizacoes_checklist = COALESCE(_penalizacoes_checklist, 0),
         devolucao_total_pagar = COALESCE(_total_pagar, 0),
         devolucao_declaracao_aceite = true,
         devolucao_assinatura_motorista_url = _assinatura_motorista_url,
         devolucao_assinatura_empresa_url = _assinatura_empresa_url,
         devolucao_pdf_url = _pdf_url,
         devolucao_observacoes = _observacoes,
         updated_at = now()
   WHERE id = _aluguer_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;