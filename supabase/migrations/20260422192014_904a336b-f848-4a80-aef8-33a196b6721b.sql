
-- Adicionar campos somente_leitura
ALTER TABLE public.campanhas_chat
  ADD COLUMN IF NOT EXISTS somente_leitura boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS somente_leitura boolean NOT NULL DEFAULT false;

-- Atualizar função executar_campanha para propagar somente_leitura
CREATE OR REPLACE FUNCTION public.executar_campanha(_campanha_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Em modo broadcast, criar sempre nova conversa para isolar o aviso
      IF v_camp.somente_leitura THEN
        v_conversa_id := NULL;
      ELSE
        SELECT id INTO v_conversa_id
        FROM public.conversas
        WHERE tenant_id = v_camp.tenant_id
          AND iniciador_user_id = v_user_id
          AND assunto_id = v_assunto_id
          AND escopo = 'externo'
          AND arquivada = false
          AND status <> 'finalizado'
          AND somente_leitura = false
        LIMIT 1;
      END IF;

      IF v_conversa_id IS NULL THEN
        INSERT INTO public.conversas (tenant_id, assunto_id, iniciador_user_id, status, escopo, somente_leitura)
        VALUES (v_camp.tenant_id, v_assunto_id, v_user_id, 'aberto', 'externo', v_camp.somente_leitura)
        RETURNING id INTO v_conversa_id;
      END IF;
    ELSE
      IF v_camp.somente_leitura THEN
        v_conversa_id := NULL;
      ELSE
        SELECT id INTO v_conversa_id
        FROM public.conversas
        WHERE tenant_id = v_camp.tenant_id
          AND escopo = 'interno'
          AND arquivada = false
          AND somente_leitura = false
          AND (
            (iniciador_user_id = COALESCE(v_camp.created_by, v_user_id) AND destinatario_user_id = v_user_id)
            OR (iniciador_user_id = v_user_id AND destinatario_user_id = COALESCE(v_camp.created_by, v_user_id))
          )
        ORDER BY ultima_mensagem_at DESC
        LIMIT 1;
      END IF;

      IF v_conversa_id IS NULL THEN
        INSERT INTO public.conversas (tenant_id, escopo, iniciador_user_id, destinatario_user_id, status, somente_leitura)
        VALUES (v_camp.tenant_id, 'interno', COALESCE(v_camp.created_by, v_user_id), v_user_id, 'em_atendimento', v_camp.somente_leitura)
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
$function$;

-- Atualizar política de envio: bloquear destinatário em conversas somente_leitura
DROP POLICY IF EXISTS "Send messages with claim rules" ON public.mensagens_chat;

CREATE POLICY "Send messages with claim rules"
ON public.mensagens_chat
FOR INSERT
TO authenticated
WITH CHECK (
  autor_user_id = auth.uid()
  AND conversa_id IN (
    SELECT c.id
    FROM public.conversas c
    WHERE c.status <> 'finalizado'
      AND (
        -- Admins/funcionários sempre podem (mesmo em conversas somente_leitura)
        (public.is_tenant_admin(auth.uid()) AND c.tenant_id = public.get_user_tenant_id(auth.uid()))
        OR c.assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
        OR c.funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
        OR c.assunto_id IN (
          SELECT ar.assunto_id
          FROM public.assunto_responsaveis ar
          JOIN public.funcionarios f ON f.id = ar.funcionario_id
          WHERE f.user_id = auth.uid()
        )
        -- Iniciador/destinatário só podem se NÃO for somente leitura
        OR (
          c.somente_leitura = false
          AND (c.iniciador_user_id = auth.uid() OR c.destinatario_user_id = auth.uid())
        )
      )
  )
);
