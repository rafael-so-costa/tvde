-- Enum de frequência
DO $$ BEGIN
  CREATE TYPE public.frequencia_campanha AS ENUM ('unica','diario','semanal','mensal','personalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela campanhas_chat
CREATE TABLE IF NOT EXISTS public.campanhas_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid,
  nome text NOT NULL,
  conteudo text NOT NULL,
  publico_tipo text NOT NULL CHECK (publico_tipo IN ('motoristas','proprietarios','ambos','especificos')),
  filtro_ativo boolean,
  destinatarios_ids uuid[] NOT NULL DEFAULT '{}',
  tipo_envio text NOT NULL DEFAULT 'agendado' CHECK (tipo_envio IN ('imediato','agendado')),
  frequencia public.frequencia_campanha NOT NULL DEFAULT 'unica',
  dias_semana int[] NOT NULL DEFAULT '{}',
  dias_mes int[] NOT NULL DEFAULT '{}',
  hora_envio time NOT NULL DEFAULT '09:00',
  data_inicio date,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  ultima_execucao_at timestamptz,
  total_enviado integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_chat_tenant ON public.campanhas_chat(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_chat_ativo ON public.campanhas_chat(ativo) WHERE ativo;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_campanhas_chat_updated ON public.campanhas_chat;
CREATE TRIGGER trg_campanhas_chat_updated
  BEFORE UPDATE ON public.campanhas_chat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela campanhas_envios
CREATE TABLE IF NOT EXISTS public.campanhas_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas_chat(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  destinatario_user_id uuid NOT NULL,
  conversa_id uuid,
  mensagem_id uuid,
  data_envio date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campanha_id, destinatario_user_id, data_envio)
);

CREATE INDEX IF NOT EXISTS idx_campanhas_envios_campanha ON public.campanhas_envios(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_envios_tenant ON public.campanhas_envios(tenant_id);

-- RLS
ALTER TABLE public.campanhas_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_envios ENABLE ROW LEVEL SECURITY;

-- Policies campanhas_chat: admin tenant ou funcionário com permissão configurar em mensagens_massa
DROP POLICY IF EXISTS "Manage campanhas_chat" ON public.campanhas_chat;
CREATE POLICY "Manage campanhas_chat"
ON public.campanhas_chat
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.is_tenant_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'mensagens_massa', 'configurar'::public.nivel_permissao)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.is_tenant_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'mensagens_massa', 'configurar'::public.nivel_permissao)
  )
);

-- Policies campanhas_envios: leitura por quem pode gerir; insert via SECURITY DEFINER (bypass)
DROP POLICY IF EXISTS "View campanhas_envios" ON public.campanhas_envios;
CREATE POLICY "View campanhas_envios"
ON public.campanhas_envios
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.is_tenant_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'mensagens_massa', 'configurar'::public.nivel_permissao)
  )
);

