export type StatusAluguer = "rascunho" | "ativo" | "finalizado" | "cancelado";

export interface Aluguer {
  id: string;
  tenant_id: string;
  status: StatusAluguer;
  motorista_id: string | null;
  veiculo_id: string | null;
  proprietario_id: string | null;
  contrato_aluguer_id: string | null;
  contrato_prestacao_id: string | null;
  checklist_entrega_id: string | null;
  checklist_devolucao_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_finalizacao: string | null;
  rascunho_passo: number;
  rascunho_dados: Record<string, any>;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Devolução
  devolucao_tipo?: string | null;
  devolucao_dias_atraso?: number | null;
  devolucao_valor_dia?: number | null;
  devolucao_multa_atraso?: number | null;
  devolucao_multas_adicionais?: Array<{ nome: string; valor: number }> | null;
  devolucao_penalizacoes_checklist?: number | null;
  devolucao_total_pagar?: number | null;
  devolucao_declaracao_aceite?: boolean | null;
  devolucao_assinatura_motorista_url?: string | null;
  devolucao_assinatura_empresa_url?: string | null;
  devolucao_pdf_url?: string | null;
  devolucao_observacoes?: string | null;
  // Joins (manual)
  motorista?: { id: string; nome_completo: string } | null;
  veiculo?: { id: string; matricula: string; marca?: string | null; modelo?: string | null } | null;
  proprietario?: { id: string; tipo: string; nome_completo?: string | null; nome_empresa?: string | null } | null;
  contrato_aluguer?: { id: string; status: string } | null;
  contrato_prestacao?: { id: string; status: string } | null;
}

export interface AluguerRascunhoDados {
  // Passo 1 - Contrato Aluguer
  template_aluguer_id?: string | null;
  contrato_aluguer_id?: string | null;
  // Passo 2 - Contrato Prestação
  template_prestacao_id?: string | null;
  contrato_prestacao_id?: string | null;
  // Passo 3 - Checklist
  checklist_entrega_id?: string | null;
  // Entidades selecionadas
  motorista_id?: string | null;
  veiculo_id?: string | null;
  proprietario_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  observacoes?: string | null;
}
