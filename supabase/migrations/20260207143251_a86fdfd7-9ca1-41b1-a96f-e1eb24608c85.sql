-- Regra: valor_semanal deve ser preenchido automaticamente a partir do veículo (veiculos.valor_aluguel)
-- Se não existir veículo associado, valor_semanal deve ficar NULL.

CREATE OR REPLACE FUNCTION public.sync_contrato_valor_semanal_from_veiculo()
RETURNS trigger AS $$
DECLARE
  v_valor_aluguel numeric;
BEGIN
  IF NEW.veiculo_id IS NULL THEN
    NEW.valor_semanal := NULL;
    RETURN NEW;
  END IF;

  SELECT valor_aluguel
    INTO v_valor_aluguel
  FROM public.veiculos
  WHERE id = NEW.veiculo_id;

  NEW.valor_semanal := v_valor_aluguel;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_contrato_valor_semanal ON public.contratos;

CREATE TRIGGER trg_sync_contrato_valor_semanal
BEFORE INSERT OR UPDATE OF veiculo_id, valor_semanal
ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.sync_contrato_valor_semanal_from_veiculo();

-- Backfill: atualiza contratos existentes
UPDATE public.contratos c
SET valor_semanal = NULL
WHERE c.veiculo_id IS NULL;

UPDATE public.contratos c
SET valor_semanal = v.valor_aluguel
FROM public.veiculos v
WHERE c.veiculo_id = v.id;