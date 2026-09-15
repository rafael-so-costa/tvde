import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ModoDistribuicao = "todos" | "rodizio";
export type StatusConversa = "aberto" | "em_atendimento" | "finalizado";

export interface Assunto {
  id: string;
  nome: string;
  ordem: number;
  funcionario_responsavel_id: string | null;
  ativo: boolean;
  tenant_id: string;
  modo_distribuicao: ModoDistribuicao;
  rodizio_index: number;
}

export interface AssuntoResponsavel {
  id: string;
  assunto_id: string;
  funcionario_id: string;
  ordem: number;
}

export type EscopoConversa = "externo" | "interno";

export interface Conversa {
  id: string;
  tenant_id: string;
  assunto_id: string | null;
  iniciador_user_id: string;
  destinatario_user_id: string | null;
  funcionario_id: string | null;
  assumido_por: string | null;
  assumido_em: string | null;
  finalizado_em: string | null;
  status: StatusConversa;
  titulo: string | null;
  escopo: EscopoConversa;
  arquivada: boolean;
  somente_leitura?: boolean;
  ultima_mensagem_at: string;
  created_at: string;
  assunto?: { nome: string } | null;
}

export type MensagemTipo = "texto" | "imagem" | "arquivo";

export interface Mensagem {
  id: string;
  conversa_id: string;
  autor_user_id: string;
  conteudo: string | null;
  lida: boolean;
  lida_em: string | null;
  editada_em: string | null;
  excluida: boolean;
  excluida_em: string | null;
  conteudo_original: string | null;
  created_at: string;
  tipo: MensagemTipo;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  anexo_tamanho: number | null;
}

export interface ChatConfig {
  id: string;
  tenant_id: string;
  welcome_message: string;
}

const DEFAULT_SUBJECTS = ["Seguro", "Sinistro", "Oficina mecânica", "Pagamento", "Aluguer de viaturas", "Outros"];
const DEFAULT_WELCOME = "Olá 👋 Bem-vindo ao suporte!\n\nSelecione o assunto abaixo para continuar.";

export function useAssuntos(tenantId: string | null, includeInactive = false) {
  return useQuery({
    queryKey: ["assuntos", tenantId, includeInactive],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase.from("assuntos_chat").select("*").eq("tenant_id", tenantId!).order("ordem");
      if (!includeInactive) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;

      if (!data || data.length === 0) {
        const rows = DEFAULT_SUBJECTS.map((nome, i) => ({ tenant_id: tenantId!, nome, ordem: i }));
        const { data: inserted } = await supabase.from("assuntos_chat").insert(rows).select("*");
        return (inserted || []) as Assunto[];
      }
      return data as Assunto[];
    },
  });
}

export function useAssuntoResponsaveis(assuntoId: string | null) {
  return useQuery({
    queryKey: ["assunto-responsaveis", assuntoId],
    enabled: !!assuntoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assunto_responsaveis")
        .select("*")
        .eq("assunto_id", assuntoId!)
        .order("ordem");
      if (error) throw error;
      return (data || []) as AssuntoResponsavel[];
    },
  });
}

