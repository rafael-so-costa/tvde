import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type Alerta = Tables<"alertas_sistema">;

interface AlertaSummary {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  data_vencimento: string | null;
  lido: boolean;
  created_at: string | null;
}

// Fetch alerts based on user role
export function useAlertas() {
  const { roles, user } = useAuth();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["alertas", user?.id, tenant?.id],
    queryFn: async (): Promise<AlertaSummary[]> => {
      if (!tenant?.id) return [];

      const isSuperAdmin = roles.includes("super_admin");
      const isAdminEmpresa = roles.includes("admin_empresa");
      const isMotorista = roles.includes("motorista");
      const isProprietario = roles.includes("proprietario");

      // Super admin and admin_empresa can see all alerts for their tenant
      if (isSuperAdmin || isAdminEmpresa) {
        const { data, error } = await supabase
          .from("alertas_sistema")
          .select("id, tipo, titulo, mensagem, data_vencimento, lido, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data || [];
      }

      // Motoristas only see alerts assigned to them or general alerts
      if (isMotorista) {
        const { data: motoristaData } = await supabase
          .from("motoristas")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        if (!motoristaData) return [];

        // Get document expiry alerts for this driver
        const alerts: AlertaSummary[] = [];

        // Check driver documents
        const { data: motorista } = await supabase
          .from("motoristas")
          .select("*")
          .eq("id", motoristaData.id)
          .single();

        if (motorista) {
          const today = new Date();
          const checkDocs = [
            { field: "documento_valid_until", name: "Documento de Identificação" },
            { field: "carta_valid_until", name: "Carta de Condução" },
            { field: "registo_criminal_valid_until", name: "Registo Criminal" },
          ];

          checkDocs.forEach(doc => {
            const date = (motorista as any)[doc.field];
            if (date) {
              const expiryDate = new Date(date);
              const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 30) {
                alerts.push({
                  id: `doc-${doc.field}-${motorista.id}`,
                  tipo: "documento_vencendo",
                  titulo: `${doc.name} a expirar`,
                  mensagem: diffDays <= 0 
                    ? `Expirou há ${Math.abs(diffDays)} dias` 
                    : `Expira em ${diffDays} dias`,
                  data_vencimento: date,
                  lido: false,
                  created_at: new Date().toISOString(),
                });
              }
            }
          });
        }

        // Also fetch system alerts for this user
        const { data: systemAlerts } = await supabase
          .from("alertas_sistema")
          .select("id, tipo, titulo, mensagem, data_vencimento, lido, created_at")
          .eq("tenant_id", tenant.id)
          .or(`funcionario_id.is.null,tipo.eq.system`)
          .order("created_at", { ascending: false })
          .limit(20);

        return [...alerts, ...(systemAlerts || [])];
      }

      // Proprietarios only see alerts for their vehicles
      if (isProprietario) {
        const { data: proprietarioData } = await supabase
          .from("proprietarios")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        if (!proprietarioData) return [];

        const alerts: AlertaSummary[] = [];

        // Check vehicle documents for this owner
        const { data: veiculos } = await supabase
          .from("veiculos")
          .select("*")
          .eq("proprietario_id", proprietarioData.id);

        if (veiculos) {
          const today = new Date();
          
          veiculos.forEach(veiculo => {
            const checkDocs = [
              { field: "carta_verde_valid_until", name: "Carta Verde" },
              { field: "inspecao_tvde_valid_until", name: "Inspeção TVDE" },
              { field: "uber_valid_until", name: "Registo Uber" },
              { field: "bolt_valid_until", name: "Registo Bolt" },
            ];

            checkDocs.forEach(doc => {
              const date = (veiculo as any)[doc.field];
              if (date) {
                const expiryDate = new Date(date);
                const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 30) {
                  alerts.push({
                    id: `veh-${doc.field}-${veiculo.id}`,
                    tipo: "documento_vencendo",
                    titulo: `${doc.name} - ${veiculo.matricula}`,
                    mensagem: diffDays <= 0 
                      ? `Expirou há ${Math.abs(diffDays)} dias` 
                      : `Expira em ${diffDays} dias`,
                    data_vencimento: date,
                    lido: false,
                    created_at: new Date().toISOString(),
                  });
                }
              }
            });
          });
        }

        // Check owner documents
        const { data: proprietario } = await supabase
          .from("proprietarios")
          .select("*")
          .eq("id", proprietarioData.id)
          .single();

        if (proprietario) {
          const today = new Date();
          const checkDocs = [
            { field: "documento_valid_until", name: "Documento de Identificação" },
            { field: "certidao_valid_until", name: "Certidão Permanente" },
            { field: "certificado_tvde_valid_until", name: "Certificado TVDE" },
          ];

          checkDocs.forEach(doc => {
            const date = (proprietario as any)[doc.field];
            if (date) {
              const expiryDate = new Date(date);
              const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 30) {
                alerts.push({
                  id: `prop-${doc.field}-${proprietario.id}`,
                  tipo: "documento_vencendo",
                  titulo: `${doc.name} a expirar`,
                  mensagem: diffDays <= 0 
                    ? `Expirou há ${Math.abs(diffDays)} dias` 
                    : `Expira em ${diffDays} dias`,
                  data_vencimento: date,
                  lido: false,
                  created_at: new Date().toISOString(),
                });
              }
            }
          });
        }

        return alerts;
      }

      return [];
    },
    enabled: !!tenant?.id && !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Fetch all document alerts for admin_empresa (comprehensive view)
