-- Add missing storage policy for avatars bucket (upload)
CREATE POLICY "Tenant admins can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND is_tenant_admin(auth.uid())
);

-- Allow tenant admins to update avatars
CREATE POLICY "Tenant admins can update avatars" 
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND is_tenant_admin(auth.uid())
);

-- Allow tenant admins to delete avatars
CREATE POLICY "Tenant admins can delete avatars" 
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND is_tenant_admin(auth.uid())
);

-- Add address fields to proprietarios table
ALTER TABLE public.proprietarios 
ADD COLUMN IF NOT EXISTS endereco_rua TEXT,
ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
ADD COLUMN IF NOT EXISTS endereco_cep TEXT,
ADD COLUMN IF NOT EXISTS fotos_galeria JSONB DEFAULT '[]'::jsonb;

-- Add address fields to motoristas table
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS endereco_rua TEXT,
ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
ADD COLUMN IF NOT EXISTS endereco_cep TEXT,
ADD COLUMN IF NOT EXISTS fotos_galeria JSONB DEFAULT '[]'::jsonb;

-- Add contract relationships tracking
-- Create table to track active vehicle assignments
CREATE TABLE IF NOT EXISTS public.contratos_ativos_veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (veiculo_id, contrato_id)
);

-- Enable RLS
ALTER TABLE public.contratos_ativos_veiculos ENABLE ROW LEVEL SECURITY;

-- Create policies for contratos_ativos_veiculos
CREATE POLICY "Tenant admins can view vehicle assignments" 
ON public.contratos_ativos_veiculos 
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Tenant admins can create vehicle assignments" 
ON public.contratos_ativos_veiculos 
FOR INSERT 
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Tenant admins can update vehicle assignments" 
ON public.contratos_ativos_veiculos 
FOR UPDATE 
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Tenant admins can delete vehicle assignments" 
ON public.contratos_ativos_veiculos 
FOR DELETE 
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);