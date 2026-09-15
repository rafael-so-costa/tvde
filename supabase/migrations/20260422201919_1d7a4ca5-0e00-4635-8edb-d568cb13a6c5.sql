-- Atualizar a função de associação automática para respeitar o limite de 3 motoristas ativos
CREATE OR REPLACE FUNCTION public.auto_associar_motorista_veiculo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count integer;
BEGIN
  IF NEW.tipo NOT IN ('aluguer') THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'assinado' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status = 'assinado') THEN
    RETURN NEW;
  END IF;

  IF NEW.motorista_id IS NULL OR NEW.veiculo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se este motorista já está ativo neste veículo, nada a fazer
  IF EXISTS (
    SELECT 1 FROM public.contratos_ativos_veiculos
    WHERE motorista_id = NEW.motorista_id
      AND veiculo_id = NEW.veiculo_id
      AND ativo = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Finalizar atribuições ativas anteriores deste motorista (a outros veículos) - 1 motorista = 1 veículo
  UPDATE public.contratos_ativos_veiculos
  SET ativo = false, data_fim = now()
  WHERE motorista_id = NEW.motorista_id
    AND ativo = true
    AND veiculo_id <> NEW.veiculo_id;

  -- Verificar limite de 3 motoristas ativos no veículo
  SELECT count(*) INTO v_active_count
  FROM public.contratos_ativos_veiculos
  WHERE veiculo_id = NEW.veiculo_id
    AND ativo = true;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'LIMITE_MOTORISTAS_ATIVOS: Este veículo já possui 3 motoristas ativos. Para adicionar um novo, é necessário substituir um dos atuais.';
  END IF;

  INSERT INTO public.contratos_ativos_veiculos
    (tenant_id, motorista_id, veiculo_id, contrato_id, ativo, data_inicio)
  VALUES
    (NEW.tenant_id, NEW.motorista_id, NEW.veiculo_id, NEW.id, true, COALESCE(NEW.data_inicio::timestamptz, now()));

  RETURN NEW;
END;
$$;

-- Função utilitária para atribuir manualmente (com validação de limite)
CREATE OR REPLACE FUNCTION public.atribuir_motorista_veiculo(
  _motorista_id uuid,
  _veiculo_id uuid,
  _substituir_motorista_id uuid DEFAULT NULL
)
RETURNS public.contratos_ativos_veiculos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_active_count integer;
  v_row public.contratos_ativos_veiculos;
BEGIN
  v_tenant_id := public.get_user_tenant_id(auth.uid());

  IF NOT public.is_tenant_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Já ativo neste veículo? devolver registo existente
  SELECT * INTO v_row FROM public.contratos_ativos_veiculos
  WHERE motorista_id = _motorista_id AND veiculo_id = _veiculo_id AND ativo = true LIMIT 1;
  IF v_row.id IS NOT NULL THEN
    RETURN v_row;
  END IF;

  -- Finalizar associações ativas deste motorista a outros veículos
  UPDATE public.contratos_ativos_veiculos
  SET ativo = false, data_fim = now()
  WHERE motorista_id = _motorista_id AND ativo = true AND veiculo_id <> _veiculo_id;

  -- Substituição explícita: finalizar o motorista indicado
  IF _substituir_motorista_id IS NOT NULL THEN
    UPDATE public.contratos_ativos_veiculos
    SET ativo = false, data_fim = now()
    WHERE veiculo_id = _veiculo_id
      AND motorista_id = _substituir_motorista_id
      AND ativo = true;
  END IF;

  SELECT count(*) INTO v_active_count
  FROM public.contratos_ativos_veiculos
  WHERE veiculo_id = _veiculo_id AND ativo = true;

  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'LIMITE_MOTORISTAS_ATIVOS: Este veículo já possui 3 motoristas ativos. Para adicionar um novo, é necessário substituir um dos atuais.';
  END IF;

  INSERT INTO public.contratos_ativos_veiculos
    (tenant_id, motorista_id, veiculo_id, contrato_id, ativo, data_inicio)
  VALUES (v_tenant_id, _motorista_id, _veiculo_id, NULL, true, now())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;