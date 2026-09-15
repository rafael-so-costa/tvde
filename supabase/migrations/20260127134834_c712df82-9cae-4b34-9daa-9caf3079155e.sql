-- Add new columns to templates_contrato for field mapping
ALTER TABLE public.templates_contrato 
ADD COLUMN IF NOT EXISTS tipo_arquivo varchar DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS conteudo_original text,
ADD COLUMN IF NOT EXISTS campos_detectados jsonb DEFAULT '[]'::jsonb;

-- Create contract versions table for version control
CREATE TABLE IF NOT EXISTS public.versoes_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  versao_numero integer NOT NULL DEFAULT 1,
  dados_campos jsonb DEFAULT '{}'::jsonb,
  criado_por uuid,
  created_at timestamptz DEFAULT now(),
  observacoes text
);

-- Create digital signatures table
CREATE TABLE IF NOT EXISTS public.assinaturas_digitais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  signatario_tipo varchar NOT NULL, -- 'motorista', 'proprietario', 'empresa'
  signatario_id uuid,
  signatario_nome varchar NOT NULL,
  signatario_email varchar NOT NULL,
  assinatura_url text,
  ip_address varchar,
  user_agent text,
  hash_documento varchar,
  token_verificacao varchar,
  codigo_otp varchar,
  otp_expira_em timestamptz,
  verificado boolean DEFAULT false,
  assinado_em timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.logs_auditoria_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid,
  acao varchar NOT NULL, -- 'criacao', 'edicao', 'visualizacao', 'assinatura', 'exportacao'
  detalhes jsonb DEFAULT '{}'::jsonb,
  ip_address varchar,
  created_at timestamptz DEFAULT now()
);

-- Add campos_preenchidos to contratos for storing filled field values
ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS campos_preenchidos jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS versao_atual integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS hash_documento varchar,
ADD COLUMN IF NOT EXISTS bloqueado boolean DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.versoes_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria_contratos ENABLE ROW LEVEL SECURITY;

-- RLS policies for versoes_contrato
CREATE POLICY "Tenant admins can manage contract versions"
ON public.versoes_contrato FOR ALL
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policies for assinaturas_digitais
CREATE POLICY "Tenant admins can manage signatures"
ON public.assinaturas_digitais FOR ALL
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Signatories can view their signatures"
ON public.assinaturas_digitais FOR SELECT
USING (signatario_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS policies for logs_auditoria_contratos
CREATE POLICY "Tenant admins can view audit logs"
ON public.logs_auditoria_contratos FOR SELECT
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "System can insert audit logs"
ON public.logs_auditoria_contratos FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));