export function useSetAssuntoResponsaveis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assuntoId, funcionarioIds }: { assuntoId: string; funcionarioIds: string[] }) => {
      // Replace existing
      const { error: delErr } = await supabase
        .from("assunto_responsaveis").delete().eq("assunto_id", assuntoId);
      if (delErr) throw delErr;
      if (funcionarioIds.length > 0) {
        const rows = funcionarioIds.map((fid, i) => ({
          assunto_id: assuntoId, funcionario_id: fid, ordem: i,
        }));
        const { error } = await supabase.from("assunto_responsaveis").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assunto-responsaveis", vars.assuntoId] });
      queryClient.invalidateQueries({ queryKey: ["assuntos"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useChatConfig(tenantId: string | null) {
  return useQuery({
    queryKey: ["chat-config", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_config").select("*").eq("tenant_id", tenantId!).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: inserted, error: insErr } = await supabase
          .from("chat_config")
          .insert({ tenant_id: tenantId!, welcome_message: DEFAULT_WELCOME })
          .select("*").single();
        if (insErr) throw insErr;
        return inserted as ChatConfig;
      }
      return data as ChatConfig;
    },
  });
}

export function useUpdateChatConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, welcome_message }: { tenantId: string; welcome_message: string }) => {
      const { error } = await supabase
        .from("chat_config").update({ welcome_message }).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-config", vars.tenantId] });
      toast.success("Mensagem atualizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useCreateAssunto() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      ativo: boolean;
      modo_distribuicao: ModoDistribuicao;
      funcionarioIds: string[];
    }) => {
      if (!profile?.tenant_id) throw new Error("Sem tenant");
      const { data: maxRow } = await supabase
        .from("assuntos_chat").select("ordem").eq("tenant_id", profile.tenant_id)
        .order("ordem", { ascending: false }).limit(1).maybeSingle();
      const nextOrdem = (maxRow?.ordem ?? -1) + 1;
      const { data: inserted, error } = await supabase.from("assuntos_chat").insert({
        tenant_id: profile.tenant_id,
        nome: input.nome,
        ativo: input.ativo,
        ordem: nextOrdem,
        modo_distribuicao: input.modo_distribuicao,
        funcionario_responsavel_id: input.funcionarioIds[0] ?? null,
      }).select("id").single();
      if (error) throw error;
      if (input.funcionarioIds.length > 0) {
        const rows = input.funcionarioIds.map((fid, i) => ({
          assunto_id: inserted.id, funcionario_id: fid, ordem: i,
        }));
        const { error: rErr } = await supabase.from("assunto_responsaveis").insert(rows);
        if (rErr) throw rErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assuntos"] });
      toast.success("Assunto criado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateAssunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      nome?: string;
      ativo?: boolean;
      modo_distribuicao?: ModoDistribuicao;
      funcionarioIds?: string[];
    }) => {
      const { id, funcionarioIds, ...rest } = input;
      const updateFields: Record<string, unknown> = { ...rest };
      if (funcionarioIds !== undefined) {
        updateFields.funcionario_responsavel_id = funcionarioIds[0] ?? null;
      }
      const { error } = await supabase.from("assuntos_chat").update(updateFields).eq("id", id);
      if (error) throw error;
      if (funcionarioIds !== undefined) {
        await supabase.from("assunto_responsaveis").delete().eq("assunto_id", id);
        if (funcionarioIds.length > 0) {
          const rows = funcionarioIds.map((fid, i) => ({
            assunto_id: id, funcionario_id: fid, ordem: i,
          }));
          const { error: rErr } = await supabase.from("assunto_responsaveis").insert(rows);
          if (rErr) throw rErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assuntos"] });
      queryClient.invalidateQueries({ queryKey: ["assunto-responsaveis"] });
      toast.success("Assunto atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteAssunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assuntoId: string) => {
      const { count } = await supabase
        .from("conversas").select("id", { count: "exact", head: true })
        .eq("assunto_id", assuntoId);
      if ((count ?? 0) > 0) {
        const { error } = await supabase
          .from("assuntos_chat").update({ ativo: false }).eq("id", assuntoId);
        if (error) throw error;
        return { soft: true as const };
      }
      const { error } = await supabase.from("assuntos_chat").delete().eq("id", assuntoId);
      if (error) throw error;
      return { soft: false as const };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["assuntos"] });
      toast.success(res.soft ? "Assunto desativado (conversas preservadas)" : "Assunto excluído");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useConversas() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["conversas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("*, assunto:assuntos_chat(nome)")
        .order("ultima_mensagem_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Conversa[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("conversas-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversas"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useMensagens(conversaId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["mensagens", conversaId],
    enabled: !!conversaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_chat").select("*")
        .eq("conversa_id", conversaId!).order("created_at");
      if (error) throw error;
      return data as Mensagem[];
    },
  });

  useEffect(() => {
    if (!conversaId) return;
    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "mensagens_chat",
        filter: `conversa_id=eq.${conversaId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["mensagens", conversaId] });
        queryClient.invalidateQueries({ queryKey: ["conversas"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversaId, queryClient]);

  return query;
}

export function useStartConversa() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assuntoId }: { assuntoId: string }) => {
      if (!user || !profile?.tenant_id) throw new Error("Sem sessão");
      // Reuse only if existing is NOT finalized
      const { data: existing } = await supabase
        .from("conversas").select("*")
        .eq("iniciador_user_id", user.id).eq("assunto_id", assuntoId)
        .eq("arquivada", false).neq("status", "finalizado")
        .maybeSingle();
      if (existing) return existing as unknown as Conversa;

      const { data, error } = await supabase
        .from("conversas")
        .insert({ tenant_id: profile.tenant_id, assunto_id: assuntoId, iniciador_user_id: user.id })
        .select("*").single();
      if (error) throw error;
      return data as unknown as Conversa;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversas"] }),
    onError: (e: Error) => toast.error("Erro ao iniciar conversa: " + e.message),
  });
}

export function useSendMensagem() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conversaId: string;
      conteudo?: string;
      tipo?: MensagemTipo;
      anexo_url?: string;
      anexo_nome?: string;
      anexo_mime?: string;
      anexo_tamanho?: number;
    }) => {
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");
      if (!profile?.tenant_id) throw new Error("Conta sem empresa associada.");
      if (!input.conversaId) throw new Error("Conversa inválida.");

      // Validar conversa antes de enviar (status + acesso + somente_leitura)
      const { data: conv, error: convErr } = await supabase
        .from("conversas")
        .select("id, status, somente_leitura, iniciador_user_id, destinatario_user_id, tenant_id")
        .eq("id", input.conversaId)
        .maybeSingle();
      if (convErr) throw new Error("Não foi possível validar a conversa: " + convErr.message);
      if (!conv) throw new Error("Conversa não encontrada ou sem permissão.");
      if (conv.status === "finalizado") throw new Error("Conversa finalizada — não é possível enviar.");

      // Bloqueio cliente para destinatários em conversas somente leitura (avisos/broadcast)
      if ((conv as { somente_leitura?: boolean }).somente_leitura) {
        const isPartyUser =
          conv.iniciador_user_id === user.id || conv.destinatario_user_id === user.id;
        // Verificar se é funcionário/admin do tenant — esses podem responder
        const { data: func } = await supabase
          .from("funcionarios")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        const isStaff = !!func || (profile as { role?: string })?.role === "admin";
        if (isPartyUser && !isStaff) {
          throw new Error("Esta é uma mensagem informativa. Não é possível responder.");
        }
      }

      const { data, error } = await supabase
        .from("mensagens_chat")
        .insert({
          tenant_id: profile.tenant_id,
          conversa_id: input.conversaId,
          autor_user_id: user.id,
          conteudo: input.conteudo ?? null,
          tipo: input.tipo ?? "texto",
          anexo_url: input.anexo_url ?? null,
          anexo_nome: input.anexo_nome ?? null,
          anexo_mime: input.anexo_mime ?? null,
          anexo_tamanho: input.anexo_tamanho ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Mensagem não foi guardada (verifique permissões).");
      return data as Mensagem;
    },
    onSuccess: (msg, vars) => {
      // Update otimista imediato — não esperar pelo realtime
      queryClient.setQueryData<Mensagem[]>(["mensagens", vars.conversaId], (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
    onError: (e: Error) => toast.error("Erro ao enviar: " + e.message),
  });
}

export function useUploadChatAnexo() {
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ conversaId, file }: { conversaId: string; file: File }) => {
      if (!profile?.tenant_id) throw new Error("Sem sessão");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${profile.tenant_id}/${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      return { url: signed.signedUrl, path, name: file.name, mime: file.type, size: file.size };
    },
    onError: (e: Error) => toast.error("Erro no upload: " + e.message),
  });
}

export function useAssumirConversa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { data, error } = await supabase.rpc("assumir_conversa", { _conversa_id: conversaId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      toast.success("Conversa assumida");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useFinalizarConversa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { data, error } = await supabase.rpc("finalizar_conversa", { _conversa_id: conversaId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      toast.success("Conversa finalizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useReabrirConversa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { data, error } = await supabase.rpc("reabrir_conversa", { _conversa_id: conversaId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      toast.success("Conversa reaberta");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Funcionário/admin inicia uma conversa com um motorista ou proprietário. */
export function useStartConversaParaUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ destinatarioUserId, assuntoId }: { destinatarioUserId: string; assuntoId: string }) => {
      const { data, error } = await supabase.rpc("iniciar_conversa_para_usuario", {
        _destinatario_user_id: destinatarioUserId,
        _assunto_id: assuntoId,
      });
      if (error) throw error;
      return data as unknown as Conversa;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversas"] }),
    onError: (e: Error) => toast.error("Erro ao iniciar conversa: " + e.message),
  });
}

/** Funcionário/admin inicia conversa interna direta com outro funcionário/admin. */
export function useStartConversaInterna() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (destinatarioUserId: string) => {
      const { data, error } = await supabase.rpc("iniciar_conversa_interna" as never, {
        _destinatario_user_id: destinatarioUserId,
      } as never);
      if (error) throw error;
      return data as unknown as Conversa;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversas"] }),
    onError: (e: Error) => toast.error("Erro ao iniciar conversa interna: " + e.message),
  });
}

/**
 * Conta mensagens não lidas (não escritas pelo próprio utilizador) em todas as
 * conversas a que o utilizador tem acesso via RLS. Atualiza em tempo real.
 */
export function useUnreadChatCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("mensagens_chat")
        .select("id", { count: "exact", head: true })
        .eq("lida", false)
        .neq("autor_user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-unread-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "mensagens_chat" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

/**
 * Devolve um Map<conversaId, unreadCount> para mensagens não lidas
 * que não foram escritas pelo próprio utilizador. Atualiza em tempo real.
 */
export function useUnreadByConversa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-unread-by-conversa", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("conversa_id")
        .eq("lida", false)
        .neq("autor_user_id", user!.id);
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((row: { conversa_id: string }) => {
        map.set(row.conversa_id, (map.get(row.conversa_id) ?? 0) + 1);
      });
      return map;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-unread-by-conversa")
      .on("postgres_changes", { event: "*", schema: "public", table: "mensagens_chat" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-unread-by-conversa", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

/** Marca como lidas todas as mensagens de uma conversa que não foram escritas pelo próprio utilizador. */
export function useMarkConversaAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { error } = await supabase.rpc("marcar_conversa_lida" as never, {
        _conversa_id: conversaId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-by-conversa"] });
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
  });
}

/** Marca uma conversa como "não lida" para o próprio utilizador. */
export function useMarkConversaAsUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { error } = await supabase.rpc("marcar_conversa_nao_lida" as never, {
        _conversa_id: conversaId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-by-conversa"] });
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      toast.success("Conversa marcada como não lida");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Edita uma mensagem própria (sujeita às regras de tempo do backend). */
export function useEditMensagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mensagemId, novoConteudo }: { mensagemId: string; novoConteudo: string }) => {
      const { error } = await supabase.rpc("editar_mensagem" as never, {
        _mensagem_id: mensagemId,
        _novo_conteudo: novoConteudo,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      toast.success("Mensagem editada");
    },
    onError: (e: Error) => toast.error("Erro ao editar: " + e.message),
  });
}

/** Apaga (logicamente) uma mensagem própria (sujeita às regras de tempo do backend). */
export function useDeleteMensagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mensagemId: string) => {
      const { error } = await supabase.rpc("excluir_mensagem" as never, {
        _mensagem_id: mensagemId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      toast.success("Mensagem apagada");
    },
    onError: (e: Error) => toast.error("Erro ao apagar: " + e.message),
  });
}

/** Returns the funcionario row for the current user (if any). */
export function useMyFuncionario() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-funcionario", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios").select("id, nome, tenant_id")
        .eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
