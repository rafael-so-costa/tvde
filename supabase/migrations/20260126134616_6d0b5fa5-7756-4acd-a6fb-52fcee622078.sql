-- ===========================================
-- TVDE PRO - MULTI-TENANT SAAS DATABASE SCHEMA
-- ===========================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_empresa', 'motorista', 'proprietario');
CREATE TYPE public.tipo_proprietario AS ENUM ('empresa', 'pessoa_fisica');
CREATE TYPE public.tipo_documento AS ENUM ('passaporte', 'titulo_residencia', 'cartao_cidadao');
CREATE TYPE public.estado_civil AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_facto');
CREATE TYPE public.status_cadastro AS ENUM ('pendente', 'ativo', 'incompleto', 'inativo');
CREATE TYPE public.status_contrato AS ENUM ('rascunho', 'enviado', 'assinado', 'cancelado', 'renovado', 'expirado');
CREATE TYPE public.tipo_funcionario AS ENUM ('administrativo_financas', 'gestor_frota', 'gerente_geral');
CREATE TYPE public.tipo_tarefa AS ENUM ('diaria', 'semanal', 'mensal', 'unica');
CREATE TYPE public.tipo_alerta AS ENUM ('documento_vencendo', 'tarefa_pendente', 'aniversario', 'system', 'peritagem');
CREATE TYPE public.nivel_tanque AS ENUM ('cheio', 'tres_quartos', 'metade', 'um_quarto', 'vazio');
CREATE TYPE public.nivel_limpeza AS ENUM ('profissional', 'normal', 'sujo');
CREATE TYPE public.tipo_contrato AS ENUM ('prestacao_servico', 'aluguer', 'checklist_entrega', 'checklist_devolucao');
CREATE TYPE public.tipo_multa AS ENUM ('speeding', 'parking', 'red_light', 'other');
CREATE TYPE public.status_multa AS ENUM ('pending', 'paid', 'contested');
CREATE TYPE public.status_sinistro AS ENUM ('open', 'in_progress', 'closed');

