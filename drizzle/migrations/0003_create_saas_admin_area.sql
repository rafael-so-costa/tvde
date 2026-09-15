-- ============ Equipa interna do SaaS ============
CREATE TABLE public.saas_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  nome TEXT,
  papel TEXT NOT NULL DEFAULT 'suporte' CHECK (papel IN ('owner','financeiro','suporte')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.saas_admins TO authenticated;
GRANT ALL ON public.saas_admins TO service_role;
ALTER TABLE public.saas_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_saas_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saas_admins
    WHERE user_id = _user_id AND ativo = true
  ) OR public.has_role(_user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.saas_admin_papel(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT papel FROM public.saas_admins WHERE user_id = _user_id AND ativo = true LIMIT 1),
    CASE WHEN public.has_role(_user_id, 'super_admin') THEN 'owner' ELSE NULL END
  )
$$;

CREATE OR REPLACE FUNCTION public.is_saas_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.saas_admin_papel(_user_id) = 'owner'
$$;

CREATE POLICY "saas_admins_select" ON public.saas_admins
  FOR SELECT TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "saas_admins_insert" ON public.saas_admins
  FOR INSERT TO authenticated WITH CHECK (public.is_saas_owner(auth.uid()));
CREATE POLICY "saas_admins_update" ON public.saas_admins
  FOR UPDATE TO authenticated USING (public.is_saas_owner(auth.uid()));

-- ============ Planos ============
CREATE TABLE public.saas_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_anual NUMERIC(10,2),
  limite_veiculos INTEGER,
  limite_motoristas INTEGER,
  funcionalidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_planos TO authenticated;
GRANT ALL ON public.saas_planos TO service_role;
ALTER TABLE public.saas_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_planos_select" ON public.saas_planos
  FOR SELECT TO authenticated USING (public.is_saas_admin(auth.uid()));
CREATE POLICY "saas_planos_write" ON public.saas_planos
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()));

-- ============ Subscrições ============
CREATE TABLE public.saas_subscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.saas_planos(id) ON DELETE SET NULL,
  ciclo TEXT NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal','anual')),
  estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial','ativa','suspensa','cancelada')),
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  proxima_renovacao DATE,
  dia_vencimento INTEGER NOT NULL DEFAULT 1 CHECK (dia_vencimento BETWEEN 1 AND 28),
  metodo_cobranca TEXT NOT NULL DEFAULT 'manual' CHECK (metodo_cobranca IN ('manual','transferencia','debito_direto','stripe','paddle')),
  provedor_externo TEXT,
  referencia_externa TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saas_subscricoes_tenant ON public.saas_subscricoes(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_subscricoes TO authenticated;
GRANT ALL ON public.saas_subscricoes TO service_role;
ALTER TABLE public.saas_subscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_subscricoes_all" ON public.saas_subscricoes
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()));

-- ============ Configuração de faturação ============
CREATE TABLE public.saas_config_faturacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_nome TEXT NOT NULL DEFAULT '',
  emitente_nif TEXT,
  emitente_endereco TEXT,
  emitente_email TEXT,
  emitente_telefone TEXT,
  iban TEXT,
  logo_url TEXT,
  prefixo_numero TEXT NOT NULL DEFAULT 'FAT',
  proximo_numero INTEGER NOT NULL DEFAULT 1,
  taxa_iva NUMERIC(5,2) NOT NULL DEFAULT 23,
  prazo_pagamento_dias INTEGER NOT NULL DEFAULT 8,
  rodape TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.saas_config_faturacao TO authenticated;
GRANT ALL ON public.saas_config_faturacao TO service_role;
ALTER TABLE public.saas_config_faturacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_config_faturacao_all" ON public.saas_config_faturacao
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()));

-- ============ Faturas ============
CREATE TABLE public.saas_faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscricao_id UUID REFERENCES public.saas_subscricoes(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_nif TEXT,
  cliente_endereco TEXT,
  cliente_email TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  descricao TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_iva NUMERIC(5,2) NOT NULL DEFAULT 23,
  valor_iva NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'EUR',
  estado TEXT NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho','emitida','paga','vencida','anulada')),
  pdf_url TEXT,
  provedor TEXT,
  referencia_externa TEXT,
  url_fatura_provedor TEXT,
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saas_faturas_tenant ON public.saas_faturas(tenant_id);
CREATE INDEX idx_saas_faturas_estado ON public.saas_faturas(estado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_faturas TO authenticated;
GRANT ALL ON public.saas_faturas TO service_role;
ALTER TABLE public.saas_faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_faturas_all" ON public.saas_faturas
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()));

-- ============ Pagamentos ============
CREATE TABLE public.saas_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID REFERENCES public.saas_faturas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo TEXT NOT NULL DEFAULT 'transferencia' CHECK (metodo IN ('transferencia','mbway','multibanco','cartao','dinheiro','stripe','paddle','outro')),
  referencia TEXT,
  provedor TEXT,
  provedor_pagamento_id TEXT,
  estado TEXT NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('registado','confirmado','devolvido')),
  notas TEXT,
  registado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saas_pagamentos_fatura ON public.saas_pagamentos(fatura_id);
