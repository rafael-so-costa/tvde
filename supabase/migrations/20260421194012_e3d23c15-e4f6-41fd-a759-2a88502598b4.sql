CREATE OR REPLACE FUNCTION public.reabrir_conversa(_conversa_id uuid)
 RETURNS conversas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_funcionario_id uuid;
  v_row public.conversas;
  v_is_admin boolean;
BEGIN
  SELECT id INTO v_funcionario_id
  FROM public.funcionarios
  WHERE user_id = auth.uid() LIMIT 1;

  v_is_admin := public.is_tenant_admin(auth.uid());

  IF v_funcionario_id IS NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Sem permissão para reabrir esta conversa';
  END IF;

  UPDATE public.conversas
    SET status = 'em_atendimento',
        finalizado_em = NULL,
        assumido_por = COALESCE(assumido_por, v_funcionario_id),
        funcionario_id = COALESCE(funcionario_id, v_funcionario_id),
        assumido_em = COALESCE(assumido_em, now()),
        ultima_mensagem_at = now()
  WHERE id = _conversa_id
    AND status = 'finalizado'
    AND (
      v_is_admin
      OR assumido_por = v_funcionario_id
    )
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sem permissão ou conversa não está finalizada';
  END IF;

  RETURN v_row;
END;
$function$;

-- Permitir funcionários/admins iniciarem conversas em nome de motoristas/proprietários
CREATE OR REPLACE FUNCTION public.iniciar_conversa_para_usuario(
  _destinatario_user_id uuid,
  _assunto_id uuid
)
 RETURNS conversas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_funcionario_id uuid;
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

  -- Verificar que o destinatário pertence ao mesmo tenant
  v_dest_tenant := public.get_user_tenant_id(_destinatario_user_id);
  IF v_dest_tenant IS NULL OR v_dest_tenant <> v_tenant_id THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  -- Reaproveitar conversa aberta com o mesmo assunto, se existir
  SELECT * INTO v_row
  FROM public.conversas
  WHERE iniciador_user_id = _destinatario_user_id
    AND assunto_id = _assunto_id
    AND arquivada = false
    AND status <> 'finalizado'
  LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    -- Garantir que está atribuída ao funcionário que abriu
    UPDATE public.conversas
      SET assumido_por = COALESCE(assumido_por, v_funcionario_id),
          funcionario_id = COALESCE(funcionario_id, v_funcionario_id),
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
    v_funcionario_id, v_funcionario_id, now(), 'em_atendimento'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;