-- 2. USER ROLES TABLE (CRITICAL: Separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. TENANTS TABLE (Management Companies)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa VARCHAR(255) NOT NULL,
    nif VARCHAR(20) UNIQUE NOT NULL,
    iban VARCHAR(50),
    certidao_permanente VARCHAR(100),
    certidao_valid_until DATE,
    certificado_tvde VARCHAR(100),
    certificado_tvde_valid_until DATE,
    email VARCHAR(255),
    capital_social DECIMAL(15,2),
    telemovel VARCHAR(20),
    nome_gerente VARCHAR(255),
    endereco TEXT,
    logo_url TEXT,
    data_nascimento_gerente DATE,
    estado_civil estado_civil,
    filhos INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 4. PROFILES TABLE (User profiles with tenant association)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    nome_completo VARCHAR(255),
    foto_perfil_url TEXT,
    email_verificado BOOLEAN DEFAULT false,
    status_cadastro status_cadastro DEFAULT 'pendente',
    pre_cadastro_token VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. PROPRIETARIOS TABLE (Vehicle Owners - Company or Individual)
CREATE TABLE public.proprietarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Type
    tipo tipo_proprietario NOT NULL,
    
    -- Individual (pessoa_fisica) fields
    nome_completo VARCHAR(255),
    data_nascimento DATE,
    filhos INTEGER DEFAULT 0,
    estado_civil estado_civil,
    tipo_documento tipo_documento,
    numero_documento VARCHAR(100),
    documento_valid_until DATE,
    
    -- Company (empresa) fields
    nome_empresa VARCHAR(255),
    nif VARCHAR(20),
    iban VARCHAR(50),
    certidao_permanente VARCHAR(100),
    certidao_valid_until DATE,
    certificado_tvde VARCHAR(100),
    certificado_tvde_valid_until DATE,
    capital_social DECIMAL(15,2),
    nome_gerente VARCHAR(255),
    
    -- Common fields
    email VARCHAR(255),
    telemovel VARCHAR(20),
    endereco TEXT,
    foto_perfil_url TEXT,
    ativo BOOLEAN DEFAULT true,
    status_cadastro status_cadastro DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.proprietarios ENABLE ROW LEVEL SECURITY;

-- 6. MOTORISTAS TABLE (Drivers)
CREATE TABLE public.motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE,
    filhos INTEGER DEFAULT 0,
    estado_civil estado_civil,
    
    -- Identity document
    tipo_documento tipo_documento,
    numero_documento VARCHAR(100),
    documento_valid_until DATE,
    
    -- Driver's license
    carta_numero VARCHAR(100),
    carta_valid_until DATE,
    
    -- Criminal record
    registo_criminal_valid_until DATE,
    
    nif VARCHAR(20),
    email VARCHAR(255),
    telemovel VARCHAR(20),
    endereco TEXT,
    iban VARCHAR(50),
    foto_perfil_url TEXT,
    
    ativo BOOLEAN DEFAULT true,
    status_cadastro status_cadastro DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- 7. VEICULOS TABLE (Vehicles)
CREATE TABLE public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    proprietario_id UUID REFERENCES public.proprietarios(id) ON DELETE SET NULL,
    
    matricula VARCHAR(20) NOT NULL,
    data_matricula DATE,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    chassi VARCHAR(100),
    cilindrada INTEGER,
    potencia INTEGER,
    combustivel VARCHAR(50),
    lugares INTEGER,
    portas INTEGER,
    cor VARCHAR(50),
    
    -- Documents
    carta_verde VARCHAR(100),
    carta_verde_valid_until DATE,
    inspecao_tvde VARCHAR(100),
    inspecao_tvde_valid_until DATE,
    
    -- Platform expiry
    uber_valid_until DATE,
    bolt_valid_until DATE,
    
    -- Photos
    foto_principal_url TEXT,
    fotos_galeria JSONB DEFAULT '[]'::jsonb,
    
    ativo BOOLEAN DEFAULT true,
    status_cadastro status_cadastro DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, matricula)
);

ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- 8. FUNCIONARIOS TABLE (Employees)
CREATE TABLE public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    tipo tipo_funcionario NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- 9. TAREFAS_FUNCIONARIOS TABLE (Employee Tasks)
CREATE TABLE public.tarefas_funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE NOT NULL,
    
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo tipo_tarefa NOT NULL,
    hora_execucao TIME,
    
    -- Special reminders
    tipo_especial VARCHAR(50),
    
    concluida BOOLEAN DEFAULT false,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tarefas_funcionarios ENABLE ROW LEVEL SECURITY;

-- 10. ALERTAS_SISTEMA TABLE (System Alerts)
CREATE TABLE public.alertas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT,
    tipo tipo_alerta NOT NULL,
    data_vencimento DATE,
    lido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.alertas_sistema ENABLE ROW LEVEL SECURITY;

-- 11. TEMPLATES_CONTRATO TABLE (Contract Templates)
CREATE TABLE public.templates_contrato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    
    nome VARCHAR(255) NOT NULL,
    arquivo_url TEXT,
    campos_mapeados JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.templates_contrato ENABLE ROW LEVEL SECURITY;