export function useAlertasAdmin() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["alertas-admin", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { motoristas: [], proprietarios: [], veiculos: [], contratos: [] };

      const today = new Date();
      const alerts = {
        motoristas: [] as any[],
        proprietarios: [] as any[],
        veiculos: [] as any[],
        contratos: [] as any[],
      };

      // Check motoristas documents
      const { data: motoristas } = await supabase
        .from("motoristas")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);

      if (motoristas) {
        const docFields = [
          { field: "documento_valid_until", name: "Documento de Identificação" },
          { field: "carta_valid_until", name: "Carta de Condução" },
          { field: "registo_criminal_valid_until", name: "Registo Criminal" },
        ];

        motoristas.forEach(m => {
          docFields.forEach(doc => {
            const date = (m as any)[doc.field];
            if (date) {
              const diffDays = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 30) {
                alerts.motoristas.push({
                  id: `m-${doc.field}-${m.id}`,
                  entityId: m.id,
                  entityName: m.nome_completo,
                  documentName: doc.name,
                  expiryDate: date,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          });
        });
      }

      // Check archived documents for motoristas
      const { data: archivedMotoristasDocs } = await supabase
        .from("documentos_arquivados")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("entidade_tipo", "motorista")
        .not("data_validade", "is", null);

      if (archivedMotoristasDocs && motoristas) {
        archivedMotoristasDocs.forEach(doc => {
          if (doc.data_validade) {
            const diffDays = Math.ceil((new Date(doc.data_validade).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              const motorista = motoristas.find(m => m.id === doc.entidade_id);
              if (motorista) {
                alerts.motoristas.push({
                  id: `m-archived-${doc.id}`,
                  entityId: doc.entidade_id,
                  entityName: motorista.nome_completo,
                  documentName: `${doc.tipo_documento} (Arquivado)`,
                  expiryDate: doc.data_validade,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          }
        });
      }

      // Check proprietarios documents
      const { data: proprietarios } = await supabase
        .from("proprietarios")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);

      if (proprietarios) {
        const docFields = [
          { field: "documento_valid_until", name: "Documento de Identificação" },
          { field: "certidao_valid_until", name: "Certidão Permanente" },
          { field: "certificado_tvde_valid_until", name: "Certificado TVDE" },
        ];

        proprietarios.forEach(p => {
          docFields.forEach(doc => {
            const date = (p as any)[doc.field];
            if (date) {
              const diffDays = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 30) {
                alerts.proprietarios.push({
                  id: `p-${doc.field}-${p.id}`,
                  entityId: p.id,
                  entityName: p.tipo === "empresa" ? p.nome_empresa : p.nome_completo,
                  documentName: doc.name,
                  expiryDate: date,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          });
        });
      }

      // Check archived documents for proprietarios
      const { data: archivedProprietariosDocs } = await supabase
        .from("documentos_arquivados")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("entidade_tipo", "proprietario")
        .not("data_validade", "is", null);

      if (archivedProprietariosDocs && proprietarios) {
        archivedProprietariosDocs.forEach(doc => {
          if (doc.data_validade) {
            const diffDays = Math.ceil((new Date(doc.data_validade).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              const proprietario = proprietarios.find(p => p.id === doc.entidade_id);
              if (proprietario) {
                alerts.proprietarios.push({
                  id: `p-archived-${doc.id}`,
                  entityId: doc.entidade_id,
                  entityName: proprietario.tipo === "empresa" ? proprietario.nome_empresa : proprietario.nome_completo,
                  documentName: `${doc.tipo_documento} (Arquivado)`,
                  expiryDate: doc.data_validade,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          }
        });
      }

      // Check veiculos documents
      const { data: veiculos } = await supabase
        .from("veiculos")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);

      if (veiculos) {
        const docFields = [
          { field: "carta_verde_valid_until", name: "Carta Verde" },
          { field: "inspecao_tvde_valid_until", name: "Inspeção TVDE" },
          { field: "uber_valid_until", name: "Registo Uber" },
          { field: "bolt_valid_until", name: "Registo Bolt" },
          { field: "extintor_valid_until", name: "Extintor" },
        ];

        veiculos.forEach(v => {
          docFields.forEach(doc => {
            const date = (v as any)[doc.field];
            if (date) {
              const diffDays = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 30) {
                alerts.veiculos.push({
                  id: `v-${doc.field}-${v.id}`,
                  entityId: v.id,
                  entityName: v.matricula,
                  entitySubtitle: `${v.marca} ${v.modelo}`,
                  documentName: doc.name,
                  expiryDate: date,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          });
        });
      }

      // Check archived documents for veiculos
      const { data: archivedVeiculosDocs } = await supabase
        .from("documentos_arquivados")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("entidade_tipo", "veiculo")
        .not("data_validade", "is", null);

      if (archivedVeiculosDocs && veiculos) {
        archivedVeiculosDocs.forEach(doc => {
          if (doc.data_validade) {
            const diffDays = Math.ceil((new Date(doc.data_validade).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              const veiculo = veiculos.find(v => v.id === doc.entidade_id);
              if (veiculo) {
                alerts.veiculos.push({
                  id: `v-archived-${doc.id}`,
                  entityId: doc.entidade_id,
                  entityName: veiculo.matricula,
                  entitySubtitle: `${veiculo.marca} ${veiculo.modelo}`,
                  documentName: `${doc.tipo_documento} (Arquivado)`,
                  expiryDate: doc.data_validade,
                  daysRemaining: diffDays,
                  priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
                });
              }
            }
          }
        });
      }

      // Check contratos expiring
      const { data: contratos } = await supabase
        .from("contratos")
        .select(`
          *,
          motorista:motoristas(nome_completo),
          veiculo:veiculos(matricula, marca, modelo)
        `)
        .eq("tenant_id", tenant.id)
        .in("status", ["assinado", "enviado"]);

      if (contratos) {
        contratos.forEach(c => {
          if (c.data_fim) {
            const diffDays = Math.ceil((new Date(c.data_fim).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              alerts.contratos.push({
                id: `c-${c.id}`,
                entityId: c.id,
                entityName: `Contrato ${c.id.slice(0, 8)}`,
                motorista: (c.motorista as any)?.nome_completo,
                veiculo: (c.veiculo as any)?.matricula,
                expiryDate: c.data_fim,
                daysRemaining: diffDays,
                priority: diffDays <= 0 ? "critical" : diffDays <= 7 ? "high" : diffDays <= 15 ? "medium" : "low",
              });
            }
          }
        });
      }

      return alerts;
    },
    enabled: !!tenant?.id,
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("alertas_sistema")
        .update({ lido: true })
        .eq("id", alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-unificados"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Alertas unificados para a página /alerts (dados reais)
// ---------------------------------------------------------------------------

export type AlertaUnificadoTipo =
  | "document"
  | "contract"
  | "maintenance"
  | "peritagem"
  | "sinistro";

export type AlertaPrioridade = "critical" | "high" | "medium" | "low";

export interface AlertaUnificado {
  id: string;
  origem: "sistema" | "derivado";
  tipo: AlertaUnificadoTipo;
  categoria: string;
  titulo: string;
  descricao: string;
  entidadeTipo: "vehicle" | "driver" | "owner" | "contract" | "claim";
  entidadeNome: string;
  dataReferencia: string | null;
  diasRestantes: number | null;
  prioridade: AlertaPrioridade;
  lido: boolean;
  link: string | null;
}

function diffDias(data: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(data).getTime() - hoje.getTime()) / 86400000);
}

function prioridadePorDias(dias: number): AlertaPrioridade {
  if (dias <= 0) return "critical";
  if (dias <= 7) return "high";
  if (dias <= 15) return "medium";
  return "low";
}

/** Junta os alertas guardados em alertas_sistema (incluindo peritagens) com os
 *  vencimentos calculados a partir dos registos e os sinistros em aberto. */
export function useAlertasUnificados() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["alertas-unificados", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async (): Promise<AlertaUnificado[]> => {
      if (!tenant?.id) return [];
      const lista: AlertaUnificado[] = [];

      // 1) Alertas guardados (lembretes de peritagem, tarefas, sistema)
      const { data: sistema, error: erroSistema } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (erroSistema) throw erroSistema;

      for (const a of sistema || []) {
        const ehPeritagem = a.tipo === "peritagem" || a.entidade_tipo === "sinistro";
        const ehContrato = a.entidade_tipo === "contrato";
        const ehPrazo = ehPeritagem || a.tipo === "documento_vencendo" || a.tipo === "tarefa_pendente";
        const dias = ehPrazo && a.data_vencimento ? diffDias(a.data_vencimento) : null;

        let tipo: AlertaUnificadoTipo = "document";
        let categoria = "Notificação";
        let entidadeTipo: AlertaUnificado["entidadeTipo"] = "driver";
        let link: string | null = null;

        if (ehPeritagem) {
          tipo = "peritagem";
          categoria = "Peritagem";
          entidadeTipo = "claim";
          link = `/claims${a.entidade_id ? `?view=${a.entidade_id}` : ""}`;
        } else if (ehContrato) {
          tipo = "contract";
          categoria = "Contrato";
          entidadeTipo = "contract";
          link = `/contracts${a.entidade_id ? `?view=${a.entidade_id}` : ""}`;
        } else if (a.tipo === "tarefa_pendente") {
          tipo = "maintenance";
          categoria = "Tarefa";
        } else if (a.tipo === "documento_vencendo") {
          categoria = "Documento";
        }

        lista.push({
          id: a.id,
          origem: "sistema",
          tipo,
          categoria,
          titulo: a.titulo,
          descricao: a.mensagem || "",
          entidadeTipo,
          entidadeNome: categoria,
          dataReferencia: ehPrazo ? a.data_vencimento : a.created_at,
          diasRestantes: dias,
          prioridade: dias !== null ? prioridadePorDias(dias) : a.lido ? "low" : "medium",
          lido: !!a.lido,
          link,
        });
      }

      // 2) Sinistros em aberto (peritagem por realizar)
      const { data: sinistros } = await supabase
        .from("sinistros")
        .select("id, data_sinistro, data_peritagem, peritagem_realizada, status, veiculo:veiculos(matricula), motorista:motoristas(nome_completo)")
        .eq("tenant_id", tenant.id)
        .in("status", ["open", "in_progress"]);

      for (const s of sinistros || []) {
        const matricula = (s.veiculo as { matricula?: string } | null)?.matricula || "Veículo";
        const motorista = (s.motorista as { nome_completo?: string } | null)?.nome_completo;
        const dias = s.data_peritagem ? diffDias(s.data_peritagem) : null;
        const semData = !s.data_peritagem;
        lista.push({
          id: `sinistro-${s.id}`,
          origem: "derivado",
          tipo: "sinistro",
          categoria: s.peritagem_realizada ? "Sinistro" : "Peritagem",
          titulo: s.peritagem_realizada
            ? `Sinistro em aberto — ${matricula}`
            : semData
              ? `Peritagem sem data marcada — ${matricula}`
              : `Peritagem marcada — ${matricula}`,
          descricao: [
            motorista ? `Motorista: ${motorista}` : null,
            `Ocorrência a ${new Date(s.data_sinistro).toLocaleDateString("pt-PT")}`,
          ].filter(Boolean).join(" · "),
          entidadeTipo: "claim",
          entidadeNome: matricula,
          dataReferencia: s.data_peritagem || s.data_sinistro,
          diasRestantes: dias,
          prioridade: s.peritagem_realizada
            ? "low"
            : semData
              ? "high"
              : prioridadePorDias(dias ?? 99),
          lido: false,
          link: `/claims?view=${s.id}`,
        });
      }

      // 3) Documentos a vencer — motoristas, proprietários, veículos
      const [motoristas, proprietarios, veiculos, contratos] = await Promise.all([
        supabase.from("motoristas").select("*").eq("tenant_id", tenant.id).eq("ativo", true),
        supabase.from("proprietarios").select("*").eq("tenant_id", tenant.id).eq("ativo", true),
        supabase.from("veiculos").select("*").eq("tenant_id", tenant.id).eq("ativo", true),
        supabase
          .from("contratos")
          .select("id, data_fim, status, motorista:motoristas(nome_completo), veiculo:veiculos(matricula)")
          .eq("tenant_id", tenant.id)
          .in("status", ["assinado", "enviado"]),
      ]);

      const adicionarDocs = (
        registos: Record<string, unknown>[] | null,
        campos: { field: string; name: string }[],
        nome: (r: Record<string, unknown>) => string,
        entidadeTipo: AlertaUnificado["entidadeTipo"],
        link: string,
        prefixo: string,
      ) => {
        for (const r of registos || []) {
          for (const campo of campos) {
            const data = r[campo.field] as string | null;
            if (!data) continue;
            const dias = diffDias(data);
            if (dias > 30) continue;
            lista.push({
              id: `${prefixo}-${campo.field}-${r.id}`,
              origem: "derivado",
              tipo: "document",
              categoria: campo.name,
              titulo: `${campo.name} — ${nome(r)}`,
              descricao: dias < 0 ? `Expirou há ${Math.abs(dias)} dias` : `Expira em ${dias} dias`,
              entidadeTipo,
              entidadeNome: nome(r),
              dataReferencia: data,
              diasRestantes: dias,
              prioridade: prioridadePorDias(dias),
              lido: false,
              link,
            });
          }
        }
      };

      adicionarDocs(
        motoristas.data as Record<string, unknown>[] | null,
        [
          { field: "documento_valid_until", name: "Documento de Identificação" },
          { field: "carta_valid_until", name: "Carta de Condução" },
          { field: "registo_criminal_valid_until", name: "Registo Criminal" },
          { field: "certificado_tvde_valid_until", name: "Certificado TVDE" },
        ],
        (r) => String(r.nome_completo || "Motorista"),
        "driver",
        "/drivers",
        "m",
      );

      adicionarDocs(
        proprietarios.data as Record<string, unknown>[] | null,
        [
          { field: "documento_valid_until", name: "Documento de Identificação" },
          { field: "certidao_valid_until", name: "Certidão Permanente" },
          { field: "certificado_tvde_valid_until", name: "Certificado TVDE" },
        ],
        (r) => String(r.tipo === "empresa" ? r.nome_empresa : r.nome_completo || "Proprietário"),
        "owner",
        "/owners",
        "p",
      );

      adicionarDocs(
        veiculos.data as Record<string, unknown>[] | null,
        [
          { field: "carta_verde_valid_until", name: "Carta Verde" },
          { field: "inspecao_tvde_valid_until", name: "Inspeção TVDE" },
          { field: "uber_valid_until", name: "Registo Uber" },
          { field: "bolt_valid_until", name: "Registo Bolt" },
          { field: "extintor_valid_until", name: "Extintor" },
        ],
        (r) => String(r.matricula || "Veículo"),
        "vehicle",
        "/vehicles",
        "v",
      );

      // 4) Contratos a terminar
      for (const c of contratos.data || []) {
        if (!c.data_fim) continue;
        const dias = diffDias(c.data_fim);
        if (dias > 30) continue;
        const motorista = (c.motorista as { nome_completo?: string } | null)?.nome_completo;
        const matricula = (c.veiculo as { matricula?: string } | null)?.matricula;
        lista.push({
          id: `contrato-${c.id}`,
          origem: "derivado",
          tipo: "contract",
          categoria: "Contrato",
          titulo: `Contrato a terminar${motorista ? ` — ${motorista}` : ""}`,
          descricao: [matricula, dias < 0 ? `Terminou há ${Math.abs(dias)} dias` : `Termina em ${dias} dias`]
            .filter(Boolean)
            .join(" · "),
          entidadeTipo: "contract",
          entidadeNome: motorista || matricula || "Contrato",
          dataReferencia: c.data_fim,
          diasRestantes: dias,
          prioridade: prioridadePorDias(dias),
          lido: false,
          link: `/contracts?view=${c.id}`,
        });
      }

      return lista;
    },
    refetchInterval: 120000,
  });
}
