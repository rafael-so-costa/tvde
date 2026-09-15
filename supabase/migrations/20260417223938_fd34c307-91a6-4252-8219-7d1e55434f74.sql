-- Tabela para campos personalizados em qualquer perfil
CREATE TABLE IF NOT EXISTS public.campos_personalizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('funcionario','motorista','veiculo','empresa','proprietario')),
  entidade_id UUID NOT NULL,
  nome_campo TEXT NOT NULL,
  valor TEXT,
  data_vencimento DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campos_pers_entidade
  ON public.campos_personalizados(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_campos_pers_tenant
  ON public.campos_personalizados(tenant_id);

ALTER TABLE public.campos_personalizados ENABLE ROW LEVEL SECURITY;

-- Tenant admins: gestão completa
CREATE POLICY "Tenant admins manage campos_personalizados"
ON public.campos_personalizados
FOR ALL TO authenticated
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- Funcionário vê os seus próprios
CREATE POLICY "Funcionario views own campos"
ON public.campos_personalizados
FOR SELECT TO authenticated
USING (
  entidade_tipo = 'funcionario'
  AND entidade_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
);

-- Motorista vê os seus próprios
CREATE POLICY "Motorista views own campos"
ON public.campos_personalizados
FOR SELECT TO authenticated
USING (
  entidade_tipo = 'motorista'
  AND entidade_id IN (SELECT id FROM public.motoristas WHERE user_id = auth.uid())
);

-- Proprietário vê os seus próprios (e dos seus veículos)
CREATE POLICY "Proprietario views own campos"
ON public.campos_personalizados
FOR SELECT TO authenticated
USING (
  (entidade_tipo = 'proprietario'
   AND entidade_id IN (SELECT id FROM public.proprietarios WHERE user_id = auth.uid()))
  OR
  (entidade_tipo = 'veiculo'
   AND entidade_id IN (
     SELECT id FROM public.veiculos
     WHERE proprietario_id IN (SELECT id FROM public.proprietarios WHERE user_id = auth.uid())
   ))
);

-- Trigger updated_at
CREATE TRIGGER trg_campos_pers_updated_at
BEFORE UPDATE ON public.campos_personalizados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();