-- 12. CONTRATOS TABLE (Contracts)
CREATE TABLE public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.templates_contrato(id) ON DELETE SET NULL,
    
    tipo tipo_contrato NOT NULL,
    
    proprietario_id UUID REFERENCES public.proprietarios(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    
    -- Dates
    data_inicio DATE,
    data_fim DATE,
    data_assinatura TIMESTAMP WITH TIME ZONE,
    
    -- Values
    valor_diaria DECIMAL(10,2),
    valor_semanal DECIMAL(10,2),
    valor_caucao DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    
    -- Status
    status status_contrato DEFAULT 'rascunho',
    
    -- Files
    pdf_gerado_url TEXT,
    assinatura_proprietario_url TEXT,
    assinatura_motorista_url TEXT,
    
    -- Renewal
    contrato_pai_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    renovacao_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- 13. MULTAS TABLE (Fines)
CREATE TABLE public.multas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE NOT NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    
    data_multa DATE NOT NULL,
    localizacao VARCHAR(255),
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    status status_multa DEFAULT 'pending',
    tipo tipo_multa DEFAULT 'other',
    numero_notificacao VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;

-- 14. SINISTROS TABLE (Claims/Accidents)
CREATE TABLE public.sinistros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE NOT NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    
    data_sinistro DATE NOT NULL,
    data_peritagem DATE,
    peritagem_realizada BOOLEAN DEFAULT false,
    
    seguradora VARCHAR(255),
    apolice VARCHAR(100),
    numero_processo VARCHAR(100),
    
    itens_danificados JSONB DEFAULT '[]'::jsonb,
    descricao TEXT,
    fotos JSONB DEFAULT '[]'::jsonb,
    boletim_ocorrencia_url TEXT,
    
    status status_sinistro DEFAULT 'open',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sinistros ENABLE ROW LEVEL SECURITY;

-- 15. MANUTENCOES_VEICULO TABLE (Vehicle Maintenance)
CREATE TABLE public.manutencoes_veiculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE NOT NULL,
    
    data_manutencao DATE NOT NULL,
    valor DECIMAL(10,2),
    servicos_realizados TEXT,
    km_atual INTEGER,
    fatura_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.manutencoes_veiculo ENABLE ROW LEVEL SECURITY;

-- 16. DOCUMENTOS_ARQUIVADOS TABLE (Archived Documents - Polymorphic)
CREATE TABLE public.documentos_arquivados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id UUID NOT NULL,
    
    tipo_documento VARCHAR(100) NOT NULL,
    arquivo_url TEXT NOT NULL,
    data_validade DATE,
    
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.documentos_arquivados ENABLE ROW LEVEL SECURITY;

-- 17. CHECKLIST_ENTREGA TABLE (Delivery Checklist)
CREATE TABLE public.checklist_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
    
    -- Required items
    documento_carro BOOLEAN DEFAULT false,
    carta_verde BOOLEAN DEFAULT false,
    carta_verde_valid_until DATE,
    inspecao_tvde BOOLEAN DEFAULT false,
    inspecao_tvde_valid_until DATE,
    declaracao_amigavel BOOLEAN DEFAULT false,
    colete_refletor BOOLEAN DEFAULT false,
    triangulo BOOLEAN DEFAULT false,
    kit_primeiros_socorros BOOLEAN DEFAULT false,
    extintor BOOLEAN DEFAULT false,
    extintor_valid_until DATE,
    placa_tvde_1 BOOLEAN DEFAULT false,
    placa_tvde_2 BOOLEAN DEFAULT false,
    placa_proibido_fumar_1 BOOLEAN DEFAULT false,
    placa_proibido_fumar_2 BOOLEAN DEFAULT false,
    cartao_abastecimento BOOLEAN DEFAULT false,
    tampa_porta_malas BOOLEAN DEFAULT false,
    nivel_tanque nivel_tanque,
    carregador_eletrico BOOLEAN DEFAULT false,
    carregador_tomada BOOLEAN DEFAULT false,
    compressor_ar BOOLEAN DEFAULT false,
    tapetes_qty INTEGER DEFAULT 0,
    calotas_qty INTEGER DEFAULT 0,
    
    -- Cleaning
    limpeza_interior nivel_limpeza,
    limpeza_exterior nivel_limpeza,
    
    -- Media
    fotos_interior JSONB DEFAULT '[]'::jsonb,
    fotos_exterior JSONB DEFAULT '[]'::jsonb,
    video_interior_url TEXT,
    video_exterior_url TEXT,
    
    -- Visual inspection (damage map)
    danos_desenho JSONB DEFAULT '[]'::jsonb,
    
    -- Signatures
    assinatura_entregador_url TEXT,
    assinatura_recebedor_url TEXT,
    
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_entrega ENABLE ROW LEVEL SECURITY;

-- 18. CHECKLIST_DEVOLUCAO TABLE (Return Checklist)
CREATE TABLE public.checklist_devolucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
    
    -- Items and damages
    itens_faltantes JSONB DEFAULT '[]'::jsonb,
    danos_novos JSONB DEFAULT '[]'::jsonb,
    
    valor_total_penalizacao DECIMAL(10,2) DEFAULT 0,
    observacoes TEXT,
    
    -- Generated contracts
    contrato_entrega_normal_url TEXT,
    contrato_com_danos_url TEXT,
    
    -- Media
    fotos JSONB DEFAULT '[]'::jsonb,
    videos JSONB DEFAULT '[]'::jsonb,
    
    -- Signatures
    assinatura_devolvedor_url TEXT,
    assinatura_recebedor_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_devolucao ENABLE ROW LEVEL SECURITY;

-- 19. MENSAGENS_AUTOMATIZADAS TABLE (Automated Messages)
CREATE TABLE public.mensagens_automatizadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo_midia VARCHAR(50) DEFAULT 'texto',
    arquivo_midia_url TEXT,
    
    enviar_imediato BOOLEAN DEFAULT false,
    agendamento TIMESTAMP WITH TIME ZONE,
    
    tipo_destinatario VARCHAR(50) DEFAULT 'todos',
    destinatario_individual_id UUID,
    
    enviada BOOLEAN DEFAULT false,
    data_envio TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mensagens_automatizadas ENABLE ROW LEVEL SECURITY;

-- 20. LEMBRETES_SISTEMA TABLE (System Reminders)
CREATE TABLE public.lembretes_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    
    tipo VARCHAR(100) NOT NULL,
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id UUID NOT NULL,
    
    data_referencia DATE NOT NULL,
    dias_antes INTEGER DEFAULT 1,
    
    mensagem_enviada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lembretes_sistema ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECURITY DEFINER FUNCTIONS
-- ===========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user is tenant admin (super_admin or admin_empresa)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin_empresa')
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_proprietarios_updated_at BEFORE UPDATE ON public.proprietarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_motoristas_updated_at BEFORE UPDATE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_templates_contrato_updated_at BEFORE UPDATE ON public.templates_contrato FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_multas_updated_at BEFORE UPDATE ON public.multas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_sinistros_updated_at BEFORE UPDATE ON public.sinistros FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- USER_ROLES policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- TENANTS policies
CREATE POLICY "Super admins can manage tenants" ON public.tenants
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can view their tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id(auth.uid()));

