-- Add status field to profiles for pending approval
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS aprovado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_aprovacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS aprovado_por uuid;

-- Add tenant relationship for drivers and owners
-- This is already handled by motoristas and proprietarios tables

-- Create a table for pending registrations notifications
CREATE TABLE IF NOT EXISTS public.notificacoes_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_cadastro text NOT NULL, -- 'admin_empresa', 'motorista', 'proprietario'
  status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
  tenant_id uuid REFERENCES public.tenants(id),
  dados_adicionais jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes_cadastro ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all notifications
CREATE POLICY "Super admins can manage all notifications"
ON public.notificacoes_cadastro
FOR ALL
USING (is_super_admin(auth.uid()));

-- Tenant admins can view notifications for their tenant
CREATE POLICY "Tenant admins can view tenant notifications"
ON public.notificacoes_cadastro
FOR SELECT
USING (
  is_tenant_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- Users can view their own registration status
CREATE POLICY "Users can view their own notifications"
ON public.notificacoes_cadastro
FOR SELECT
USING (user_id = auth.uid());