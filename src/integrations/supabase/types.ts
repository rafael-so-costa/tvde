export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas_sistema: {
        Row: {
          created_at: string | null
          data_vencimento: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          funcionario_id: string | null
          id: string
          lido: boolean | null
          mensagem: string | null
          sub_tipo: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
          titulo: string
        }
        Insert: {
          created_at?: string | null
          data_vencimento?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          funcionario_id?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string | null
          sub_tipo?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
          titulo: string
        }
        Update: {
          created_at?: string | null
          data_vencimento?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          funcionario_id?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string | null
          sub_tipo?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_sistema_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_sistema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alugueres: {
        Row: {
          checklist_devolucao_id: string | null
          checklist_entrega_id: string | null
          contrato_aluguer_id: string | null
          contrato_prestacao_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          devolucao_assinatura_empresa_url: string | null
          devolucao_assinatura_motorista_url: string | null
          devolucao_declaracao_aceite: boolean | null
          devolucao_dias_atraso: number | null
          devolucao_multa_atraso: number | null
          devolucao_multas_adicionais: Json | null
          devolucao_observacoes: string | null
          devolucao_pdf_url: string | null
          devolucao_penalizacoes_checklist: number | null
          devolucao_tipo: string | null
          devolucao_total_pagar: number | null
          devolucao_valor_dia: number | null
          id: string
          motorista_id: string | null
          observacoes: string | null
          proprietario_id: string | null
          rascunho_dados: Json
          rascunho_passo: number
          status: Database["public"]["Enums"]["status_aluguer"]
          tenant_id: string
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          checklist_devolucao_id?: string | null
          checklist_entrega_id?: string | null
          contrato_aluguer_id?: string | null
          contrato_prestacao_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          devolucao_assinatura_empresa_url?: string | null
          devolucao_assinatura_motorista_url?: string | null
          devolucao_declaracao_aceite?: boolean | null
          devolucao_dias_atraso?: number | null
          devolucao_multa_atraso?: number | null
          devolucao_multas_adicionais?: Json | null
          devolucao_observacoes?: string | null
          devolucao_pdf_url?: string | null
          devolucao_penalizacoes_checklist?: number | null
          devolucao_tipo?: string | null
          devolucao_total_pagar?: number | null
          devolucao_valor_dia?: number | null
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          proprietario_id?: string | null
          rascunho_dados?: Json
          rascunho_passo?: number
          status?: Database["public"]["Enums"]["status_aluguer"]
          tenant_id: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          checklist_devolucao_id?: string | null
          checklist_entrega_id?: string | null
          contrato_aluguer_id?: string | null
          contrato_prestacao_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          devolucao_assinatura_empresa_url?: string | null
          devolucao_assinatura_motorista_url?: string | null
          devolucao_declaracao_aceite?: boolean | null
          devolucao_dias_atraso?: number | null
          devolucao_multa_atraso?: number | null
          devolucao_multas_adicionais?: Json | null
          devolucao_observacoes?: string | null
          devolucao_pdf_url?: string | null
          devolucao_penalizacoes_checklist?: number | null
          devolucao_tipo?: string | null
          devolucao_total_pagar?: number | null
          devolucao_valor_dia?: number | null
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          proprietario_id?: string | null
          rascunho_dados?: Json
          rascunho_passo?: number
          status?: Database["public"]["Enums"]["status_aluguer"]
          tenant_id?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alugueres_checklist_devolucao_id_fkey"
            columns: ["checklist_devolucao_id"]
            isOneToOne: false
            referencedRelation: "checklist_devolucao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_checklist_entrega_id_fkey"
            columns: ["checklist_entrega_id"]
            isOneToOne: false
            referencedRelation: "checklist_entrega"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_contrato_aluguer_id_fkey"
            columns: ["contrato_aluguer_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_contrato_prestacao_id_fkey"
            columns: ["contrato_prestacao_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "proprietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueres_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_digitais: {
        Row: {
          assinado_em: string | null
          assinatura_url: string | null
          codigo_otp: string | null
          contrato_id: string
          created_at: string | null
          hash_documento: string | null
          id: string
          ip_address: string | null
          otp_expira_em: string | null
          placeholder: string | null
          signatario_email: string
          signatario_id: string | null
          signatario_nome: string
          signatario_tipo: string
          signatario_user_id: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          status: string
          tenant_id: string
          token_verificacao: string | null
          user_agent: string | null
          verificado: boolean | null
        }
        Insert: {
          assinado_em?: string | null
          assinatura_url?: string | null
          codigo_otp?: string | null
          contrato_id: string
          created_at?: string | null
          hash_documento?: string | null
          id?: string
          ip_address?: string | null
          otp_expira_em?: string | null
          placeholder?: string | null
          signatario_email: string
          signatario_id?: string | null
          signatario_nome: string
          signatario_tipo: string
          signatario_user_id?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          tenant_id: string
          token_verificacao?: string | null
          user_agent?: string | null
          verificado?: boolean | null
        }
        Update: {
          assinado_em?: string | null
          assinatura_url?: string | null
          codigo_otp?: string | null
          contrato_id?: string
          created_at?: string | null
          hash_documento?: string | null
          id?: string
          ip_address?: string | null
          otp_expira_em?: string | null
          placeholder?: string | null
          signatario_email?: string
          signatario_id?: string | null
          signatario_nome?: string
          signatario_tipo?: string
          signatario_user_id?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          tenant_id?: string
          token_verificacao?: string | null
          user_agent?: string | null
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_digitais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_digitais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assunto_responsaveis: {
        Row: {
          assunto_id: string
          created_at: string
          funcionario_id: string
          id: string
          ordem: number
        }
        Insert: {
          assunto_id: string
          created_at?: string
          funcionario_id: string
          id?: string
          ordem?: number
        }
        Update: {
          assunto_id?: string
          created_at?: string
          funcionario_id?: string
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "assunto_responsaveis_assunto_id_fkey"
            columns: ["assunto_id"]
            isOneToOne: false
            referencedRelation: "assuntos_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assunto_responsaveis_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      assuntos_chat: {
        Row: {
          ativo: boolean
          created_at: string
          funcionario_responsavel_id: string | null
          id: string
          modo_distribuicao: Database["public"]["Enums"]["modo_distribuicao_chat"]
          nome: string
          ordem: number
          rodizio_index: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcionario_responsavel_id?: string | null
          id?: string
          modo_distribuicao?: Database["public"]["Enums"]["modo_distribuicao_chat"]
          nome: string
          ordem?: number
          rodizio_index?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcionario_responsavel_id?: string | null
          id?: string
          modo_distribuicao?: Database["public"]["Enums"]["modo_distribuicao_chat"]
          nome?: string
          ordem?: number
          rodizio_index?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assuntos_chat_funcionario_responsavel_id_fkey"
            columns: ["funcionario_responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assuntos_chat_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_chat: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          destinatarios_ids: string[]
          dias_mes: number[]
          dias_semana: number[]
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          filtro_ativo: boolean | null
          frequencia: Database["public"]["Enums"]["frequencia_campanha"]
          hora_envio: string
          id: string
          nome: string
          publico_tipo: string
          somente_leitura: boolean
          tenant_id: string
          tipo_envio: string
          total_enviado: number
          ultima_execucao_at: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          destinatarios_ids?: string[]
          dias_mes?: number[]
          dias_semana?: number[]
          escopo?: Database["public"]["Enums"]["escopo_conversa"]
          filtro_ativo?: boolean | null
          frequencia?: Database["public"]["Enums"]["frequencia_campanha"]
          hora_envio?: string
          id?: string
          nome: string
          publico_tipo: string
          somente_leitura?: boolean
          tenant_id: string
          tipo_envio?: string
          total_enviado?: number
          ultima_execucao_at?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          destinatarios_ids?: string[]
          dias_mes?: number[]
          dias_semana?: number[]
          escopo?: Database["public"]["Enums"]["escopo_conversa"]
          filtro_ativo?: boolean | null
          frequencia?: Database["public"]["Enums"]["frequencia_campanha"]
          hora_envio?: string
          id?: string
          nome?: string
          publico_tipo?: string
          somente_leitura?: boolean
          tenant_id?: string
          tipo_envio?: string
          total_enviado?: number
          ultima_execucao_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campanhas_envios: {
        Row: {
          campanha_id: string
          conversa_id: string | null
          created_at: string
          data_envio: string
          destinatario_user_id: string
          id: string
          mensagem_id: string | null
          tenant_id: string
        }
        Insert: {
          campanha_id: string
          conversa_id?: string | null
          created_at?: string
          data_envio?: string
          destinatario_user_id: string
          id?: string
          mensagem_id?: string | null
          tenant_id: string
        }
        Update: {
          campanha_id?: string
          conversa_id?: string | null
          created_at?: string
          data_envio?: string
          destinatario_user_id?: string
          id?: string
          mensagem_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_personalizados: {
        Row: {
          created_at: string
          created_by: string | null
          data_vencimento: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          nome_campo: string
          tenant_id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          nome_campo: string
          tenant_id: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          nome_campo?: string
          tenant_id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campos_personalizados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_config: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          welcome_message: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      checklist_devolucao: {
        Row: {
          assinatura_devolvedor_url: string | null
          assinatura_recebedor_url: string | null
          contrato_com_danos_url: string | null
          contrato_entrega_normal_url: string | null
          contrato_id: string
          created_at: string | null
          danos_novos: Json | null
          fotos: Json | null
          id: string
          itens_faltantes: Json | null
          observacoes: string | null
          tenant_id: string
          valor_total_penalizacao: number | null
          videos: Json | null
        }
        Insert: {
          assinatura_devolvedor_url?: string | null
          assinatura_recebedor_url?: string | null
          contrato_com_danos_url?: string | null
          contrato_entrega_normal_url?: string | null
          contrato_id: string
          created_at?: string | null
          danos_novos?: Json | null
          fotos?: Json | null
          id?: string
          itens_faltantes?: Json | null
          observacoes?: string | null
          tenant_id: string
          valor_total_penalizacao?: number | null
          videos?: Json | null
        }
        Update: {
          assinatura_devolvedor_url?: string | null
          assinatura_recebedor_url?: string | null
          contrato_com_danos_url?: string | null
          contrato_entrega_normal_url?: string | null
          contrato_id?: string
          created_at?: string | null
          danos_novos?: Json | null
          fotos?: Json | null
          id?: string
          itens_faltantes?: Json | null
          observacoes?: string | null
          tenant_id?: string
          valor_total_penalizacao?: number | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_devolucao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_devolucao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_entrega: {
        Row: {
          assinatura_entregador_url: string | null
          assinatura_recebedor_url: string | null
          calotas_qty: number | null
          carregador_eletrico: boolean | null
          carregador_tomada: boolean | null
          carta_verde: boolean | null
          carta_verde_valid_until: string | null
          cartao_abastecimento: boolean | null
          colete_refletor: boolean | null
          compressor_ar: boolean | null
          contrato_id: string
          created_at: string | null
          danos_desenho: Json | null
          declaracao_amigavel: boolean | null
          documento_carro: boolean | null
          extintor: boolean | null
          extintor_valid_until: string | null
          fotos_exterior: Json | null
          fotos_interior: Json | null
          id: string
          inspecao_tvde: boolean | null
          inspecao_tvde_valid_until: string | null
          kit_primeiros_socorros: boolean | null
          limpeza_exterior: Database["public"]["Enums"]["nivel_limpeza"] | null
          limpeza_interior: Database["public"]["Enums"]["nivel_limpeza"] | null
          nivel_tanque: Database["public"]["Enums"]["nivel_tanque"] | null
          observacoes: string | null
          placa_proibido_fumar_1: boolean | null
          placa_proibido_fumar_2: boolean | null
          placa_tvde_1: boolean | null
          placa_tvde_2: boolean | null
          tampa_porta_malas: boolean | null
          tapetes_qty: number | null
          tenant_id: string
          triangulo: boolean | null
          video_exterior_url: string | null
          video_interior_url: string | null
        }
        Insert: {
          assinatura_entregador_url?: string | null
          assinatura_recebedor_url?: string | null
          calotas_qty?: number | null
          carregador_eletrico?: boolean | null
          carregador_tomada?: boolean | null
          carta_verde?: boolean | null
          carta_verde_valid_until?: string | null
          cartao_abastecimento?: boolean | null
          colete_refletor?: boolean | null
          compressor_ar?: boolean | null
          contrato_id: string
          created_at?: string | null
          danos_desenho?: Json | null
          declaracao_amigavel?: boolean | null
          documento_carro?: boolean | null
          extintor?: boolean | null
          extintor_valid_until?: string | null
          fotos_exterior?: Json | null
          fotos_interior?: Json | null
          id?: string
          inspecao_tvde?: boolean | null
          inspecao_tvde_valid_until?: string | null
          kit_primeiros_socorros?: boolean | null
          limpeza_exterior?: Database["public"]["Enums"]["nivel_limpeza"] | null
          limpeza_interior?: Database["public"]["Enums"]["nivel_limpeza"] | null
          nivel_tanque?: Database["public"]["Enums"]["nivel_tanque"] | null
          observacoes?: string | null
          placa_proibido_fumar_1?: boolean | null
          placa_proibido_fumar_2?: boolean | null
          placa_tvde_1?: boolean | null
          placa_tvde_2?: boolean | null
          tampa_porta_malas?: boolean | null
          tapetes_qty?: number | null
          tenant_id: string
          triangulo?: boolean | null
          video_exterior_url?: string | null
          video_interior_url?: string | null
        }
        Update: {
          assinatura_entregador_url?: string | null
          assinatura_recebedor_url?: string | null
          calotas_qty?: number | null
          carregador_eletrico?: boolean | null
          carregador_tomada?: boolean | null
          carta_verde?: boolean | null
          carta_verde_valid_until?: string | null
          cartao_abastecimento?: boolean | null
          colete_refletor?: boolean | null
          compressor_ar?: boolean | null
          contrato_id?: string
          created_at?: string | null
          danos_desenho?: Json | null
          declaracao_amigavel?: boolean | null
          documento_carro?: boolean | null
          extintor?: boolean | null
          extintor_valid_until?: string | null
          fotos_exterior?: Json | null
          fotos_interior?: Json | null
          id?: string
          inspecao_tvde?: boolean | null
          inspecao_tvde_valid_until?: string | null
          kit_primeiros_socorros?: boolean | null
          limpeza_exterior?: Database["public"]["Enums"]["nivel_limpeza"] | null
          limpeza_interior?: Database["public"]["Enums"]["nivel_limpeza"] | null
          nivel_tanque?: Database["public"]["Enums"]["nivel_tanque"] | null
          observacoes?: string | null
          placa_proibido_fumar_1?: boolean | null
          placa_proibido_fumar_2?: boolean | null
          placa_tvde_1?: boolean | null
          placa_tvde_2?: boolean | null
          tampa_porta_malas?: boolean | null
          tapetes_qty?: number | null
          tenant_id?: string
          triangulo?: boolean | null
          video_exterior_url?: string | null
          video_interior_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_entrega_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_entrega_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_records: {
        Row: {
          company_signature_url: string | null
          created_at: string | null
          data: Json
          driver_id: string | null
          driver_name: string | null
          driver_signature_url: string | null
          id: string
          linked_delivery_record_id: string | null
          model: string | null
          operation_date: string | null
          operation_time: string | null
          plate: string | null
          record_id: string
          security_metadata: Json | null
          tenant_id: string
          total_penalty: number | null
          type: string
          vehicle_id: string | null
        }
        Insert: {
          company_signature_url?: string | null
          created_at?: string | null
          data?: Json
          driver_id?: string | null
          driver_name?: string | null
          driver_signature_url?: string | null
          id?: string
          linked_delivery_record_id?: string | null
          model?: string | null
          operation_date?: string | null
          operation_time?: string | null
          plate?: string | null
          record_id: string
          security_metadata?: Json | null
          tenant_id: string
          total_penalty?: number | null
          type: string
          vehicle_id?: string | null
        }
        Update: {
          company_signature_url?: string | null
          created_at?: string | null
          data?: Json
          driver_id?: string | null
          driver_name?: string | null
          driver_signature_url?: string | null
          id?: string
          linked_delivery_record_id?: string | null
          model?: string | null
          operation_date?: string | null
          operation_time?: string | null
          plate?: string | null
          record_id?: string
          security_metadata?: Json | null
          tenant_id?: string
          total_penalty?: number | null
          type?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          assinatura_motorista_url: string | null
          assinatura_proprietario_url: string | null
          bloqueado: boolean | null
          campos_preenchidos: Json | null
          contrato_pai_id: string | null
          created_at: string | null
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          hash_documento: string | null
          id: string
          motorista_id: string | null
          pdf_gerado_url: string | null
          proprietario_id: string | null
          renovacao_count: number | null
          status: Database["public"]["Enums"]["status_contrato"] | null
          template_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string | null
          valor_caucao: number | null
          valor_diaria: number | null
          valor_semanal: number | null
          valor_total: number | null
          veiculo_id: string | null
          versao_atual: number | null
        }
        Insert: {
          assinatura_motorista_url?: string | null
          assinatura_proprietario_url?: string | null
          bloqueado?: boolean | null
          campos_preenchidos?: Json | null
          contrato_pai_id?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          hash_documento?: string | null
          id?: string
          motorista_id?: string | null
          pdf_gerado_url?: string | null
          proprietario_id?: string | null
          renovacao_count?: number | null
          status?: Database["public"]["Enums"]["status_contrato"] | null
          template_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string | null
          valor_caucao?: number | null
          valor_diaria?: number | null
          valor_semanal?: number | null
          valor_total?: number | null
          veiculo_id?: string | null
          versao_atual?: number | null
        }
        Update: {
          assinatura_motorista_url?: string | null
          assinatura_proprietario_url?: string | null
          bloqueado?: boolean | null
          campos_preenchidos?: Json | null
          contrato_pai_id?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          hash_documento?: string | null
          id?: string
          motorista_id?: string | null
          pdf_gerado_url?: string | null
          proprietario_id?: string | null
          renovacao_count?: number | null
          status?: Database["public"]["Enums"]["status_contrato"] | null
          template_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string | null
          valor_caucao?: number | null
          valor_diaria?: number | null
          valor_semanal?: number | null
          valor_total?: number | null
          veiculo_id?: string | null
          versao_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_contrato_pai_id_fkey"
            columns: ["contrato_pai_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "proprietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_ativos_veiculos: {
        Row: {
          ativo: boolean | null
          contrato_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          motorista_id: string
          tenant_id: string
          veiculo_id: string
        }
        Insert: {
          ativo?: boolean | null
          contrato_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motorista_id: string
          tenant_id: string
          veiculo_id: string
        }
        Update: {
          ativo?: boolean | null
          contrato_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motorista_id?: string
          tenant_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_ativos_veiculos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_ativos_veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_ativos_veiculos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_ativos_veiculos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        Insert: {
          arquivada?: boolean
          assumido_em?: string | null
          assumido_por?: string | null
          assunto_id?: string | null
          created_at?: string
          destinatario_user_id?: string | null
          escopo?: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em?: string | null
          funcionario_id?: string | null
          id?: string
          iniciador_user_id: string
          marcada_nao_lida_por?: string | null
          somente_leitura?: boolean
          status?: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo?: string | null
          ultima_mensagem_at?: string
        }
        Update: {
          arquivada?: boolean
          assumido_em?: string | null
          assumido_por?: string | null
          assunto_id?: string | null
          created_at?: string
          destinatario_user_id?: string | null
          escopo?: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em?: string | null
          funcionario_id?: string | null
          id?: string
          iniciador_user_id?: string
          marcada_nao_lida_por?: string | null
          somente_leitura?: boolean
          status?: Database["public"]["Enums"]["status_conversa"]
          tenant_id?: string
          titulo?: string | null
          ultima_mensagem_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_assumido_por_fkey"
            columns: ["assumido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_assunto_id_fkey"
            columns: ["assunto_id"]
            isOneToOne: false
            referencedRelation: "assuntos_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_arquivados: {
        Row: {
          arquivo_url: string
          data_validade: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          tenant_id: string
          tipo_documento: string
          uploaded_at: string | null
        }
        Insert: {
          arquivo_url: string
          data_validade?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          tenant_id: string
          tipo_documento: string
          uploaded_at?: string | null
        }
        Update: {
          arquivo_url?: string
          data_validade?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          tenant_id?: string
          tipo_documento?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_arquivados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean | null
          capital_social: number | null
          certificado_tvde: string | null
          certificado_tvde_valid_until: string | null
          created_at: string | null
          email: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          iban: string | null
          id: string
          logo_url: string | null
          nif: string
          nome_empresa: string
          nome_gerente: string | null
          status_cadastro: Database["public"]["Enums"]["status_cadastro"] | null
          telemovel: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capital_social?: number | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          email?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nif: string
          nome_empresa: string
          nome_gerente?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capital_social?: number | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          email?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nif?: string
          nome_empresa?: string
          nome_gerente?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionario_ausencias: {
        Row: {
          bloquear_acesso: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id: string
          observacoes: string | null
          substituicao_ativa: boolean
          substituto_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
          updated_at: string
        }
        Insert: {
          bloquear_acesso?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id?: string
          observacoes?: string | null
          substituicao_ativa?: boolean
          substituto_id?: string | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_ausencia"]
          updated_at?: string
        }
        Update: {
          bloquear_acesso?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          substituicao_ativa?: boolean
          substituto_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_ausencia"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_ausencias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_ausencias_substituto_id_fkey"
            columns: ["substituto_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean | null
          contato_urgencia_nome: string | null
          contato_urgencia_telemovel: string | null
          created_at: string | null
          email: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          foto_perfil_url: string | null
          fotos_galeria: Json | null
          iban: string | null
          id: string
          nif: string | null
          nome: string
          sobrenome: string | null
          substituicao_ativa: boolean
          substituicao_fim: string | null
          substituicao_inicio: string | null
          substituto_id: string | null
          telemovel: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_funcionario"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          contato_urgencia_nome?: string | null
          contato_urgencia_telemovel?: string | null
          created_at?: string | null
          email?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome: string
          sobrenome?: string | null
          substituicao_ativa?: boolean
          substituicao_fim?: string | null
          substituicao_inicio?: string | null
          substituto_id?: string | null
          telemovel?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_funcionario"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          contato_urgencia_nome?: string | null
          contato_urgencia_telemovel?: string | null
          created_at?: string | null
          email?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome?: string
          sobrenome?: string | null
          substituicao_ativa?: boolean
          substituicao_fim?: string | null
          substituicao_inicio?: string | null
          substituto_id?: string | null
          telemovel?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_funcionario"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_substituto_id_fkey"
            columns: ["substituto_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes_sistema: {
        Row: {
          created_at: string | null
          data_referencia: string
          dias_antes: number | null
          entidade_id: string
          entidade_tipo: string
          id: string
          mensagem_enviada: boolean | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data_referencia: string
          dias_antes?: number | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          mensagem_enviada?: boolean | null
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          data_referencia?: string
          dias_antes?: number | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          mensagem_enviada?: boolean | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_sistema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_transmissao: {
        Row: {
          created_at: string
          created_by: string | null
          destinatarios_ids: string[]
          id: string
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destinatarios_ids?: string[]
          id?: string
          nome: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destinatarios_ids?: string[]
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      logs_auditoria_contratos: {
        Row: {
          acao: string
          contrato_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          ip_address: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          contrato_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          contrato_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_contratos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_auditoria_contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          created_at: string
          data_servico: string
          documentos: Json | null
          id: string
          km: number | null
          km_proxima_revisao: number | null
          observacoes: string | null
          proprietario_id: string | null
          tenant_id: string
          tipo_servico: string
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_servico: string
          documentos?: Json | null
          id?: string
          km?: number | null
          km_proxima_revisao?: number | null
          observacoes?: string | null
          proprietario_id?: string | null
          tenant_id: string
          tipo_servico: string
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_servico?: string
          documentos?: Json | null
          id?: string
          km?: number | null
          km_proxima_revisao?: number | null
          observacoes?: string | null
          proprietario_id?: string | null
          tenant_id?: string
          tipo_servico?: string
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "proprietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes_veiculo: {
        Row: {
          created_at: string | null
          data_manutencao: string
          fatura_url: string | null
          id: string
          km_atual: number | null
          servicos_realizados: string | null
          tenant_id: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          data_manutencao: string
          fatura_url?: string | null
          id?: string
          km_atual?: number | null
          servicos_realizados?: string | null
          tenant_id: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          data_manutencao?: string
          fatura_url?: string | null
          id?: string
          km_atual?: number | null
          servicos_realizados?: string | null
          tenant_id?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_veiculo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_automatizadas: {
        Row: {
          agendamento: string | null
          arquivo_midia_url: string | null
          conteudo: string
          created_at: string | null
          data_envio: string | null
          destinatario_individual_id: string | null
          enviada: boolean | null
          enviar_imediato: boolean | null
          id: string
          tenant_id: string
          tipo_destinatario: string | null
          tipo_midia: string | null
          titulo: string
        }
        Insert: {
          agendamento?: string | null
          arquivo_midia_url?: string | null
          conteudo: string
          created_at?: string | null
          data_envio?: string | null
          destinatario_individual_id?: string | null
          enviada?: boolean | null
          enviar_imediato?: boolean | null
          id?: string
          tenant_id: string
          tipo_destinatario?: string | null
          tipo_midia?: string | null
          titulo: string
        }
        Update: {
          agendamento?: string | null
          arquivo_midia_url?: string | null
          conteudo?: string
          created_at?: string | null
          data_envio?: string | null
          destinatario_individual_id?: string | null
          enviada?: boolean | null
          enviar_imediato?: boolean | null
          id?: string
          tenant_id?: string
          tipo_destinatario?: string | null
          tipo_midia?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_automatizadas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_chat: {
        Row: {
          anexo_mime: string | null
          anexo_nome: string | null
          anexo_tamanho: number | null
          anexo_url: string | null
          autor_user_id: string
          conteudo: string | null
          conteudo_original: string | null
          conversa_id: string
          created_at: string
          editada_em: string | null
          excluida: boolean
          excluida_em: string | null
          id: string
          lida: boolean
          lida_em: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          anexo_mime?: string | null
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_url?: string | null
          autor_user_id: string
          conteudo?: string | null
          conteudo_original?: string | null
          conversa_id: string
          created_at?: string
          editada_em?: string | null
          excluida?: boolean
          excluida_em?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          tenant_id: string
          tipo?: string
        }
        Update: {
          anexo_mime?: string | null
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_url?: string | null
          autor_user_id?: string
          conteudo?: string | null
          conteudo_original?: string | null
          conversa_id?: string
          created_at?: string
          editada_em?: string | null
          excluida?: boolean
          excluida_em?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_chat_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_chat_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          bolt_email: string | null
          bolt_telemovel: string | null
          carta_numero: string | null
          carta_valid_until: string | null
          cartao_frota: string | null
          certificado_tvde: string | null
          certificado_tvde_valid_until: string | null
          contato_urgencia_nome: string | null
          contato_urgencia_telemovel: string | null
          created_at: string | null
          data_nascimento: string | null
          documento_valid_until: string | null
          documentos_upload: Json | null
          email: string | null
          endereco: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado_civil: Database["public"]["Enums"]["estado_civil"] | null
          filhos: number | null
          foto_perfil_url: string | null
          fotos_galeria: Json | null
          iban: string | null
          id: string
          nif: string | null
          nome_completo: string
          numero_documento: string | null
          registo_criminal_valid_until: string | null
          status_cadastro: Database["public"]["Enums"]["status_cadastro"] | null
          telemovel: string | null
          tenant_id: string
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          uber_email: string | null
          uber_telemovel: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          bolt_email?: string | null
          bolt_telemovel?: string | null
          carta_numero?: string | null
          carta_valid_until?: string | null
          cartao_frota?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          contato_urgencia_nome?: string | null
          contato_urgencia_telemovel?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          documento_valid_until?: string | null
          documentos_upload?: Json | null
          email?: string | null
          endereco?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome_completo: string
          numero_documento?: string | null
          registo_criminal_valid_until?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          uber_email?: string | null
          uber_telemovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          bolt_email?: string | null
          bolt_telemovel?: string | null
          carta_numero?: string | null
          carta_valid_until?: string | null
          cartao_frota?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          contato_urgencia_nome?: string | null
          contato_urgencia_telemovel?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          documento_valid_until?: string | null
          documentos_upload?: Json | null
          email?: string | null
          endereco?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome_completo?: string
          numero_documento?: string | null
          registo_criminal_valid_until?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id?: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          uber_email?: string | null
          uber_telemovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      multas: {
        Row: {
          created_at: string | null
          data_multa: string
          descricao: string | null
          documentos: Json | null
          id: string
          localizacao: string | null
          motorista_id: string | null
          numero_notificacao: string | null
          status: Database["public"]["Enums"]["status_multa"] | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_multa"] | null
          updated_at: string | null
          valor: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          data_multa: string
          descricao?: string | null
          documentos?: Json | null
          id?: string
          localizacao?: string | null
          motorista_id?: string | null
          numero_notificacao?: string | null
          status?: Database["public"]["Enums"]["status_multa"] | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_multa"] | null
          updated_at?: string | null
          valor: number
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          data_multa?: string
          descricao?: string | null
          documentos?: Json | null
          id?: string
          localizacao?: string | null
          motorista_id?: string | null
          numero_notificacao?: string | null
          status?: Database["public"]["Enums"]["status_multa"] | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_multa"] | null
          updated_at?: string | null
          valor?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_cadastro: {
        Row: {
          created_at: string | null
          dados_adicionais: Json | null
          id: string
          status: string
          tenant_id: string | null
          tipo_cadastro: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dados_adicionais?: Json | null
          id?: string
          status?: string
          tenant_id?: string | null
          tipo_cadastro: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dados_adicionais?: Json | null
          id?: string
          status?: string
          tenant_id?: string | null
          tipo_cadastro?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_cadastro_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_template: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_template_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_funcionario: {
        Row: {
          created_at: string
          funcionario_id: string
          id: string
          menu_key: string
          nivel: Database["public"]["Enums"]["nivel_permissao"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          id?: string
          menu_key: string
          nivel?: Database["public"]["Enums"]["nivel_permissao"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          id?: string
          menu_key?: string
          nivel?: Database["public"]["Enums"]["nivel_permissao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_funcionario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aprovado: boolean | null
          aprovado_por: string | null
          ativo: boolean | null
          created_at: string | null
          data_aprovacao: string | null
          email: string
          email_verificado: boolean | null
          foto_perfil_url: string | null
          id: string
          nome_completo: string | null
          pre_cadastro_token: string | null
          status_cadastro: Database["public"]["Enums"]["status_cadastro"] | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aprovado?: boolean | null
          aprovado_por?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          email: string
          email_verificado?: boolean | null
          foto_perfil_url?: string | null
          id?: string
          nome_completo?: string | null
          pre_cadastro_token?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aprovado?: boolean | null
          aprovado_por?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          email?: string
          email_verificado?: boolean | null
          foto_perfil_url?: string | null
          id?: string
          nome_completo?: string | null
          pre_cadastro_token?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proprietarios: {
        Row: {
          ativo: boolean | null
          capital_social: number | null
          cartao_frota: string | null
          certidao_permanente: string | null
          certidao_valid_until: string | null
          certificado_tvde: string | null
          certificado_tvde_valid_until: string | null
          created_at: string | null
          data_nascimento: string | null
          documento_valid_until: string | null
          email: string | null
          endereco: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado_civil: Database["public"]["Enums"]["estado_civil"] | null
          filhos: number | null
          foto_perfil_url: string | null
          fotos_galeria: Json | null
          iban: string | null
          id: string
          nif: string | null
          nome_completo: string | null
          nome_empresa: string | null
          nome_gerente: string | null
          numero_documento: string | null
          status_cadastro: Database["public"]["Enums"]["status_cadastro"] | null
          telemovel: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_proprietario"]
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          capital_social?: number | null
          cartao_frota?: string | null
          certidao_permanente?: string | null
          certidao_valid_until?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          documento_valid_until?: string | null
          email?: string | null
          endereco?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          nome_gerente?: string | null
          numero_documento?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_proprietario"]
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          capital_social?: number | null
          cartao_frota?: string | null
          certidao_permanente?: string | null
          certidao_valid_until?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          documento_valid_until?: string | null
          email?: string | null
          endereco?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          foto_perfil_url?: string | null
          fotos_galeria?: Json | null
          iban?: string | null
          id?: string
          nif?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          nome_gerente?: string | null
          numero_documento?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          telemovel?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_proprietario"]
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proprietarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recibos_vencimento: {
        Row: {
          ano: number
          arquivo_nome: string | null
          arquivo_url: string
          created_at: string
          funcionario_id: string
          id: string
          mes: number
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          ano: number
          arquivo_nome?: string | null
          arquivo_url: string
          created_at?: string
          funcionario_id: string
          id?: string
          mes: number
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ano?: number
          arquivo_nome?: string | null
          arquivo_url?: string
          created_at?: string
          funcionario_id?: string
          id?: string
          mes?: number
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recibos_vencimento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      recibos_verdes: {
        Row: {
          ano: number | null
          arquivo_mime: string | null
          arquivo_nome: string | null
          arquivo_path: string | null
          arquivo_url: string
          avisos_validacao: Json
          created_at: string
          created_by: string | null
          dados_extraidos: Json
          data_emissao: string | null
          id: string
          mes: number | null
          motorista_id: string
          nif_adquirente: string | null
          nif_emitente: string | null
          nome_adquirente: string | null
          nome_emitente: string | null
          numero_documento: string | null
          observacoes_empresa: string | null
          retencao_irs: number | null
          status: string
          tenant_id: string
          updated_at: string
          validado_em: string | null
          validado_por: string | null
          valor_base: number | null
          valor_iva: number | null
          valor_total: number | null
        }
        Insert: {
          ano?: number | null
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url: string
          avisos_validacao?: Json
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json
          data_emissao?: string | null
          id?: string
          mes?: number | null
          motorista_id: string
          nif_adquirente?: string | null
          nif_emitente?: string | null
          nome_adquirente?: string | null
          nome_emitente?: string | null
          numero_documento?: string | null
          observacoes_empresa?: string | null
          retencao_irs?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
          valor_base?: number | null
          valor_iva?: number | null
          valor_total?: number | null
        }
        Update: {
          ano?: number | null
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url?: string
          avisos_validacao?: Json
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json
          data_emissao?: string | null
          id?: string
          mes?: number | null
          motorista_id?: string
          nif_adquirente?: string | null
          nif_emitente?: string | null
          nome_adquirente?: string | null
          nome_emitente?: string | null
          numero_documento?: string | null
          observacoes_empresa?: string | null
          retencao_irs?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
          valor_base?: number | null
          valor_iva?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recibos_verdes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_verdes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      registos_criminais: {
        Row: {
          arquivo_mime: string | null
          arquivo_nome: string | null
          arquivo_path: string | null
          arquivo_url: string
          codigo_consulta: string | null
          created_at: string
          created_by: string | null
          dados_extraidos: Json
          data_emissao: string | null
          data_validade: string | null
          id: string
          motorista_id: string
          nome_titular: string | null
          observacoes_empresa: string | null
          status: string
          tenant_id: string
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url: string
          codigo_consulta?: string | null
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          motorista_id: string
          nome_titular?: string | null
          observacoes_empresa?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url?: string
          codigo_consulta?: string | null
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          motorista_id?: string
          nome_titular?: string | null
          observacoes_empresa?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registos_criminais_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registos_criminais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      registos_expediente: {
        Row: {
          corrigido: boolean
          corrigido_em: string | null
          corrigido_por: string | null
          created_at: string
          data_hora: string
          data_local: string
          id: string
          ip_address: string | null
          motorista_id: string
          observacoes_correcao: string | null
          origem: string
          tenant_id: string
          tipo: string
          user_agent: string | null
        }
        Insert: {
          corrigido?: boolean
          corrigido_em?: string | null
          corrigido_por?: string | null
          created_at?: string
          data_hora?: string
          data_local?: string
          id?: string
          ip_address?: string | null
          motorista_id: string
          observacoes_correcao?: string | null
          origem?: string
          tenant_id: string
          tipo: string
          user_agent?: string | null
        }
        Update: {
          corrigido?: boolean
          corrigido_em?: string | null
          corrigido_por?: string | null
          created_at?: string
          data_hora?: string
          data_local?: string
          id?: string
          ip_address?: string | null
          motorista_id?: string
          observacoes_correcao?: string | null
          origem?: string
          tenant_id?: string
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registos_expediente_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registos_expediente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_admins: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string | null
          papel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome?: string | null
          papel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          papel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saas_config_faturacao: {
        Row: {
          created_at: string
          emitente_email: string | null
          emitente_endereco: string | null
          emitente_nif: string | null
          emitente_nome: string
          emitente_telefone: string | null
          iban: string | null
          id: string
          logo_url: string | null
          prazo_pagamento_dias: number
          prefixo_numero: string
          proximo_numero: number
          rodape: string | null
          taxa_iva: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emitente_email?: string | null
          emitente_endereco?: string | null
          emitente_nif?: string | null
          emitente_nome?: string
          emitente_telefone?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          prazo_pagamento_dias?: number
          prefixo_numero?: string
          proximo_numero?: number
          rodape?: string | null
          taxa_iva?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emitente_email?: string | null
          emitente_endereco?: string | null
          emitente_nif?: string | null
          emitente_nome?: string
          emitente_telefone?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          prazo_pagamento_dias?: number
          prefixo_numero?: string
          proximo_numero?: number
          rodape?: string | null
          taxa_iva?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_faturas: {
        Row: {
          cliente_email: string | null
          cliente_endereco: string | null
          cliente_nif: string | null
          cliente_nome: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_vencimento: string
          descricao: string | null
          estado: string
          id: string
          moeda: string
          notas: string | null
          numero: string
          pdf_url: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          provedor: string | null
          referencia_externa: string | null
          subscricao_id: string | null
          subtotal: number
          taxa_iva: number
          tenant_id: string
          total: number
          updated_at: string
          url_fatura_provedor: string | null
          valor_iva: number
        }
        Insert: {
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_nif?: string | null
          cliente_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_vencimento?: string
          descricao?: string | null
          estado?: string
          id?: string
          moeda?: string
          notas?: string | null
          numero: string
          pdf_url?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          provedor?: string | null
          referencia_externa?: string | null
          subscricao_id?: string | null
          subtotal?: number
          taxa_iva?: number
          tenant_id: string
          total?: number
          updated_at?: string
          url_fatura_provedor?: string | null
          valor_iva?: number
        }
        Update: {
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_nif?: string | null
          cliente_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_vencimento?: string
          descricao?: string | null
          estado?: string
          id?: string
          moeda?: string
          notas?: string | null
          numero?: string
          pdf_url?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          provedor?: string | null
          referencia_externa?: string | null
          subscricao_id?: string | null
          subtotal?: number
          taxa_iva?: number
          tenant_id?: string
          total?: number
          updated_at?: string
          url_fatura_provedor?: string | null
          valor_iva?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_faturas_subscricao_id_fkey"
            columns: ["subscricao_id"]
            isOneToOne: false
            referencedRelation: "saas_subscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_faturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string
          estado: string
          fatura_id: string | null
          id: string
          metodo: string
          notas: string | null
          provedor: string | null
          provedor_pagamento_id: string | null
          referencia: string | null
          registado_por: string | null
          tenant_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string
          estado?: string
          fatura_id?: string | null
          id?: string
          metodo?: string
          notas?: string | null
          provedor?: string | null
          provedor_pagamento_id?: string | null
          referencia?: string | null
          registado_por?: string | null
          tenant_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          estado?: string
          fatura_id?: string | null
          id?: string
          metodo?: string
          notas?: string | null
          provedor?: string | null
          provedor_pagamento_id?: string | null
          referencia?: string | null
          registado_por?: string | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_pagamentos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "saas_faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          funcionalidades: Json
          id: string
          limite_motoristas: number | null
          limite_veiculos: number | null
          nome: string
          ordem: number
          preco_anual: number | null
          preco_mensal: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          funcionalidades?: Json
          id?: string
          limite_motoristas?: number | null
          limite_veiculos?: number | null
          nome: string
          ordem?: number
          preco_anual?: number | null
          preco_mensal?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          funcionalidades?: Json
          id?: string
          limite_motoristas?: number | null
          limite_veiculos?: number | null
          nome?: string
          ordem?: number
          preco_anual?: number | null
          preco_mensal?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_subscricoes: {
        Row: {
          ciclo: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          desconto_percent: number
          dia_vencimento: number
          estado: string
          id: string
          metodo_cobranca: string
          notas: string | null
          plano_id: string | null
          preco: number
          provedor_externo: string | null
          proxima_renovacao: string | null
          referencia_externa: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ciclo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          desconto_percent?: number
          dia_vencimento?: number
          estado?: string
          id?: string
          metodo_cobranca?: string
          notas?: string | null
          plano_id?: string | null
          preco?: number
          provedor_externo?: string | null
          proxima_renovacao?: string | null
          referencia_externa?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ciclo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          desconto_percent?: number
          dia_vencimento?: number
          estado?: string
          id?: string
          metodo_cobranca?: string
          notas?: string | null
          plano_id?: string | null
          preco?: number
          provedor_externo?: string | null
          proxima_renovacao?: string | null
          referencia_externa?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscricoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "saas_planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscricoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sinistros: {
        Row: {
          apolice: string | null
          boletim_ocorrencia_url: string | null
          created_at: string | null
          data_peritagem: string | null
          data_sinistro: string
          descricao: string | null
          documentos: Json | null
          fotos: Json | null
          id: string
          itens_danificados: Json | null
          motorista_id: string | null
          nome_testemunha: string | null
          numero_processo: string | null
          peritagem_realizada: boolean | null
          seguradora: string | null
          status: Database["public"]["Enums"]["status_sinistro"] | null
          telemovel_testemunha: string | null
          tenant_id: string
          teve_testemunha: boolean | null
          updated_at: string | null
          veiculo_id: string
        }
        Insert: {
          apolice?: string | null
          boletim_ocorrencia_url?: string | null
          created_at?: string | null
          data_peritagem?: string | null
          data_sinistro: string
          descricao?: string | null
          documentos?: Json | null
          fotos?: Json | null
          id?: string
          itens_danificados?: Json | null
          motorista_id?: string | null
          nome_testemunha?: string | null
          numero_processo?: string | null
          peritagem_realizada?: boolean | null
          seguradora?: string | null
          status?: Database["public"]["Enums"]["status_sinistro"] | null
          telemovel_testemunha?: string | null
          tenant_id: string
          teve_testemunha?: boolean | null
          updated_at?: string | null
          veiculo_id: string
        }
        Update: {
          apolice?: string | null
          boletim_ocorrencia_url?: string | null
          created_at?: string | null
          data_peritagem?: string | null
          data_sinistro?: string
          descricao?: string | null
          documentos?: Json | null
          fotos?: Json | null
          id?: string
          itens_danificados?: Json | null
          motorista_id?: string | null
          nome_testemunha?: string | null
          numero_processo?: string | null
          peritagem_realizada?: boolean | null
          seguradora?: string | null
          status?: Database["public"]["Enums"]["status_sinistro"] | null
          telemovel_testemunha?: string | null
          tenant_id?: string
          teve_testemunha?: boolean | null
          updated_at?: string | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinistros_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinistros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinistros_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_funcionarios: {
        Row: {
          concluida: boolean | null
          created_at: string | null
          data_conclusao: string | null
          descricao: string | null
          funcionario_id: string
          hora_execucao: string | null
          id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_tarefa"]
          tipo_especial: string | null
          titulo: string
        }
        Insert: {
          concluida?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          funcionario_id: string
          hora_execucao?: string | null
          id?: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_tarefa"]
          tipo_especial?: string | null
          titulo: string
        }
        Update: {
          concluida?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          funcionario_id?: string
          hora_execucao?: string | null
          id?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_tarefa"]
          tipo_especial?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_funcionarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_contrato: {
        Row: {
          arquivo_url: string | null
          campos_detectados: Json | null
          campos_mapeados: Json | null
          conteudo_original: string | null
          created_at: string | null
          id: string
          nome: string
          perfil_id: string | null
          tenant_id: string
          tipo_arquivo: string | null
          updated_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          campos_detectados?: Json | null
          campos_mapeados?: Json | null
          conteudo_original?: string | null
          created_at?: string | null
          id?: string
          nome: string
          perfil_id?: string | null
          tenant_id: string
          tipo_arquivo?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          campos_detectados?: Json | null
          campos_mapeados?: Json | null
          conteudo_original?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          tenant_id?: string
          tipo_arquivo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_contrato_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_contrato_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean | null
          capital_social: number | null
          certidao_permanente: string | null
          certidao_valid_until: string | null
          certificado_tvde: string | null
          certificado_tvde_valid_until: string | null
          created_at: string | null
          data_nascimento_gerente: string | null
          email: string | null
          endereco: string | null
          estado_civil: Database["public"]["Enums"]["estado_civil"] | null
          filhos: number | null
          iban: string | null
          id: string
          logo_url: string | null
          nif: string
          nome_empresa: string
          nome_gerente: string | null
          telemovel: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capital_social?: number | null
          certidao_permanente?: string | null
          certidao_valid_until?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          data_nascimento_gerente?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nif: string
          nome_empresa: string
          nome_gerente?: string | null
          telemovel?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capital_social?: number | null
          certidao_permanente?: string | null
          certidao_valid_until?: string | null
          certificado_tvde?: string | null
          certificado_tvde_valid_until?: string | null
          created_at?: string | null
          data_nascimento_gerente?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: Database["public"]["Enums"]["estado_civil"] | null
          filhos?: number | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nif?: string
          nome_empresa?: string
          nome_gerente?: string | null
          telemovel?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ativo: boolean | null
          bolt_valid_until: string | null
          carta_verde: string | null
          carta_verde_valid_until: string | null
          chassi: string | null
          cilindrada: number | null
          combustivel: string | null
          cor: string | null
          created_at: string | null
          data_matricula: string | null
          extintor_valid_until: string | null
          foto_principal_url: string | null
          fotos_galeria: Json | null
          id: string
          inspecao_tvde: string | null
          inspecao_tvde_valid_until: string | null
          lugares: number | null
          marca: string | null
          matricula: string
          modelo: string | null
          portas: number | null
          potencia: number | null
          proprietario_id: string | null
          status_cadastro: Database["public"]["Enums"]["status_cadastro"] | null
          tenant_id: string
          uber_valid_until: string | null
          updated_at: string | null
          valor_aluguel: number | null
          valor_caucao: number | null
          via_verde: string | null
        }
        Insert: {
          ativo?: boolean | null
          bolt_valid_until?: string | null
          carta_verde?: string | null
          carta_verde_valid_until?: string | null
          chassi?: string | null
          cilindrada?: number | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          data_matricula?: string | null
          extintor_valid_until?: string | null
          foto_principal_url?: string | null
          fotos_galeria?: Json | null
          id?: string
          inspecao_tvde?: string | null
          inspecao_tvde_valid_until?: string | null
          lugares?: number | null
          marca?: string | null
          matricula: string
          modelo?: string | null
          portas?: number | null
          potencia?: number | null
          proprietario_id?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          tenant_id: string
          uber_valid_until?: string | null
          updated_at?: string | null
          valor_aluguel?: number | null
          valor_caucao?: number | null
          via_verde?: string | null
        }
        Update: {
          ativo?: boolean | null
          bolt_valid_until?: string | null
          carta_verde?: string | null
          carta_verde_valid_until?: string | null
          chassi?: string | null
          cilindrada?: number | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          data_matricula?: string | null
          extintor_valid_until?: string | null
          foto_principal_url?: string | null
          fotos_galeria?: Json | null
          id?: string
          inspecao_tvde?: string | null
          inspecao_tvde_valid_until?: string | null
          lugares?: number | null
          marca?: string | null
          matricula?: string
          modelo?: string | null
          portas?: number | null
          potencia?: number | null
          proprietario_id?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["status_cadastro"]
            | null
          tenant_id?: string
          uber_valid_until?: string | null
          updated_at?: string | null
          valor_aluguel?: number | null
          valor_caucao?: number | null
          via_verde?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "proprietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      versoes_contrato: {
        Row: {
          contrato_id: string
          created_at: string | null
          criado_por: string | null
          dados_campos: Json | null
          id: string
          observacoes: string | null
          tenant_id: string
          versao_numero: number
        }
        Insert: {
          contrato_id: string
          created_at?: string | null
          criado_por?: string | null
          dados_campos?: Json | null
          id?: string
          observacoes?: string | null
          tenant_id: string
          versao_numero?: number
        }
        Update: {
          contrato_id?: string
          created_at?: string | null
          criado_por?: string | null
          dados_campos?: Json | null
          id?: string
          observacoes?: string | null
          tenant_id?: string
          versao_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "versoes_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "versoes_contrato_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assinatura_pertence_ao_utilizador: {
        Args: {
          _signatario_email: string
          _signatario_id: string
          _signatario_tipo: string
          _signatario_user_id: string
        }
        Returns: boolean
      }
      assumir_conversa: {
        Args: { _conversa_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      atribuir_motorista_veiculo: {
        Args: {
          _motorista_id: string
          _substituir_motorista_id?: string
          _veiculo_id: string
        }
        Returns: {
          ativo: boolean | null
          contrato_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          motorista_id: string
          tenant_id: string
          veiculo_id: string
        }
        SetofOptions: {
          from: "*"
          to: "contratos_ativos_veiculos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      editar_mensagem: {
        Args: { _mensagem_id: string; _novo_conteudo: string }
        Returns: {
          anexo_mime: string | null
          anexo_nome: string | null
          anexo_tamanho: number | null
          anexo_url: string | null
          autor_user_id: string
          conteudo: string | null
          conteudo_original: string | null
          conversa_id: string
          created_at: string
          editada_em: string | null
          excluida: boolean
          excluida_em: string | null
          id: string
          lida: boolean
          lida_em: string | null
          tenant_id: string
          tipo: string
        }
        SetofOptions: {
          from: "*"
          to: "mensagens_chat"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      estatisticas_expediente: {
        Args: { _data_fim: string; _data_inicio: string; _tenant_id: string }
        Returns: {
          dias_online: number
          em_servico: boolean
          motorista_id: string
          nome_completo: string
          segundos_trabalhados: number
          ultimo_registo: string
        }[]
      }
      excluir_mensagem: {
        Args: { _mensagem_id: string }
        Returns: {
          anexo_mime: string | null
          anexo_nome: string | null
          anexo_tamanho: number | null
          anexo_url: string | null
          autor_user_id: string
          conteudo: string | null
          conteudo_original: string | null
          conversa_id: string
          created_at: string
          editada_em: string | null
          excluida: boolean
          excluida_em: string | null
          id: string
          lida: boolean
          lida_em: string | null
          tenant_id: string
          tipo: string
        }
        SetofOptions: {
          from: "*"
          to: "mensagens_chat"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      executar_campanha: { Args: { _campanha_id: string }; Returns: number }
      finalizar_aluguer: {
        Args: { _aluguer_id: string }
        Returns: {
          checklist_devolucao_id: string | null
          checklist_entrega_id: string | null
          contrato_aluguer_id: string | null
          contrato_prestacao_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          devolucao_assinatura_empresa_url: string | null
          devolucao_assinatura_motorista_url: string | null
          devolucao_declaracao_aceite: boolean | null
          devolucao_dias_atraso: number | null
          devolucao_multa_atraso: number | null
          devolucao_multas_adicionais: Json | null
          devolucao_observacoes: string | null
          devolucao_pdf_url: string | null
          devolucao_penalizacoes_checklist: number | null
          devolucao_tipo: string | null
          devolucao_total_pagar: number | null
          devolucao_valor_dia: number | null
          id: string
          motorista_id: string | null
          observacoes: string | null
          proprietario_id: string | null
          rascunho_dados: Json
          rascunho_passo: number
          status: Database["public"]["Enums"]["status_aluguer"]
          tenant_id: string
          updated_at: string
          veiculo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "alugueres"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalizar_conversa: {
        Args: { _conversa_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalizar_devolucao_aluguer: {
        Args: {
          _aluguer_id: string
          _assinatura_empresa_url: string
          _assinatura_motorista_url: string
          _checklist_devolucao_id: string
          _contrato_prestacao_id: string
          _devolucao_tipo: string
          _dias_atraso: number
          _multa_atraso: number
          _multas_adicionais: Json
          _observacoes: string
          _pdf_url: string
          _penalizacoes_checklist: number
          _total_pagar: number
          _valor_dia: number
        }
        Returns: {
          checklist_devolucao_id: string | null
          checklist_entrega_id: string | null
          contrato_aluguer_id: string | null
          contrato_prestacao_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          devolucao_assinatura_empresa_url: string | null
          devolucao_assinatura_motorista_url: string | null
          devolucao_declaracao_aceite: boolean | null
          devolucao_dias_atraso: number | null
          devolucao_multa_atraso: number | null
          devolucao_multas_adicionais: Json | null
          devolucao_observacoes: string | null
          devolucao_pdf_url: string | null
          devolucao_penalizacoes_checklist: number | null
          devolucao_tipo: string | null
          devolucao_total_pagar: number | null
          devolucao_valor_dia: number | null
          id: string
          motorista_id: string | null
          observacoes: string | null
          proprietario_id: string | null
          rascunho_dados: Json
          rascunho_passo: number
          status: Database["public"]["Enums"]["status_aluguer"]
          tenant_id: string
          updated_at: string
          veiculo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "alugueres"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      garantir_assunto_comunicacoes: {
        Args: { _tenant_id: string }
        Returns: string
      }
      garantir_perfil_template: {
        Args: { _nome: string; _ordem?: number; _tenant_id: string }
        Returns: string
      }
      gerar_alertas_peritagem: {
        Args: { _sinistro_id: string }
        Returns: undefined
      }
      gerar_alertas_registo_criminal: { Args: never; Returns: undefined }
      get_funcionario_efetivo: {
        Args: { _funcionario_id: string }
        Returns: string
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: {
          _menu_key: string
          _nivel_minimo: Database["public"]["Enums"]["nivel_permissao"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iniciar_conversa_interna: {
        Args: { _destinatario_user_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      iniciar_conversa_para_usuario: {
        Args: { _assunto_id: string; _destinatario_user_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_external_profile: { Args: { _user_id: string }; Returns: boolean }
      is_saas_admin: { Args: { _user_id: string }; Returns: boolean }
      is_saas_owner: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { _user_id: string }; Returns: boolean }
      marcar_conversa_lida: {
        Args: { _conversa_id: string }
        Returns: undefined
      }
      marcar_conversa_nao_lida: {
        Args: { _conversa_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      motorista_em_servico: {
        Args: { _motorista_id: string }
        Returns: {
          desde: string
          em_servico: boolean
          tipo_ultimo: string
        }[]
      }
      motorista_pertence_ao_utilizador: {
        Args: { _motorista_id: string }
        Returns: boolean
      }
      processar_campanhas_agendadas: { Args: never; Returns: number }
      reabrir_conversa: {
        Args: { _conversa_id: string }
        Returns: {
          arquivada: boolean
          assumido_em: string | null
          assumido_por: string | null
          assunto_id: string | null
          created_at: string
          destinatario_user_id: string | null
          escopo: Database["public"]["Enums"]["escopo_conversa"]
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciador_user_id: string
          marcada_nao_lida_por: string | null
          somente_leitura: boolean
          status: Database["public"]["Enums"]["status_conversa"]
          tenant_id: string
          titulo: string | null
          ultima_mensagem_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refrescar_lembretes_peritagem_recorrentes: {
        Args: never
        Returns: undefined
      }
      registar_expediente_por_nif: {
        Args: {
          _nif: string
          _origem?: string
          _tenant_id?: string
          _user_agent?: string
        }
        Returns: {
          corrigido: boolean
          corrigido_em: string | null
          corrigido_por: string | null
          created_at: string
          data_hora: string
          data_local: string
          id: string
          ip_address: string | null
          motorista_id: string
          observacoes_correcao: string | null
          origem: string
          tenant_id: string
          tipo: string
          user_agent: string | null
        }
        SetofOptions: {
          from: "*"
          to: "registos_expediente"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      saas_admin_papel: { Args: { _user_id: string }; Returns: string }
      saas_metricas: {
        Args: never
        Returns: {
          arr: number
          clientes_ativos: number
          clientes_total: number
          em_divida: number
          faturas_vencidas: number
          mrr: number
          novos_mes: number
          receita_mes: number
          subscricoes_canceladas: number
          subscricoes_suspensas: number
          subscricoes_trial: number
        }[]
      }
      saas_proximo_numero_fatura: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "admin_empresa" | "motorista" | "proprietario"
      escopo_conversa: "externo" | "interno"
      estado_civil:
        | "solteiro"
        | "casado"
        | "divorciado"
        | "viuvo"
        | "uniao_facto"
      frequencia_campanha:
        | "unica"
        | "diario"
        | "semanal"
        | "mensal"
        | "personalizado"
      modo_distribuicao_chat: "todos" | "rodizio"
      nivel_limpeza: "profissional" | "normal" | "sujo"
      nivel_permissao: "nenhum" | "visualizar" | "configurar"
      nivel_tanque: "cheio" | "tres_quartos" | "metade" | "um_quarto" | "vazio"
      status_aluguer: "rascunho" | "ativo" | "finalizado" | "cancelado"
      status_cadastro: "pendente" | "ativo" | "incompleto" | "inativo"
      status_contrato:
        | "rascunho"
        | "enviado"
        | "assinado"
        | "cancelado"
        | "renovado"
        | "expirado"
        | "encerrado"
      status_conversa: "aberto" | "em_atendimento" | "finalizado"
      status_multa: "pending" | "paid" | "contested"
      status_sinistro: "open" | "in_progress" | "closed"
      tipo_alerta:
        | "documento_vencendo"
        | "tarefa_pendente"
        | "aniversario"
        | "system"
        | "peritagem"
      tipo_ausencia: "ferias" | "doenca" | "folga" | "outro"
      tipo_contrato:
        | "prestacao_servico"
        | "aluguer"
        | "checklist_entrega"
        | "checklist_devolucao"
      tipo_documento: "passaporte" | "titulo_residencia" | "cartao_cidadao"
      tipo_funcionario:
        | "administrativo_financas"
        | "gestor_frota"
        | "gerente_geral"
      tipo_multa: "speeding" | "parking" | "red_light" | "other"
      tipo_proprietario: "empresa" | "pessoa_fisica"
      tipo_tarefa: "diaria" | "semanal" | "mensal" | "unica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin_empresa", "motorista", "proprietario"],
      escopo_conversa: ["externo", "interno"],
      estado_civil: [
        "solteiro",
        "casado",
        "divorciado",
        "viuvo",
        "uniao_facto",
      ],
      frequencia_campanha: [
        "unica",
        "diario",
        "semanal",
        "mensal",
        "personalizado",
      ],
      modo_distribuicao_chat: ["todos", "rodizio"],
      nivel_limpeza: ["profissional", "normal", "sujo"],
      nivel_permissao: ["nenhum", "visualizar", "configurar"],
      nivel_tanque: ["cheio", "tres_quartos", "metade", "um_quarto", "vazio"],
      status_aluguer: ["rascunho", "ativo", "finalizado", "cancelado"],
      status_cadastro: ["pendente", "ativo", "incompleto", "inativo"],
      status_contrato: [
        "rascunho",
        "enviado",
        "assinado",
        "cancelado",
        "renovado",
        "expirado",
        "encerrado",
      ],
      status_conversa: ["aberto", "em_atendimento", "finalizado"],
      status_multa: ["pending", "paid", "contested"],
      status_sinistro: ["open", "in_progress", "closed"],
      tipo_alerta: [
        "documento_vencendo",
        "tarefa_pendente",
        "aniversario",
        "system",
        "peritagem",
      ],
      tipo_ausencia: ["ferias", "doenca", "folga", "outro"],
      tipo_contrato: [
        "prestacao_servico",
        "aluguer",
        "checklist_entrega",
        "checklist_devolucao",
      ],
      tipo_documento: ["passaporte", "titulo_residencia", "cartao_cidadao"],
      tipo_funcionario: [
        "administrativo_financas",
        "gestor_frota",
        "gerente_geral",
      ],
      tipo_multa: ["speeding", "parking", "red_light", "other"],
      tipo_proprietario: ["empresa", "pessoa_fisica"],
      tipo_tarefa: ["diaria", "semanal", "mensal", "unica"],
    },
  },
} as const
