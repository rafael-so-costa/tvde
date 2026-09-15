-- 1) Novas colunas na tabela funcionarios
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS substituicao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS substituto_id uuid NULL REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substituicao_inicio date NULL,
  ADD COLUMN IF NOT EXISTS substituicao_fim date NULL;

CREATE INDEX IF NOT EXISTS idx_funcionarios_substituto ON public.funcionarios(substituto_id);

-- 2) Função: devolve o id efetivo (substituto se ativo e dentro do intervalo, senão o próprio)
CREATE OR REPLACE FUNCTION public.get_funcionario_efetivo(_funcionario_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.funcionarios;
  v_today date := now()::date;
  v_substituto uuid;
BEGIN
  IF _funcionario_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_row FROM public.funcionarios WHERE id = _funcionario_id;
  IF v_row.id IS NULL THEN RETURN _funcionario_id; END IF;

  IF v_row.substituicao_ativa
     AND v_row.substituto_id IS NOT NULL
     AND (v_row.substituicao_inicio IS NULL OR v_row.substituicao_inicio <= v_today)
     AND (v_row.substituicao_fim IS NULL OR v_row.substituicao_fim >= v_today)
  THEN
    -- Resolver cadeia (caso o substituto também esteja ausente)
    v_substituto := public.get_funcionario_efetivo(v_row.substituto_id);
    RETURN COALESCE(v_substituto, v_row.substituto_id);
  END IF;

  RETURN _funcionario_id;
END;
$$;

-- 3) Atualizar roteamento de conversas para ignorar ausentes e usar substituto
CREATE OR REPLACE FUNCTION public.route_conversa_to_funcionario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_modo public.modo_distribuicao_chat;
  v_count integer;
  v_idx integer;
  v_funcionario_id uuid;
  v_today date := now()::date;
  v_attempts integer := 0;
  v_max_attempts integer;
BEGIN
  IF NEW.assunto_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT modo_distribuicao, rodizio_index
    INTO v_modo, v_idx
  FROM public.assuntos_chat
  WHERE id = NEW.assunto_id;

  IF v_modo = 'rodizio' THEN
    SELECT count(*) INTO v_count
    FROM public.assunto_responsaveis
    WHERE assunto_id = NEW.assunto_id;

    IF v_count > 0 THEN
      v_max_attempts := v_count;
      LOOP
        SELECT funcionario_id INTO v_funcionario_id
        FROM public.assunto_responsaveis
        WHERE assunto_id = NEW.assunto_id
        ORDER BY ordem, created_at
        OFFSET (v_idx % v_count) LIMIT 1;

        -- Avançar índice já agora
        v_idx := (v_idx + 1) % v_count;
        v_attempts := v_attempts + 1;

        -- Resolver substituto (devolve próprio se não ausente)
        v_funcionario_id := public.get_funcionario_efetivo(v_funcionario_id);

        EXIT WHEN v_funcionario_id IS NOT NULL OR v_attempts >= v_max_attempts;
      END LOOP;

      IF v_funcionario_id IS NOT NULL THEN
        NEW.funcionario_id := v_funcionario_id;
        NEW.assumido_por := v_funcionario_id;
        NEW.assumido_em := now();
        NEW.status := 'em_atendimento';

        UPDATE public.assuntos_chat
          SET rodizio_index = v_idx
          WHERE id = NEW.assunto_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Atualizar iniciar_conversa_para_usuario para redirecionar quem inicia
CREATE OR REPLACE FUNCTION public.iniciar_conversa_para_usuario(_destinatario_user_id uuid, _assunto_id uuid)
 RETURNS conversas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_funcionario_id uuid;
  v_funcionario_efetivo uuid;
  v_tenant_id uuid;
  v_row public.conversas;
  v_dest_tenant uuid;
BEGIN
  v_tenant_id := public.get_user_tenant_id(auth.uid());

  SELECT id INTO v_funcionario_id
  FROM public.funcionarios
  WHERE user_id = auth.uid() LIMIT 1;

  IF v_funcionario_id IS NULL AND NOT public.is_tenant_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_dest_tenant := public.get_user_tenant_id(_destinatario_user_id);
  IF v_dest_tenant IS NULL OR v_dest_tenant <> v_tenant_id THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  -- Resolver substituto se houver
  v_funcionario_efetivo := public.get_funcionario_efetivo(v_funcionario_id);

  SELECT * INTO v_row
  FROM public.conversas
  WHERE iniciador_user_id = _destinatario_user_id
    AND assunto_id = _assunto_id
    AND arquivada = false
    AND status <> 'finalizado'
  LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    UPDATE public.conversas
      SET assumido_por = COALESCE(assumido_por, v_funcionario_efetivo),
          funcionario_id = COALESCE(funcionario_id, v_funcionario_efetivo),
          assumido_em = COALESCE(assumido_em, now()),
          status = CASE WHEN status = 'aberto' THEN 'em_atendimento' ELSE status END
    WHERE id = v_row.id
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  INSERT INTO public.conversas (
    tenant_id, assunto_id, iniciador_user_id,
    assumido_por, funcionario_id, assumido_em, status
  )
  VALUES (
    v_tenant_id, _assunto_id, _destinatario_user_id,
    v_funcionario_efetivo, v_funcionario_efetivo, now(), 'em_atendimento'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;