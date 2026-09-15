-- 1. Enum para escopo de conversa
DO $$ BEGIN
  CREATE TYPE public.escopo_conversa AS ENUM ('externo', 'interno');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Adicionar colunas a conversas
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS escopo public.escopo_conversa NOT NULL DEFAULT 'externo',
  ADD COLUMN IF NOT EXISTS destinatario_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_conversas_escopo ON public.conversas(tenant_id, escopo);
CREATE INDEX IF NOT EXISTS idx_conversas_destinatario ON public.conversas(destinatario_user_id);

-- 3. Adicionar colunas a campanhas_chat
ALTER TABLE public.campanhas_chat
  ADD COLUMN IF NOT EXISTS escopo public.escopo_conversa NOT NULL DEFAULT 'externo';

-- 4. Atualizar políticas de SELECT em conversas para suportar chat interno
DROP POLICY IF EXISTS "Funcionario views assigned and assunto conversas" ON public.conversas;
CREATE POLICY "Funcionario views assigned and assunto conversas"
ON public.conversas
FOR SELECT
TO authenticated
USING (
  -- Conversas onde funcionário é responsável (externas)
  (escopo = 'externo' AND (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
    OR assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
    OR assunto_id IN (
      SELECT ar.assunto_id
      FROM public.assunto_responsaveis ar
      JOIN public.funcionarios f ON f.id = ar.funcionario_id
      WHERE f.user_id = auth.uid()
    )
  ))
  OR
  -- Conversas internas: ver se for iniciador ou destinatário
  (escopo = 'interno' AND (
    iniciador_user_id = auth.uid()
    OR destinatario_user_id = auth.uid()
  ))
);

