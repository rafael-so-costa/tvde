CREATE TABLE public.registos_expediente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  data_hora timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  data_local date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Lisbon')::date),
  origem text NOT NULL DEFAULT 'app' CHECK (origem IN ('app','publico')),
  ip_address text,
  user_agent text,
  corrigido boolean NOT NULL DEFAULT false,
  corrigido_por uuid,
  corrigido_em timestamptz,
  observacoes_correcao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_registos_expediente_tenant_data ON public.registos_expediente (tenant_id, data_hora DESC);
CREATE INDEX idx_registos_expediente_motorista_dia ON public.registos_expediente (motorista_id, data_local DESC);

GRANT SELECT, INSERT, UPDATE ON public.registos_expediente TO authenticated;
GRANT ALL ON public.registos_expediente TO service_role;

ALTER TABLE public.registos_expediente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motorista ve os seus registos de expediente"
ON public.registos_expediente FOR SELECT TO authenticated
USING (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Gestores veem registos de expediente do tenant"
ON public.registos_expediente FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Motorista cria os seus registos de expediente"
ON public.registos_expediente FOR INSERT TO authenticated
WITH CHECK (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Gestores criam registos de expediente"
ON public.registos_expediente FOR INSERT TO authenticated
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Motorista corrige registos recentes"
ON public.registos_expediente FOR UPDATE TO authenticated
USING (public.motorista_pertence_ao_utilizador(motorista_id) AND data_local >= (((now() AT TIME ZONE 'Europe/Lisbon')::date) - 30))
WITH CHECK (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Gestores corrigem registos do tenant"
ON public.registos_expediente FOR UPDATE TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

-- Registo por NIF (usado pela app e pela pagina publica)
CREATE OR REPLACE FUNCTION public.registar_expediente_por_nif(
  _nif text,
  _tenant_id uuid DEFAULT NULL,
  _origem text DEFAULT 'publico',
  _user_agent text DEFAULT NULL
)
RETURNS public.registos_expediente
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nif text := regexp_replace(coalesce(_nif, ''), '\D', '', 'g');
  v_motorista public.motoristas;
  v_count integer;
  v_tipo text;
  v_hoje date := (now() AT TIME ZONE 'Europe/Lisbon')::date;
  v_row public.registos_expediente;
BEGIN
  IF length(v_nif) <> 9 THEN
    RAISE EXCEPTION 'NIF inválido. Introduz os 9 dígitos do NIF.';
  END IF;

  SELECT * INTO v_motorista
  FROM public.motoristas
  WHERE regexp_replace(coalesce(nif, ''), '\D', '', 'g') = v_nif
    AND coalesce(ativo, true) = true
    AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_motorista.id IS NULL THEN
    RAISE EXCEPTION 'Não encontrámos um motorista ativo com esse NIF.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.registos_expediente
  WHERE motorista_id = v_motorista.id AND data_local = v_hoje;

  v_tipo := CASE WHEN v_count % 2 = 0 THEN 'entrada' ELSE 'saida' END;

  INSERT INTO public.registos_expediente (
    tenant_id, motorista_id, tipo, data_local, origem, user_agent
  ) VALUES (
    v_motorista.tenant_id, v_motorista.id, v_tipo, v_hoje,
    CASE WHEN _origem IN ('app','publico') THEN _origem ELSE 'publico' END,
    _user_agent
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registar_expediente_por_nif(text, uuid, text, text) TO anon, authenticated;

-- Estado atual de servico de um motorista
CREATE OR REPLACE FUNCTION public.motorista_em_servico(_motorista_id uuid)
RETURNS TABLE (em_servico boolean, desde timestamptz, tipo_ultimo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (r.tipo = 'entrada') AS em_servico, r.data_hora AS desde, r.tipo AS tipo_ultimo
  FROM public.registos_expediente r
  WHERE r.motorista_id = _motorista_id
    AND r.data_local = (now() AT TIME ZONE 'Europe/Lisbon')::date
  ORDER BY r.data_hora DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.motorista_em_servico(uuid) TO anon, authenticated;

-- Estatisticas por motorista num intervalo
CREATE OR REPLACE FUNCTION public.estatisticas_expediente(
  _tenant_id uuid,
  _data_inicio date,
  _data_fim date
)
RETURNS TABLE (
  motorista_id uuid,
  nome_completo text,
  dias_online integer,
  segundos_trabalhados bigint,
  ultimo_registo timestamptz,
  em_servico boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT r.*,
           lead(r.data_hora) OVER (PARTITION BY r.motorista_id, r.data_local ORDER BY r.data_hora) AS proximo,
           lead(r.tipo) OVER (PARTITION BY r.motorista_id, r.data_local ORDER BY r.data_hora) AS proximo_tipo
    FROM public.registos_expediente r
    WHERE r.tenant_id = _tenant_id
      AND r.data_local BETWEEN _data_inicio AND _data_fim
  ),
  pares AS (
    SELECT motorista_id, data_local,
           EXTRACT(EPOCH FROM (proximo - data_hora))::bigint AS segundos
    FROM base
    WHERE tipo = 'entrada' AND proximo_tipo = 'saida'
  ),
  agregado AS (
    SELECT motorista_id,
           count(DISTINCT data_local)::int AS dias_online,
           coalesce(sum(segundos), 0)::bigint AS segundos_trabalhados
    FROM pares
    GROUP BY motorista_id
  ),
  ultimos AS (
    SELECT DISTINCT ON (motorista_id) motorista_id, data_hora, tipo
    FROM public.registos_expediente
    WHERE tenant_id = _tenant_id
    ORDER BY motorista_id, data_hora DESC
  )
  SELECT m.id,
         m.nome_completo::text,
         coalesce(a.dias_online, 0),
         coalesce(a.segundos_trabalhados, 0),
         u.data_hora,
         coalesce(u.tipo = 'entrada', false)
  FROM public.motoristas m
  LEFT JOIN agregado a ON a.motorista_id = m.id
  LEFT JOIN ultimos u ON u.motorista_id = m.id
  WHERE m.tenant_id = _tenant_id
  ORDER BY coalesce(a.segundos_trabalhados, 0) DESC, m.nome_completo;
$$;

GRANT EXECUTE ON FUNCTION public.estatisticas_expediente(uuid, date, date) TO authenticated;