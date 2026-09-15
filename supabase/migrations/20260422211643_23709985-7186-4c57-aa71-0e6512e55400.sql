-- Criar tabela de perfis (categorias) de templates
CREATE TABLE public.perfis_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE public.perfis_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view perfis_template"
  ON public.perfis_template FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins manage perfis_template"
  ON public.perfis_template FOR ALL
  TO authenticated
  USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_perfis_template_updated_at
  BEFORE UPDATE ON public.perfis_template
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna perfil_id em templates_contrato
ALTER TABLE public.templates_contrato
  ADD COLUMN perfil_id uuid REFERENCES public.perfis_template(id) ON DELETE SET NULL;

CREATE INDEX idx_templates_contrato_perfil_id ON public.templates_contrato(perfil_id);

-- Função utilitária para garantir um perfil por tenant+nome
CREATE OR REPLACE FUNCTION public.garantir_perfil_template(_tenant_id uuid, _nome text, _ordem integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.perfis_template
   WHERE tenant_id = _tenant_id AND upper(nome) = upper(_nome) LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.perfis_template (tenant_id, nome, ordem)
    VALUES (_tenant_id, _nome, _ordem)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Migração automática: criar perfis padrão por tenant e atribuir templates existentes
DO $$
DECLARE
  v_tenant record;
  v_devolucao uuid;
  v_prestacao uuid;
  v_aluguer uuid;
  v_bolt uuid;
  v_uber uuid;
  v_outros uuid;
  v_tpl record;
  v_nome_norm text;
  v_perfil uuid;
BEGIN
  FOR v_tenant IN SELECT DISTINCT tenant_id FROM public.templates_contrato LOOP
    v_devolucao := public.garantir_perfil_template(v_tenant.tenant_id, 'DEVOLUÇÃO DO CARRO', 1);
    v_prestacao := public.garantir_perfil_template(v_tenant.tenant_id, 'PRESTAÇÃO DE SERVIÇO', 2);
    v_aluguer   := public.garantir_perfil_template(v_tenant.tenant_id, 'ALUGUER DE VEÍCULOS', 3);
    v_bolt      := public.garantir_perfil_template(v_tenant.tenant_id, 'CONTRATO BOLT', 4);
    v_uber      := public.garantir_perfil_template(v_tenant.tenant_id, 'CONTRATO UBER', 5);
    v_outros    := public.garantir_perfil_template(v_tenant.tenant_id, 'OUTROS', 99);

    FOR v_tpl IN
      SELECT id, nome FROM public.templates_contrato
      WHERE tenant_id = v_tenant.tenant_id AND perfil_id IS NULL
    LOOP
      v_nome_norm := upper(regexp_replace(coalesce(v_tpl.nome, ''), '\s+', ' ', 'g'));
      v_perfil := NULL;

      IF v_nome_norm LIKE '%DEVOLUCAO%' OR v_nome_norm LIKE '%DEVOLUÇÃO%' THEN
        v_perfil := v_devolucao;
      ELSIF v_nome_norm LIKE '%BOLT%' THEN
        v_perfil := v_bolt;
      ELSIF v_nome_norm LIKE '%UBER%' THEN
        v_perfil := v_uber;
      ELSIF v_nome_norm LIKE '%ALUGUER%' THEN
        v_perfil := v_aluguer;
      ELSIF v_nome_norm LIKE '%PRESTACAO%' OR v_nome_norm LIKE '%PRESTAÇÃO%' OR v_nome_norm LIKE '%DENUNCIA%' OR v_nome_norm LIKE '%DENÚNCIA%' THEN
        v_perfil := v_prestacao;
      ELSE
        v_perfil := v_outros;
      END IF;

      UPDATE public.templates_contrato SET perfil_id = v_perfil WHERE id = v_tpl.id;
    END LOOP;
  END LOOP;
END $$;