CREATE INDEX idx_saas_pagamentos_tenant ON public.saas_pagamentos(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_pagamentos TO authenticated;
GRANT ALL ON public.saas_pagamentos TO service_role;
ALTER TABLE public.saas_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_pagamentos_all" ON public.saas_pagamentos
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()));

-- ============ Triggers ============
CREATE TRIGGER trg_saas_admins_updated_at BEFORE UPDATE ON public.saas_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saas_planos_updated_at BEFORE UPDATE ON public.saas_planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saas_subscricoes_updated_at BEFORE UPDATE ON public.saas_subscricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saas_faturas_updated_at BEFORE UPDATE ON public.saas_faturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saas_config_faturacao_updated_at BEFORE UPDATE ON public.saas_config_faturacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marca a fatura como paga quando os pagamentos confirmados cobrem o total
CREATE OR REPLACE FUNCTION public.saas_atualizar_estado_fatura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fatura_id UUID;
  v_total NUMERIC(10,2);
  v_pago NUMERIC(10,2);
  v_estado TEXT;
BEGIN
  v_fatura_id := COALESCE(NEW.fatura_id, OLD.fatura_id);
  IF v_fatura_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT total, estado INTO v_total, v_estado FROM public.saas_faturas WHERE id = v_fatura_id;
  IF v_estado = 'anulada' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_pago
  FROM public.saas_pagamentos
  WHERE fatura_id = v_fatura_id AND estado = 'confirmado';

  IF v_pago >= v_total AND v_total > 0 THEN
    UPDATE public.saas_faturas SET estado = 'paga' WHERE id = v_fatura_id AND estado <> 'paga';
  ELSIF v_estado = 'paga' THEN
    UPDATE public.saas_faturas SET estado = 'emitida' WHERE id = v_fatura_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_saas_pagamentos_estado
  AFTER INSERT OR UPDATE OR DELETE ON public.saas_pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.saas_atualizar_estado_fatura();

-- Gera o próximo número de fatura de forma atómica
CREATE OR REPLACE FUNCTION public.saas_proximo_numero_fatura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg RECORD;
  v_numero TEXT;
BEGIN
  IF NOT public.is_saas_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_cfg FROM public.saas_config_faturacao ORDER BY created_at LIMIT 1 FOR UPDATE;

  IF v_cfg.id IS NULL THEN
    INSERT INTO public.saas_config_faturacao (emitente_nome) VALUES ('')
    RETURNING * INTO v_cfg;
  END IF;

  v_numero := v_cfg.prefixo_numero || '-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
              lpad(v_cfg.proximo_numero::text, 4, '0');

  UPDATE public.saas_config_faturacao
  SET proximo_numero = v_cfg.proximo_numero + 1
  WHERE id = v_cfg.id;

  RETURN v_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_proximo_numero_fatura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_admin_papel(UUID) TO authenticated;

-- Vista de métricas do negócio (só acessível a admins do SaaS via função)
CREATE OR REPLACE FUNCTION public.saas_metricas()
RETURNS TABLE(
  clientes_total BIGINT,
  clientes_ativos BIGINT,
  subscricoes_trial BIGINT,
  subscricoes_suspensas BIGINT,
  subscricoes_canceladas BIGINT,
  novos_mes BIGINT,
  mrr NUMERIC,
  arr NUMERIC,
  receita_mes NUMERIC,
  em_divida NUMERIC,
  faturas_vencidas BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_saas_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.tenants),
    (SELECT COUNT(*) FROM public.saas_subscricoes WHERE estado = 'ativa'),
    (SELECT COUNT(*) FROM public.saas_subscricoes WHERE estado = 'trial'),
    (SELECT COUNT(*) FROM public.saas_subscricoes WHERE estado = 'suspensa'),
    (SELECT COUNT(*) FROM public.saas_subscricoes WHERE estado = 'cancelada'),
    (SELECT COUNT(*) FROM public.saas_subscricoes WHERE data_inicio >= date_trunc('month', CURRENT_DATE)),
    (SELECT COALESCE(SUM(CASE WHEN ciclo = 'anual' THEN preco / 12 ELSE preco END * (1 - desconto_percent / 100)), 0)
       FROM public.saas_subscricoes WHERE estado = 'ativa'),
    (SELECT COALESCE(SUM(CASE WHEN ciclo = 'anual' THEN preco ELSE preco * 12 END * (1 - desconto_percent / 100)), 0)
       FROM public.saas_subscricoes WHERE estado = 'ativa'),
    (SELECT COALESCE(SUM(valor), 0) FROM public.saas_pagamentos
       WHERE estado = 'confirmado' AND data_pagamento >= date_trunc('month', CURRENT_DATE)),
    (SELECT COALESCE(SUM(total), 0) FROM public.saas_faturas WHERE estado IN ('emitida','vencida')),
    (SELECT COUNT(*) FROM public.saas_faturas WHERE estado IN ('emitida','vencida') AND data_vencimento < CURRENT_DATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_metricas() TO authenticated;