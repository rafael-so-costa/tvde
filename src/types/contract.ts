export interface ContractField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'cpf_cnpj' | 'email' | 'phone';
  required: boolean;
  value?: string;
  placeholder?: string;
  validation?: string;
}

export interface ContractTemplate {
  id: string;
  nome: string;
  arquivo_url: string | null;
  tipo_arquivo: string;
  conteudo_original: string | null;
  campos_detectados: ContractField[];
  campos_mapeados: Record<string, any>;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ContractVersion {
  id: string;
  contrato_id: string;
  tenant_id: string;
  versao_numero: number;
  dados_campos: Record<string, any>;
  criado_por: string | null;
  created_at: string;
  observacoes: string | null;
}

export interface DigitalSignature {
  id: string;
  contrato_id: string;
  tenant_id: string;
  signatario_tipo: 'motorista' | 'proprietario' | 'empresa';
  signatario_id: string | null;
  signatario_nome: string;
  signatario_email: string;
  assinatura_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  hash_documento: string | null;
  token_verificacao: string | null;
  codigo_otp: string | null;
  otp_expira_em: string | null;
  verificado: boolean;
  assinado_em: string | null;
  created_at: string;
}

export interface ContractAuditLog {
  id: string;
  contrato_id: string | null;
  tenant_id: string;
  user_id: string | null;
  acao: 'criacao' | 'edicao' | 'visualizacao' | 'assinatura' | 'exportacao';
  detalhes: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  tenant_id: string;
  template_id: string | null;
  motorista_id: string | null;
  proprietario_id: string | null;
  veiculo_id: string | null;
  tipo: 'prestacao_servico' | 'aluguer' | 'checklist_entrega' | 'checklist_devolucao';
  status: 'rascunho' | 'enviado' | 'assinado' | 'cancelado' | 'renovado' | 'expirado' | 'encerrado';
  data_inicio: string | null;
  data_fim: string | null;
  valor_semanal: number | null;
  valor_diaria: number | null;
  valor_caucao: number | null;
  valor_total: number | null;
  campos_preenchidos: Record<string, any>;
  versao_atual: number;
  hash_documento: string | null;
  bloqueado: boolean;
  pdf_gerado_url: string | null;
  assinatura_motorista_url: string | null;
  assinatura_proprietario_url: string | null;
  data_assinatura: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  template?: ContractTemplate;
  motorista?: {
    id: string;
    nome_completo: string;
    nif?: string;
    email?: string;
    telemovel?: string;
    iban?: string;
    endereco_rua?: string;
    endereco_numero?: string;
    endereco_complemento?: string;
    endereco_cep?: string;
    endereco_cidade?: string;
    tipo_documento?: string;
    numero_documento?: string;
    documento_valid_until?: string;
    certificado_tvde?: string;
    carta_numero?: string;
    carta_valid_until?: string;
    data_nascimento?: string;
  };
  proprietario?: {
    id: string;
    tipo: string;
    nome_completo?: string;
    nome_empresa?: string;
    nome_gerente?: string;
    nif?: string;
    email?: string;
    telemovel?: string;
    iban?: string;
    endereco_rua?: string;
    endereco_numero?: string;
    endereco_complemento?: string;
    endereco_cep?: string;
    endereco_cidade?: string;
    tipo_documento?: string;
    numero_documento?: string;
    documento_valid_until?: string;
    capital_social?: number;
  };
  veiculo?: {
    id: string;
    matricula: string;
    marca?: string;
    modelo?: string;
    data_matricula?: string;
    chassi?: string;
    cilindrada?: number | string;
    potencia?: number | string;
    combustivel?: string;
    lugares?: number;
    portas?: number;
    cor?: string;
    valor_caucao?: number;
    valor_aluguel?: number;
  };
  versoes?: ContractVersion[];
  assinaturas?: DigitalSignature[];
}