-- PROFILES policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tenant admins can view profiles in their tenant" ON public.profiles
  FOR SELECT USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- PROPRIETARIOS policies
CREATE POLICY "Tenant admins can manage proprietarios" ON public.proprietarios
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Proprietarios can view their own data" ON public.proprietarios
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Proprietarios can update their own data" ON public.proprietarios
  FOR UPDATE USING (user_id = auth.uid());

-- MOTORISTAS policies
CREATE POLICY "Tenant admins can manage motoristas" ON public.motoristas
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their own data" ON public.motoristas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Motoristas can update their own data" ON public.motoristas
  FOR UPDATE USING (user_id = auth.uid());

-- VEICULOS policies
CREATE POLICY "Tenant admins can manage veiculos" ON public.veiculos
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Proprietarios can view their vehicles" ON public.veiculos
  FOR SELECT USING (
    proprietario_id IN (
      SELECT id FROM public.proprietarios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Motoristas can view assigned vehicles" ON public.veiculos
  FOR SELECT USING (
    id IN (
      SELECT veiculo_id FROM public.contratos 
      WHERE motorista_id IN (
        SELECT id FROM public.motoristas WHERE user_id = auth.uid()
      )
      AND status IN ('assinado', 'enviado')
    )
  );

-- FUNCIONARIOS policies
CREATE POLICY "Tenant admins can manage funcionarios" ON public.funcionarios
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- TAREFAS_FUNCIONARIOS policies
CREATE POLICY "Tenant admins can manage tarefas" ON public.tarefas_funcionarios
  FOR ALL USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND
    public.is_tenant_admin(auth.uid())
  );

-- ALERTAS_SISTEMA policies
CREATE POLICY "Tenant users can view their alerts" ON public.alertas_sistema
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can manage alerts" ON public.alertas_sistema
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- TEMPLATES_CONTRATO policies
CREATE POLICY "Tenant admins can manage templates" ON public.templates_contrato
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- CONTRATOS policies
CREATE POLICY "Tenant admins can manage contratos" ON public.contratos
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their contracts" ON public.contratos
  FOR SELECT USING (
    motorista_id IN (
      SELECT id FROM public.motoristas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Proprietarios can view their contracts" ON public.contratos
  FOR SELECT USING (
    proprietario_id IN (
      SELECT id FROM public.proprietarios WHERE user_id = auth.uid()
    )
  );

-- MULTAS policies
CREATE POLICY "Tenant admins can manage multas" ON public.multas
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their fines" ON public.multas
  FOR SELECT USING (
    motorista_id IN (
      SELECT id FROM public.motoristas WHERE user_id = auth.uid()
    )
  );

-- SINISTROS policies
CREATE POLICY "Tenant admins can manage sinistros" ON public.sinistros
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their claims" ON public.sinistros
  FOR SELECT USING (
    motorista_id IN (
      SELECT id FROM public.motoristas WHERE user_id = auth.uid()
    )
  );

-- MANUTENCOES_VEICULO policies
CREATE POLICY "Tenant admins can manage manutencoes" ON public.manutencoes_veiculo
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- DOCUMENTOS_ARQUIVADOS policies
CREATE POLICY "Tenant admins can manage documentos" ON public.documentos_arquivados
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- CHECKLIST_ENTREGA policies
CREATE POLICY "Tenant admins can manage checklist_entrega" ON public.checklist_entrega
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their delivery checklists" ON public.checklist_entrega
  FOR SELECT USING (
    contrato_id IN (
      SELECT id FROM public.contratos 
      WHERE motorista_id IN (
        SELECT id FROM public.motoristas WHERE user_id = auth.uid()
      )
    )
  );

-- CHECKLIST_DEVOLUCAO policies
CREATE POLICY "Tenant admins can manage checklist_devolucao" ON public.checklist_devolucao
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Motoristas can view their return checklists" ON public.checklist_devolucao
  FOR SELECT USING (
    contrato_id IN (
      SELECT id FROM public.contratos 
      WHERE motorista_id IN (
        SELECT id FROM public.motoristas WHERE user_id = auth.uid()
      )
    )
  );

-- MENSAGENS_AUTOMATIZADAS policies
CREATE POLICY "Tenant admins can manage mensagens" ON public.mensagens_automatizadas
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- LEMBRETES_SISTEMA policies
CREATE POLICY "Tenant admins can manage lembretes" ON public.lembretes_sistema
  FOR ALL USING (
    public.is_tenant_admin(auth.uid()) AND 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_proprietarios_tenant ON public.proprietarios(tenant_id);
CREATE INDEX idx_proprietarios_user ON public.proprietarios(user_id);
CREATE INDEX idx_motoristas_tenant ON public.motoristas(tenant_id);
CREATE INDEX idx_motoristas_user ON public.motoristas(user_id);
CREATE INDEX idx_veiculos_tenant ON public.veiculos(tenant_id);
CREATE INDEX idx_veiculos_proprietario ON public.veiculos(proprietario_id);
CREATE INDEX idx_funcionarios_tenant ON public.funcionarios(tenant_id);
CREATE INDEX idx_contratos_tenant ON public.contratos(tenant_id);
CREATE INDEX idx_contratos_motorista ON public.contratos(motorista_id);
CREATE INDEX idx_contratos_proprietario ON public.contratos(proprietario_id);
CREATE INDEX idx_contratos_veiculo ON public.contratos(veiculo_id);
CREATE INDEX idx_multas_tenant ON public.multas(tenant_id);
CREATE INDEX idx_multas_veiculo ON public.multas(veiculo_id);
CREATE INDEX idx_sinistros_tenant ON public.sinistros(tenant_id);
CREATE INDEX idx_sinistros_veiculo ON public.sinistros(veiculo_id);
CREATE INDEX idx_documentos_entidade ON public.documentos_arquivados(entidade_tipo, entidade_id);
CREATE INDEX idx_alertas_funcionario ON public.alertas_sistema(funcionario_id, lido);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ===========================================
-- TRIGGER: Create profile on user signup
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();