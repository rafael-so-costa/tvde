import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type TipoRegisto = "entrada" | "saida";

export interface RegistoExpediente {
  id: string;
  tenant_id: string;
  motorista_id: string;
  data_hora: string;
  tipo: TipoRegisto;
  data_local: string;
  origem: string;
  corrigido: boolean;
  corrigido_por: string | null;
  corrigido_em: string | null;
  observacoes_correcao: string | null;
  created_at: string;
}

export interface EstatisticaExpediente {
  motorista_id: string;
  nome_completo: string;
  dias_online: number;
  segundos_trabalhados: number;
  ultimo_registo: string | null;
  em_servico: boolean;
}

/** Motorista ligado ao utilizador autenticado (inclui NIF para o registo). */
export function useMotoristaExpediente() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["motorista-expediente", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, tenant_id, nome_completo, nif")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/** Registos de um motorista, dos últimos N dias. */
export function useRegistosExpediente(motoristaId: string | null | undefined, dias = 45) {
  return useQuery({
    queryKey: ["registos-expediente", motoristaId, dias],
    queryFn: async () => {
      if (!motoristaId) return [] as RegistoExpediente[];
      const desde = new Date();
      desde.setDate(desde.getDate() - dias);
      const { data, error } = await supabase
        .from("registos_expediente")
        .select("*")
        .eq("motorista_id", motoristaId)
        .gte("data_local", desde.toISOString().slice(0, 10))
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RegistoExpediente[];
    },
    enabled: !!motoristaId,
  });
}

/** Registar entrada/saída pelo NIF (usado na app e na página pública). */
export function useRegistarExpediente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nif: string; tenantId?: string | null; origem?: "app" | "publico" }) => {
      const { data, error } = await supabase.rpc("registar_expediente_por_nif", {
        _nif: input.nif,
        _tenant_id: input.tenantId ?? undefined,
        _origem: input.origem ?? "publico",
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      if (error) throw error;
      return data as unknown as RegistoExpediente;
    },
    onSuccess: (registo) => {
      queryClient.invalidateQueries({ queryKey: ["registos-expediente"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-expediente"] });
      toast.success(
        registo.tipo === "entrada" ? "Início de expediente registado" : "Fim de expediente registado",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Corrigir a hora de um registo. */
export function useCorrigirRegistoExpediente() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; dataHora: string; observacoes?: string | null }) => {
      const { error } = await supabase
        .from("registos_expediente")
        .update({
          data_hora: input.dataHora,
          corrigido: true,
          corrigido_por: user?.id ?? null,
          corrigido_em: new Date().toISOString(),
          observacoes_correcao: input.observacoes ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registos-expediente"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-expediente"] });
      toast.success("Hora corrigida");
    },
    onError: (err: Error) => toast.error("Não foi possível corrigir: " + err.message),
  });
}

/** Estatísticas do tenant num intervalo de datas. */
export function useEstatisticasExpediente(dataInicio: string, dataFim: string) {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["estatisticas-expediente", tenant?.id, dataInicio, dataFim],
    queryFn: async () => {
      if (!tenant?.id) return [] as EstatisticaExpediente[];
      const { data, error } = await supabase.rpc("estatisticas_expediente", {
        _tenant_id: tenant.id,
        _data_inicio: dataInicio,
        _data_fim: dataFim,
      });
      if (error) throw error;
      return (data || []) as unknown as EstatisticaExpediente[];
    },
    enabled: !!tenant?.id,
  });
}

/** Registos do tenant no intervalo, para gráficos e detalhe. */
export function useRegistosExpedienteTenant(dataInicio: string, dataFim: string) {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["registos-expediente", "tenant", tenant?.id, dataInicio, dataFim],
    queryFn: async () => {
      if (!tenant?.id) return [] as RegistoExpediente[];
      const { data, error } = await supabase
        .from("registos_expediente")
        .select("*")
        .eq("tenant_id", tenant.id)
        .gte("data_local", dataInicio)
        .lte("data_local", dataFim)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RegistoExpediente[];
    },
    enabled: !!tenant?.id,
  });
}

/** Formata segundos em "12h 30m". */
export function formatarDuracao(segundos: number) {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${String(minutos).padStart(2, "0")}m`;
}

/** Soma o tempo trabalhado a partir de pares entrada/saída do mesmo dia. */
export function somarSegundosPorDia(registos: RegistoExpediente[]) {
  const porDia = new Map<string, RegistoExpediente[]>();
  registos.forEach((r) => {
    const lista = porDia.get(r.data_local) || [];
    lista.push(r);
    porDia.set(r.data_local, lista);
  });

  const resultado = new Map<string, number>();
  porDia.forEach((lista, dia) => {
    const ordenada = [...lista].sort(
      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
    );
    let segundos = 0;
    for (let i = 0; i < ordenada.length - 1; i++) {
      if (ordenada[i].tipo === "entrada" && ordenada[i + 1].tipo === "saida") {
        segundos +=
          (new Date(ordenada[i + 1].data_hora).getTime() - new Date(ordenada[i].data_hora).getTime()) /
          1000;
        i++;
      }
    }
    resultado.set(dia, segundos);
  });
  return resultado;
}

/** Determina se o motorista está em serviço com base nos registos de hoje. */
export function estadoAtual(registos: RegistoExpediente[]) {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
  const doDia = registos
    .filter((r) => r.data_local === hoje)
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  const ultimo = doDia[0];
  return {
    emServico: ultimo?.tipo === "entrada",
    desde: ultimo?.tipo === "entrada" ? ultimo.data_hora : null,
    registosHoje: doDia.length,
  };
}
