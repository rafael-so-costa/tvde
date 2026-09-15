-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create empresas table for company profiles (separate from tenants)
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome_empresa TEXT NOT NULL,
  nif TEXT NOT NULL,
  email TEXT,
  telemovel TEXT,
  nome_gerente TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_cep TEXT,
  endereco_cidade TEXT,
  iban TEXT,
  capital_social NUMERIC(15,2),
  certificado_tvde TEXT,
  certificado_tvde_valid_until DATE,
  logo_url TEXT,
  ativo BOOLEAN DEFAULT true,
  status_cadastro public.status_cadastro DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view empresas in their tenant"
ON public.empresas FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert empresas in their tenant"
ON public.empresas FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update empresas in their tenant"
ON public.empresas FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete empresas in their tenant"
ON public.empresas FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for tenant queries
CREATE INDEX idx_empresas_tenant_id ON public.empresas(tenant_id);