-- Iniciador cria conversa - permitir interna ou externa
DROP POLICY IF EXISTS "Iniciador creates own conversas" ON public.conversas;
CREATE POLICY "Iniciador creates own conversas"
ON public.conversas
FOR INSERT
TO authenticated
WITH CHECK (
  iniciador_user_id = auth.uid()
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

-- 5. Atualizar política de mensagens para suportar destinatário interno
DROP POLICY IF EXISTS "View messages of accessible conversas" ON public.mensagens_chat;
CREATE POLICY "View messages of accessible conversas"
ON public.mensagens_chat
FOR SELECT
TO authenticated
USING (
  conversa_id IN (
    SELECT id FROM public.conversas
    WHERE iniciador_user_id = auth.uid()
       OR destinatario_user_id = auth.uid()
       OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR (is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Send messages with claim rules" ON public.mensagens_chat;
CREATE POLICY "Send messages with claim rules"
ON public.mensagens_chat
FOR INSERT
TO authenticated
WITH CHECK (
  autor_user_id = auth.uid()
  AND conversa_id IN (
    SELECT c.id FROM public.conversas c
    WHERE c.status <> 'finalizado'
      AND (
        c.iniciador_user_id = auth.uid()
        OR c.destinatario_user_id = auth.uid()
        OR (is_tenant_admin(auth.uid()) AND c.tenant_id = public.get_user_tenant_id(auth.uid()))
        OR c.assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Update own messages read state" ON public.mensagens_chat;
CREATE POLICY "Update own messages read state"
ON public.mensagens_chat
FOR UPDATE
TO authenticated
USING (
  conversa_id IN (
    SELECT id FROM public.conversas
    WHERE iniciador_user_id = auth.uid()
       OR destinatario_user_id = auth.uid()
       OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR (is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);

-- 6. RPC: iniciar conversa interna entre user atual e outro user (funcionário ou admin)
CREATE OR REPLACE FUNCTION public.iniciar_conversa_interna(_destinatario_user_id uuid)
RETURNS public.conversas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_dest_tenant uuid;
  v_row public.conversas;
  v_is_func_or_admin boolean;
  v_dest_is_func_or_admin boolean;
BEGIN
  v_tenant_id := public.get_user_tenant_id(auth.uid());

  -- Quem inicia tem de ser funcionário OU admin do tenant
  SELECT (EXISTS (SELECT 1 FROM public.funcionarios WHERE user_id = auth.uid())
          OR public.is_tenant_admin(auth.uid()))
    INTO v_is_func_or_admin;

  IF NOT v_is_func_or_admin THEN
    RAISE EXCEPTION 'Apenas funcionários ou gestores podem iniciar chat interno';
  END IF;

  -- Destinatário tem de ser funcionário OU admin do mesmo tenant
  v_dest_tenant := public.get_user_tenant_id(_destinatario_user_id);
  IF v_dest_tenant IS NULL OR v_dest_tenant <> v_tenant_id THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  SELECT (EXISTS (SELECT 1 FROM public.funcionarios WHERE user_id = _destinatario_user_id)
          OR public.is_tenant_admin(_destinatario_user_id))
    INTO v_dest_is_func_or_admin;

  IF NOT v_dest_is_func_or_admin THEN
    RAISE EXCEPTION 'Destinatário não é elegível para chat interno';
  END IF;

  IF _destinatario_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível iniciar conversa consigo próprio';
  END IF;

  -- Reutilizar conversa interna existente entre os dois
  SELECT * INTO v_row
  FROM public.conversas
  WHERE escopo = 'interno'
    AND tenant_id = v_tenant_id
    AND arquivada = false
    AND (
      (iniciador_user_id = auth.uid() AND destinatario_user_id = _destinatario_user_id)
      OR (iniciador_user_id = _destinatario_user_id AND destinatario_user_id = auth.uid())
    )
  ORDER BY ultima_mensagem_at DESC
  LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.conversas (
    tenant_id, escopo, iniciador_user_id, destinatario_user_id, status
  ) VALUES (
    v_tenant_id, 'interno', auth.uid(), _destinatario_user_id, 'em_atendimento'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 7. Atualizar executar_campanha para respeitar escopo (funcionarios)
CREATE OR REPLACE FUNCTION public.executar_campanha(_campanha_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camp public.campanhas_chat;
  v_assunto_id uuid;
  v_destinatarios uuid[];
  v_user_id uuid;
  v_conversa_id uuid;
  v_msg_id uuid;
  v_count integer := 0;
  v_escopo public.escopo_conversa;
BEGIN
  SELECT * INTO v_camp FROM public.campanhas_chat WHERE id = _campanha_id;
  IF v_camp.id IS NULL OR NOT v_camp.ativo THEN
    RETURN 0;
  END IF;

  v_escopo := COALESCE(v_camp.escopo, 'externo');

  IF v_escopo = 'externo' THEN
    v_assunto_id := public.garantir_assunto_comunicacoes(v_camp.tenant_id);
  ELSE
    v_assunto_id := NULL;
  END IF;

  -- Resolver audiência
  IF v_camp.publico_tipo = 'especificos' THEN
    v_destinatarios := v_camp.destinatarios_ids;
  ELSIF v_camp.publico_tipo = 'funcionarios' THEN
    SELECT array_agg(DISTINCT user_id) INTO v_destinatarios
    FROM public.funcionarios
    WHERE tenant_id = v_camp.tenant_id
      AND user_id IS NOT NULL
      AND (v_camp.filtro_ativo IS NULL OR ativo = v_camp.filtro_ativo);
  ELSE
    SELECT array_agg(DISTINCT user_id) INTO v_destinatarios FROM (
      SELECT m.user_id
      FROM public.motoristas m
      WHERE m.tenant_id = v_camp.tenant_id
        AND m.user_id IS NOT NULL
        AND (v_camp.publico_tipo IN ('motoristas','ambos','todos'))
        AND (v_camp.filtro_ativo IS NULL OR m.ativo = v_camp.filtro_ativo)
      UNION
      SELECT p.user_id
      FROM public.proprietarios p
      WHERE p.tenant_id = v_camp.tenant_id
        AND p.user_id IS NOT NULL
        AND (v_camp.publico_tipo IN ('proprietarios','ambos','todos'))
        AND (v_camp.filtro_ativo IS NULL OR p.ativo = v_camp.filtro_ativo)
      UNION
      SELECT f.user_id
      FROM public.funcionarios f
      WHERE f.tenant_id = v_camp.tenant_id
        AND f.user_id IS NOT NULL
        AND v_camp.publico_tipo = 'todos'
        AND (v_camp.filtro_ativo IS NULL OR f.ativo = v_camp.filtro_ativo)
    ) sub;
  END IF;

  IF v_destinatarios IS NULL THEN RETURN 0; END IF;

  FOREACH v_user_id IN ARRAY v_destinatarios LOOP
    IF EXISTS (
      SELECT 1 FROM public.campanhas_envios
      WHERE campanha_id = _campanha_id
        AND destinatario_user_id = v_user_id
        AND data_envio = now()::date
    ) THEN CONTINUE; END IF;

    IF v_escopo = 'externo' THEN
      SELECT id INTO v_conversa_id
      FROM public.conversas
      WHERE tenant_id = v_camp.tenant_id
        AND iniciador_user_id = v_user_id
        AND assunto_id = v_assunto_id
        AND escopo = 'externo'
        AND arquivada = false
        AND status <> 'finalizado'
      LIMIT 1;

      IF v_conversa_id IS NULL THEN
        INSERT INTO public.conversas (tenant_id, assunto_id, iniciador_user_id, status, escopo)
        VALUES (v_camp.tenant_id, v_assunto_id, v_user_id, 'aberto', 'externo')
        RETURNING id INTO v_conversa_id;
      END IF;
    ELSE
      -- Interno: gestor (created_by) → funcionário (v_user_id)
      SELECT id INTO v_conversa_id
      FROM public.conversas
      WHERE tenant_id = v_camp.tenant_id
        AND escopo = 'interno'
        AND arquivada = false
        AND (
          (iniciador_user_id = COALESCE(v_camp.created_by, v_user_id) AND destinatario_user_id = v_user_id)
          OR (iniciador_user_id = v_user_id AND destinatario_user_id = COALESCE(v_camp.created_by, v_user_id))
        )
      ORDER BY ultima_mensagem_at DESC
      LIMIT 1;

      IF v_conversa_id IS NULL THEN
        INSERT INTO public.conversas (tenant_id, escopo, iniciador_user_id, destinatario_user_id, status)
        VALUES (v_camp.tenant_id, 'interno', COALESCE(v_camp.created_by, v_user_id), v_user_id, 'em_atendimento')
        RETURNING id INTO v_conversa_id;
      END IF;
    END IF;

    INSERT INTO public.mensagens_chat (
      tenant_id, conversa_id, autor_user_id, conteudo, tipo, lida
    ) VALUES (
      v_camp.tenant_id, v_conversa_id,
      COALESCE(v_camp.created_by, v_user_id),
      v_camp.conteudo, 'texto', false
    ) RETURNING id INTO v_msg_id;

    INSERT INTO public.campanhas_envios (campanha_id, tenant_id, destinatario_user_id, conversa_id, mensagem_id)
    VALUES (_campanha_id, v_camp.tenant_id, v_user_id, v_conversa_id, v_msg_id)
    ON CONFLICT (campanha_id, destinatario_user_id, data_envio) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.campanhas_chat
  SET ultima_execucao_at = now(),
      total_enviado = total_enviado + v_count
  WHERE id = _campanha_id;

  RETURN v_count;
END;
$$;