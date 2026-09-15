-- 1. Adicionar campos a mensagens_chat
ALTER TABLE public.mensagens_chat
  ADD COLUMN IF NOT EXISTS conteudo_original text,
  ADD COLUMN IF NOT EXISTS editada_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS excluida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluida_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lida_em timestamp with time zone;

-- 2. Adicionar campo de "marcada como não lida" às conversas
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS marcada_nao_lida_por uuid;

-- 3. Permitir DELETE (lógico via função) - mas mantemos sem policy de DELETE direto.
--    Vamos permitir UPDATE pelo autor (necessário para editar).
DROP POLICY IF EXISTS "Author can update own messages" ON public.mensagens_chat;
CREATE POLICY "Author can update own messages"
ON public.mensagens_chat
FOR UPDATE
TO authenticated
USING (autor_user_id = auth.uid())
WITH CHECK (autor_user_id = auth.uid());

-- 4. Função: editar mensagem (com regras de tempo)
CREATE OR REPLACE FUNCTION public.editar_mensagem(_mensagem_id uuid, _novo_conteudo text)
RETURNS public.mensagens_chat
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.mensagens_chat;
BEGIN
  SELECT * INTO v_msg FROM public.mensagens_chat WHERE id = _mensagem_id;

  IF v_msg.id IS NULL THEN
    RAISE EXCEPTION 'Mensagem não encontrada';
  END IF;

  IF v_msg.autor_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Apenas o autor pode editar esta mensagem';
  END IF;

  IF v_msg.excluida THEN
    RAISE EXCEPTION 'Mensagem excluída não pode ser editada';
  END IF;

  -- Regra de tempo: se já foi lida, só permite até 4 minutos após leitura
  IF v_msg.lida_em IS NOT NULL AND v_msg.lida_em < (now() - interval '4 minutes') THEN
    RAISE EXCEPTION 'Tempo limite para edição expirado (4 minutos após leitura)';
  END IF;

  IF _novo_conteudo IS NULL OR length(trim(_novo_conteudo)) = 0 THEN
    RAISE EXCEPTION 'Conteúdo vazio';
  END IF;

  UPDATE public.mensagens_chat
  SET conteudo_original = COALESCE(conteudo_original, conteudo),
      conteudo = _novo_conteudo,
      editada_em = now()
  WHERE id = _mensagem_id
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

-- 5. Função: excluir mensagem (lógica)
CREATE OR REPLACE FUNCTION public.excluir_mensagem(_mensagem_id uuid)
RETURNS public.mensagens_chat
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.mensagens_chat;
BEGIN
  SELECT * INTO v_msg FROM public.mensagens_chat WHERE id = _mensagem_id;

  IF v_msg.id IS NULL THEN
    RAISE EXCEPTION 'Mensagem não encontrada';
  END IF;

  IF v_msg.autor_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Apenas o autor pode apagar esta mensagem';
  END IF;

  IF v_msg.excluida THEN
    RETURN v_msg;
  END IF;

  IF v_msg.lida_em IS NOT NULL AND v_msg.lida_em < (now() - interval '4 minutes') THEN
    RAISE EXCEPTION 'Tempo limite para exclusão expirado (4 minutos após leitura)';
  END IF;

  UPDATE public.mensagens_chat
  SET excluida = true,
      excluida_em = now(),
      conteudo_original = COALESCE(conteudo_original, conteudo),
      conteudo = NULL
  WHERE id = _mensagem_id
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

-- 6. Função: marcar conversa como não lida
CREATE OR REPLACE FUNCTION public.marcar_conversa_nao_lida(_conversa_id uuid)
RETURNS public.conversas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.conversas;
BEGIN
  -- Marcar como não lidas as últimas mensagens recebidas pelo utilizador
  UPDATE public.mensagens_chat m
  SET lida = false, lida_em = NULL
  WHERE m.conversa_id = _conversa_id
    AND m.autor_user_id <> auth.uid()
    AND m.id IN (
      SELECT id FROM public.mensagens_chat
      WHERE conversa_id = _conversa_id
        AND autor_user_id <> auth.uid()
      ORDER BY created_at DESC
      LIMIT 1
    );

  UPDATE public.conversas
  SET marcada_nao_lida_por = auth.uid()
  WHERE id = _conversa_id
    AND (
      iniciador_user_id = auth.uid()
      OR destinatario_user_id = auth.uid()
      OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
      OR assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
      OR (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
    )
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para marcar esta conversa';
  END IF;

  RETURN v_row;
END;
$$;

-- 7. Função: marcar conversa como lida (limpa flag manual e regista lida_em)
CREATE OR REPLACE FUNCTION public.marcar_conversa_lida(_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensagens_chat
  SET lida = true,
      lida_em = COALESCE(lida_em, now())
  WHERE conversa_id = _conversa_id
    AND autor_user_id <> auth.uid()
    AND lida = false;

  UPDATE public.conversas
  SET marcada_nao_lida_por = NULL
  WHERE id = _conversa_id
    AND marcada_nao_lida_por = auth.uid();
END;
$$;