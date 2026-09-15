-- Create maintenance records table
CREATE TABLE public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  proprietario_id UUID REFERENCES public.proprietarios(id) ON DELETE SET NULL,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  km INTEGER,
  data_servico DATE NOT NULL,
  tipo_servico TEXT NOT NULL,
  data_ultima_revisao_basica DATE,
  documentos JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view maintenance records from their tenant"
ON public.manutencoes
FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Tenant admins can insert maintenance records"
ON public.manutencoes
FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Tenant admins can update maintenance records"
ON public.manutencoes
FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Tenant admins can delete maintenance records"
ON public.manutencoes
FOR DELETE
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_manutencoes_updated_at
BEFORE UPDATE ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();