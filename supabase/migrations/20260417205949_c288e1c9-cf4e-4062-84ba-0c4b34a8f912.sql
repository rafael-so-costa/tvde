-- 1. Tabela de assuntos do chat
CREATE TABLE public.assuntos_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  funcionario_responsavel_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assuntos_chat_tenant ON public.assuntos_chat(tenant_id);

-- 2. Tabela de conversas
CREATE TABLE public.conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assunto_id uuid REFERENCES public.assuntos_chat(id) ON DELETE SET NULL,
  iniciador_user_id uuid NOT NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  titulo text,
  arquivada boolean NOT NULL DEFAULT false,
  ultima_mensagem_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversas_tenant ON public.conversas(tenant_id);
CREATE INDEX idx_conversas_iniciador ON public.conversas(iniciador_user_id);
CREATE INDEX idx_conversas_funcionario ON public.conversas(funcionario_id);

-- 3. Tabela de mensagens do chat
CREATE TABLE public.mensagens_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  autor_user_id uuid NOT NULL,
  conteudo text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_conversa ON public.mensagens_chat(conversa_id, created_at);

-- 4. Tabela de permissões granulares por funcionário
CREATE TYPE public.nivel_permissao AS ENUM ('nenhum', 'visualizar', 'configurar');

CREATE TABLE public.permissoes_funcionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  nivel public.nivel_permissao NOT NULL DEFAULT 'nenhum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, menu_key)
);

CREATE INDEX idx_permissoes_funcionario ON public.permissoes_funcionario(funcionario_id);

-- 5. Trigger para atualizar ultima_mensagem_at em conversas
CREATE OR REPLACE FUNCTION public.update_conversa_ultima_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversas
  SET ultima_mensagem_at = NEW.created_at
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversa_ultima_mensagem
AFTER INSERT ON public.mensagens_chat
FOR EACH ROW EXECUTE FUNCTION public.update_conversa_ultima_mensagem();

-- 6. Trigger para roteamento automático de conversa por assunto
CREATE OR REPLACE FUNCTION public.route_conversa_to_funcionario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funcionario_id uuid;
BEGIN
  IF NEW.funcionario_id IS NULL AND NEW.assunto_id IS NOT NULL THEN
    SELECT funcionario_responsavel_id INTO v_funcionario_id
    FROM public.assuntos_chat
    WHERE id = NEW.assunto_id;
    NEW.funcionario_id := v_funcionario_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_route_conversa
BEFORE INSERT ON public.conversas
FOR EACH ROW EXECUTE FUNCTION public.route_conversa_to_funcionario();

-- 7. Função SECURITY DEFINER para verificar permissões
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _menu_key text, _nivel_minimo public.nivel_permissao)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funcionario_id uuid;
  v_nivel public.nivel_permissao;
BEGIN
  -- Super admin sempre tem acesso
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Buscar funcionário associado
  SELECT id INTO v_funcionario_id
  FROM public.funcionarios
  WHERE user_id = _user_id LIMIT 1;

  -- Se não é funcionário, é gestor "dono" → acesso total
  IF v_funcionario_id IS NULL THEN
    RETURN public.is_tenant_admin(_user_id);
  END IF;

  -- Buscar nível de permissão
  SELECT nivel INTO v_nivel
  FROM public.permissoes_funcionario
  WHERE funcionario_id = v_funcionario_id AND menu_key = _menu_key;

  IF v_nivel IS NULL OR v_nivel = 'nenhum' THEN
    RETURN false;
  END IF;

  IF _nivel_minimo = 'visualizar' THEN
    RETURN v_nivel IN ('visualizar', 'configurar');
  ELSIF _nivel_minimo = 'configurar' THEN
    RETURN v_nivel = 'configurar';
  END IF;

  RETURN false;
END;
$$;

-- 8. RLS — assuntos_chat
ALTER TABLE public.assuntos_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view assuntos"
ON public.assuntos_chat FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins manage assuntos"
ON public.assuntos_chat FOR ALL TO authenticated
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 9. RLS — conversas
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iniciador views own conversas"
ON public.conversas FOR SELECT TO authenticated
USING (iniciador_user_id = auth.uid());

CREATE POLICY "Iniciador creates own conversas"
ON public.conversas FOR INSERT TO authenticated
WITH CHECK (iniciador_user_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Funcionario views assigned conversas"
ON public.conversas FOR SELECT TO authenticated
USING (funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins manage all conversas"
ON public.conversas FOR ALL TO authenticated
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 10. RLS — mensagens_chat
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages of accessible conversas"
ON public.mensagens_chat FOR SELECT TO authenticated
USING (
  conversa_id IN (
    SELECT id FROM public.conversas
    WHERE iniciador_user_id = auth.uid()
       OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  )
);

CREATE POLICY "Send messages on accessible conversas"
ON public.mensagens_chat FOR INSERT TO authenticated
WITH CHECK (
  autor_user_id = auth.uid() AND
  conversa_id IN (
    SELECT id FROM public.conversas
    WHERE iniciador_user_id = auth.uid()
       OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  )
);

CREATE POLICY "Update own messages read state"
ON public.mensagens_chat FOR UPDATE TO authenticated
USING (
  conversa_id IN (
    SELECT id FROM public.conversas
    WHERE iniciador_user_id = auth.uid()
       OR funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
       OR (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  )
);

-- 11. RLS — permissoes_funcionario
ALTER TABLE public.permissoes_funcionario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funcionario views own permissions"
ON public.permissoes_funcionario FOR SELECT TO authenticated
USING (funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins manage permissions"
ON public.permissoes_funcionario FOR ALL TO authenticated
USING (
  is_tenant_admin(auth.uid()) AND
  funcionario_id IN (SELECT id FROM public.funcionarios WHERE tenant_id = get_user_tenant_id(auth.uid()))
)
WITH CHECK (
  is_tenant_admin(auth.uid()) AND
  funcionario_id IN (SELECT id FROM public.funcionarios WHERE tenant_id = get_user_tenant_id(auth.uid()))
);

-- 12. Triggers de updated_at
CREATE TRIGGER trg_assuntos_chat_updated_at
BEFORE UPDATE ON public.assuntos_chat
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_permissoes_funcionario_updated_at
BEFORE UPDATE ON public.permissoes_funcionario
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;