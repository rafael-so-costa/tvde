-- Função: ao assinar contrato de aluguer, associa motorista ao veículo
CREATE OR REPLACE FUNCTION public.auto_associar_motorista_veiculo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só atua para contratos de aluguer (particular ou empresa)
  IF NEW.tipo NOT IN ('aluguer') THEN
    RETURN NEW;
  END IF;

  -- Só quando status muda para assinado (ou é criado já assinado)
  IF NEW.status <> 'assinado' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status = 'assinado') THEN
    RETURN NEW; -- já estava assinado, não reprocessar
  END IF;

  -- Precisa de motorista e veículo
  IF NEW.motorista_id IS NULL OR NEW.veiculo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Finalizar atribuições ativas anteriores deste veículo (a outros motoristas)
  UPDATE public.contratos_ativos_veiculos
  SET ativo = false,
      data_fim = now()
  WHERE veiculo_id = NEW.veiculo_id
    AND ativo = true
    AND motorista_id <> NEW.motorista_id;

  -- Finalizar atribuições ativas anteriores deste motorista (a outros veículos)
  UPDATE public.contratos_ativos_veiculos
  SET ativo = false,
      data_fim = now()
  WHERE motorista_id = NEW.motorista_id
    AND ativo = true
    AND veiculo_id <> NEW.veiculo_id;

  -- Inserir novo vínculo se ainda não existir ativo
  IF NOT EXISTS (
    SELECT 1 FROM public.contratos_ativos_veiculos
    WHERE motorista_id = NEW.motorista_id
      AND veiculo_id = NEW.veiculo_id
      AND ativo = true
  ) THEN
    INSERT INTO public.contratos_ativos_veiculos
      (tenant_id, motorista_id, veiculo_id, contrato_id, ativo, data_inicio)
    VALUES
      (NEW.tenant_id, NEW.motorista_id, NEW.veiculo_id, NEW.id, true, COALESCE(NEW.data_inicio::timestamptz, now()));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_associar_motorista_veiculo ON public.contratos;
CREATE TRIGGER trg_auto_associar_motorista_veiculo
AFTER INSERT OR UPDATE OF status, motorista_id, veiculo_id ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.auto_associar_motorista_veiculo();