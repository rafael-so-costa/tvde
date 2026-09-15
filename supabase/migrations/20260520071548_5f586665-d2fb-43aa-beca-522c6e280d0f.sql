
-- 1. Colunas para ligação à entidade e sub-tipo
ALTER TABLE public.alertas_sistema
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id UUID,
  ADD COLUMN IF NOT EXISTS sub_tipo TEXT;

-- 2. Índice único para evitar duplicados (apenas quando sub_tipo definido)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_alerta_entidade_subtipo
  ON public.alertas_sistema (tenant_id, entidade_tipo, entidade_id, sub_tipo)
  WHERE sub_tipo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alertas_entidade
  ON public.alertas_sistema (entidade_tipo, entidade_id);

-- 3. Função que recalcula alertas para um sinistro
CREATE OR REPLACE FUNCTION public.gerar_alertas_peritagem(_sinistro_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sinistro RECORD;
  v_veiculo_label TEXT;
BEGIN
  SELECT s.*, v.matricula, v.marca, v.modelo
    INTO v_sinistro
  FROM public.sinistros s
  LEFT JOIN public.veiculos v ON v.id = s.veiculo_id
  WHERE s.id = _sinistro_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_veiculo_label := COALESCE(NULLIF(TRIM(CONCAT_WS(' ', v_sinistro.marca, v_sinistro.modelo, '(' || v_sinistro.matricula || ')')), ''), 'sem identificação');

  -- Sinistro encerrado: limpar lembretes pendentes (não lidos)
  IF v_sinistro.status = 'closed' THEN
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo = 'sinistro'
      AND entidade_id = _sinistro_id
      AND COALESCE(lido, false) = false;
    RETURN;
  END IF;

  IF v_sinistro.data_peritagem IS NOT NULL THEN
    -- Remover recorrente "sem data"
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo = 'sinistro'
      AND entidade_id = _sinistro_id
      AND sub_tipo = 'peritagem_sem_data'
      AND COALESCE(lido, false) = false;

    -- Remover marcos antigos não lidos (vão ser regenerados)
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo = 'sinistro'
      AND entidade_id = _sinistro_id
      AND sub_tipo IN ('peritagem_7d','peritagem_3d','peritagem_dia')
      AND COALESCE(lido, false) = false;

    -- Inserir marcos (apenas se ainda no futuro ou hoje)
    INSERT INTO public.alertas_sistema (tenant_id, tipo, titulo, mensagem, data_vencimento, entidade_tipo, entidade_id, sub_tipo)
    SELECT v_sinistro.tenant_id, 'peritagem',
           'Peritagem de sinistro em ' || x.dias_label,
           'Peritagem do veículo ' || v_veiculo_label || ' marcada para ' || TO_CHAR(v_sinistro.data_peritagem, 'DD/MM/YYYY') || '.',
           v_sinistro.data_peritagem,
           'sinistro', _sinistro_id, x.sub
    FROM (VALUES
      ('peritagem_7d', '7 dias', (v_sinistro.data_peritagem - INTERVAL '7 days')::date),
      ('peritagem_3d', '3 dias', (v_sinistro.data_peritagem - INTERVAL '3 days')::date),
      ('peritagem_dia', 'hoje',  v_sinistro.data_peritagem)
    ) AS x(sub, dias_label, fire_date)
    WHERE x.fire_date >= CURRENT_DATE - INTERVAL '1 day'
    ON CONFLICT (tenant_id, entidade_tipo, entidade_id, sub_tipo) WHERE sub_tipo IS NOT NULL DO NOTHING;
  ELSE
    -- Sem data: garantir 1 lembrete recorrente ativo
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo = 'sinistro'
      AND entidade_id = _sinistro_id
      AND sub_tipo IN ('peritagem_7d','peritagem_3d','peritagem_dia')
      AND COALESCE(lido, false) = false;

    INSERT INTO public.alertas_sistema (tenant_id, tipo, titulo, mensagem, data_vencimento, entidade_tipo, entidade_id, sub_tipo)
    VALUES (
      v_sinistro.tenant_id, 'peritagem',
      'Peritagem sem data definida',
      'O sinistro do veículo ' || v_veiculo_label || ' ainda não possui data de peritagem definida.',
      CURRENT_DATE,
      'sinistro', _sinistro_id, 'peritagem_sem_data'
    )
    ON CONFLICT (tenant_id, entidade_tipo, entidade_id, sub_tipo) WHERE sub_tipo IS NOT NULL DO NOTHING;
  END IF;
END;
$$;

-- 4. Trigger
CREATE OR REPLACE FUNCTION public.trg_sinistros_alertas_peritagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo='sinistro' AND entidade_id = OLD.id;
    RETURN OLD;
  END IF;

  PERFORM public.gerar_alertas_peritagem(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sinistros_alertas_peritagem ON public.sinistros;
CREATE TRIGGER sinistros_alertas_peritagem
AFTER INSERT OR UPDATE OF data_peritagem, status, veiculo_id OR DELETE
ON public.sinistros
FOR EACH ROW
EXECUTE FUNCTION public.trg_sinistros_alertas_peritagem();

-- 5. Função para refrescar lembretes recorrentes (cron)
CREATE OR REPLACE FUNCTION public.refrescar_lembretes_peritagem_recorrentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Para cada sinistro aberto sem data peritagem cujo último alerta recorrente
  -- foi lido OU tem mais de 7 dias, regenerar
  FOR r IN
    SELECT s.id
    FROM public.sinistros s
    WHERE s.status <> 'closed'
      AND s.data_peritagem IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.alertas_sistema a
        WHERE a.entidade_tipo='sinistro'
          AND a.entidade_id=s.id
          AND a.sub_tipo='peritagem_sem_data'
          AND COALESCE(a.lido,false)=false
          AND a.created_at > now() - INTERVAL '7 days'
      )
  LOOP
    -- Remover alerta antigo (lido ou expirado) para permitir novo insert
    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo='sinistro' AND entidade_id=r.id AND sub_tipo='peritagem_sem_data';
    PERFORM public.gerar_alertas_peritagem(r.id);
  END LOOP;
END;
$$;

-- 6. Backfill: gerar alertas para sinistros existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.sinistros WHERE status <> 'closed' LOOP
    PERFORM public.gerar_alertas_peritagem(r.id);
  END LOOP;
END $$;