-- Função: garante existência do assunto "Comunicações" no tenant
CREATE OR REPLACE FUNCTION public.garantir_assunto_comunicacoes(_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.assuntos_chat
  WHERE tenant_id = _tenant_id AND lower(nome) = 'comunicações'
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.assuntos_chat (tenant_id, nome, modo_distribuicao, ativo, ordem)
    VALUES (_tenant_id, 'Comunicações', 'todos', true, 999)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Função: executar uma campanha (envia para todos os destinatários elegíveis hoje)
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
BEGIN
  SELECT * INTO v_camp FROM public.campanhas_chat WHERE id = _campanha_id;
  IF v_camp.id IS NULL OR NOT v_camp.ativo THEN
    RETURN 0;
  END IF;

  v_assunto_id := public.garantir_assunto_comunicacoes(v_camp.tenant_id);

  -- Resolver audiência
  IF v_camp.publico_tipo = 'especificos' THEN
    v_destinatarios := v_camp.destinatarios_ids;
  ELSE
    SELECT array_agg(DISTINCT user_id) INTO v_destinatarios FROM (
      SELECT m.user_id
      FROM public.motoristas m
      WHERE m.tenant_id = v_camp.tenant_id
        AND m.user_id IS NOT NULL
        AND (v_camp.publico_tipo IN ('motoristas','ambos'))
        AND (v_camp.filtro_ativo IS NULL OR m.ativo = v_camp.filtro_ativo)
      UNION
      SELECT p.user_id
      FROM public.proprietarios p
      WHERE p.tenant_id = v_camp.tenant_id
        AND p.user_id IS NOT NULL
        AND (v_camp.publico_tipo IN ('proprietarios','ambos'))
        AND (v_camp.filtro_ativo IS NULL OR p.ativo = v_camp.filtro_ativo)
    ) sub;
  END IF;

  IF v_destinatarios IS NULL THEN RETURN 0; END IF;

  FOREACH v_user_id IN ARRAY v_destinatarios LOOP
    -- Verificar duplicação no dia
    IF EXISTS (
      SELECT 1 FROM public.campanhas_envios
      WHERE campanha_id = _campanha_id
        AND destinatario_user_id = v_user_id
        AND data_envio = now()::date
    ) THEN CONTINUE; END IF;

    -- Reutilizar conversa aberta com este assunto, ou criar nova
    SELECT id INTO v_conversa_id
    FROM public.conversas
    WHERE tenant_id = v_camp.tenant_id
      AND iniciador_user_id = v_user_id
      AND assunto_id = v_assunto_id
      AND arquivada = false
      AND status <> 'finalizado'
    LIMIT 1;

    IF v_conversa_id IS NULL THEN
      INSERT INTO public.conversas (tenant_id, assunto_id, iniciador_user_id, status)
      VALUES (v_camp.tenant_id, v_assunto_id, v_user_id, 'aberto')
      RETURNING id INTO v_conversa_id;
    END IF;

    -- Inserir mensagem (autor = created_by da campanha; pode ser NULL → usar iniciador como fallback)
    INSERT INTO public.mensagens_chat (
      tenant_id, conversa_id, autor_user_id, conteudo, tipo, lida
    ) VALUES (
      v_camp.tenant_id, v_conversa_id,
      COALESCE(v_camp.created_by, v_user_id),
      v_camp.conteudo, 'texto', false
    ) RETURNING id INTO v_msg_id;

    -- Registar envio
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

-- Função: processar campanhas agendadas (chamada pelo cron)
CREATE OR REPLACE FUNCTION public.processar_campanhas_agendadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camp record;
  v_today date := now()::date;
  v_dow int := EXTRACT(DOW FROM now())::int; -- 0=domingo
  v_dom int := EXTRACT(DAY FROM now())::int;
  v_now_time time := now()::time;
  v_total integer := 0;
  v_executed integer;
  v_due boolean;
BEGIN
  FOR v_camp IN
    SELECT * FROM public.campanhas_chat
    WHERE ativo = true
      AND tipo_envio = 'agendado'
      AND (data_inicio IS NULL OR data_inicio <= v_today)
      AND (data_fim IS NULL OR data_fim >= v_today)
      AND hora_envio <= v_now_time
      AND (ultima_execucao_at IS NULL OR ultima_execucao_at::date < v_today)
  LOOP
    v_due := false;
    CASE v_camp.frequencia
      WHEN 'unica' THEN
        v_due := (v_camp.ultima_execucao_at IS NULL);
      WHEN 'diario' THEN
        v_due := true;
      WHEN 'semanal' THEN
        v_due := v_dow = ANY(v_camp.dias_semana);
      WHEN 'mensal' THEN
        v_due := v_dom = ANY(v_camp.dias_mes);
      WHEN 'personalizado' THEN
        v_due := v_dom = ANY(v_camp.dias_mes);
    END CASE;

    IF v_due THEN
      v_executed := public.executar_campanha(v_camp.id);
      v_total := v_total + v_executed;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;