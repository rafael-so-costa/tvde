-- Tipos de ausência
DO $$ BEGIN
  CREATE TYPE public.tipo_ausencia AS ENUM ('ferias', 'doenca', 'folga', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de ausências
CREATE TABLE IF NOT EXISTS public.funcionario_ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo public.tipo_ausencia NOT NULL DEFAULT 'ferias',
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  substituto_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  substituicao_ativa boolean NOT NULL DEFAULT true,
  bloquear_acesso boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ausencia_datas_validas CHECK (data_fim >= data_inicio),
  CONSTRAINT ausencia_substituto_diferente CHECK (substituto_id IS NULL OR substituto_id <> funcionario_id)
);

CREATE INDEX IF NOT EXISTS idx_func_ausencias_func ON public.funcionario_ausencias(funcionario_id, data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_func_ausencias_tenant ON public.funcionario_ausencias(tenant_id);

ALTER TABLE public.funcionario_ausencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage ausencias"
ON public.funcionario_ausencias FOR ALL
TO authenticated
USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Funcionario views own ausencias"
ON public.funcionario_ausencias FOR SELECT
TO authenticated
USING (funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid()));

CREATE TRIGGER trg_func_ausencias_updated
BEFORE UPDATE ON public.funcionario_ausencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validar sobreposição (mesmo funcionário)
CREATE OR REPLACE FUNCTION public.validar_ausencia_sobreposicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.funcionario_ausencias
    WHERE funcionario_id = NEW.funcionario_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND daterange(data_inicio, data_fim, '[]') && daterange(NEW.data_inicio, NEW.data_fim, '[]')
  ) THEN
    RAISE EXCEPTION 'Já existe uma ausência neste período para este funcionário';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_func_ausencias_sobreposicao
BEFORE INSERT OR UPDATE ON public.funcionario_ausencias
FOR EACH ROW EXECUTE FUNCTION public.validar_ausencia_sobreposicao();

-- Atualizar get_funcionario_efetivo para considerar ausências ativas
CREATE OR REPLACE FUNCTION public.get_funcionario_efetivo(_funcionario_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.funcionarios;
  v_today date := now()::date;
  v_substituto uuid;
  v_aus public.funcionario_ausencias;
BEGIN
  IF _funcionario_id IS NULL THEN RETURN NULL; END IF;

  -- 1) Procurar ausência ativa hoje (com substituição ativa)
  SELECT * INTO v_aus FROM public.funcionario_ausencias
  WHERE funcionario_id = _funcionario_id
    AND substituicao_ativa = true
    AND substituto_id IS NOT NULL
    AND v_today BETWEEN data_inicio AND data_fim
  ORDER BY data_inicio DESC LIMIT 1;

  IF v_aus.id IS NOT NULL THEN
    v_substituto := public.get_funcionario_efetivo(v_aus.substituto_id);
    RETURN COALESCE(v_substituto, v_aus.substituto_id);
  END IF;

  -- 2) Fallback: campos legados em funcionarios
  SELECT * INTO v_row FROM public.funcionarios WHERE id = _funcionario_id;
  IF v_row.id IS NULL THEN RETURN _funcionario_id; END IF;

  IF v_row.substituicao_ativa
     AND v_row.substituto_id IS NOT NULL
     AND (v_row.substituicao_inicio IS NULL OR v_row.substituicao_inicio <= v_today)
     AND (v_row.substituicao_fim IS NULL OR v_row.substituicao_fim >= v_today)
  THEN
    v_substituto := public.get_funcionario_efetivo(v_row.substituto_id);
    RETURN COALESCE(v_substituto, v_row.substituto_id);
  END IF;

  RETURN _funcionario_id;
END;
$$;