CREATE OR REPLACE FUNCTION public.encerrar_contrato_apos_devolucao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contrato public.contratos;
BEGIN
  IF NEW.contrato_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_contrato FROM public.contratos WHERE id = NEW.contrato_id;
  IF v_contrato.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Apenas encerrar contratos de aluguer ainda ativos (assinados)
  IF v_contrato.tipo = 'aluguer' AND v_contrato.status = 'assinado' THEN
    UPDATE public.contratos
       SET status = 'encerrado',
           bloqueado = true,
           data_fim = COALESCE(data_fim, now()::date),
           updated_at = now()
     WHERE id = NEW.contrato_id;

    -- Finalizar associação ativa motorista-veículo deste contrato
    UPDATE public.contratos_ativos_veiculos
       SET ativo = false, data_fim = now()
     WHERE contrato_id = NEW.contrato_id AND ativo = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encerrar_contrato_apos_devolucao ON public.checklist_devolucao;
CREATE TRIGGER trg_encerrar_contrato_apos_devolucao
AFTER INSERT ON public.checklist_devolucao
FOR EACH ROW
EXECUTE FUNCTION public.encerrar_contrato_apos_devolucao();