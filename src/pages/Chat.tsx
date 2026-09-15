import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useConversas, useUnreadByConversa, useReabrirConversa, type Conversa, type StatusConversa } from "@/hooks/useChat";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useProprietarios } from "@/hooks/useProprietarios";
import { SubjectPicker } from "@/components/chat/SubjectPicker";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { NewInternalConversationDialog } from "@/components/chat/NewInternalConversationDialog";
import { AttendanceConfig } from "@/components/chat/AttendanceConfig";
import { MassMessagingTab } from "@/components/chat/MassMessagingTab";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { MessageSquarePlus, MessagesSquare, Globe, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Chat() {
  const { user, isAdmin, isMotorista, isProprietario } = useAuth();
  const { can, isFuncionario } = usePermissions();
  const { data: conversas = [], isLoading } = useConversas();
  const { data: unreadMap } = useUnreadByConversa();
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: motoristas = [] } = useMotoristas();
  const { data: proprietarios = [] } = useProprietarios();
  const { openConversa, windows } = useFloatingChat();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newInternalOpen, setNewInternalOpen] = useState(false);

  const canStartConversa = isMotorista || isProprietario;
  const canStaffStart = isAdmin || (isFuncionario && can("chat", "visualizar"));
  const canInternalChat = isAdmin || (isFuncionario && can("chat_interno", "visualizar"));

  const externas = useMemo(() => conversas.filter((c) => c.escopo !== "interno"), [conversas]);
  const internas = useMemo(() => conversas.filter((c) => c.escopo === "interno"), [conversas]);

  const funcionarioName = (id: string | null) =>
    id ? funcionarios.find((f) => f.id === id)?.nome ?? "—" : null;

  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    funcionarios.forEach((f) => {
      if (f.user_id) m.set(f.user_id, [f.nome, f.sobrenome].filter(Boolean).join(" ") || "Funcionário");
    });
    motoristas.forEach((mo) => { if (mo.user_id) m.set(mo.user_id, mo.nome_completo || "Motorista"); });
    proprietarios.forEach((p) => {
      if (p.user_id) m.set(p.user_id, p.nome_completo || p.nome_empresa || "Proprietário");
    });
    return m;
  }, [funcionarios, motoristas, proprietarios]);

  const internalCounterpart = (c: Conversa): string => {
    const otherId = c.iniciador_user_id === user?.id ? c.destinatario_user_id : c.iniciador_user_id;
    if (!otherId) return "Conversa interna";
    return userNameMap.get(otherId) ?? "Colega";
  };

  const canConfigureChat = isAdmin || (isFuncionario && can("chat", "configurar"));
  const canMassMessaging = isAdmin || (isFuncionario && can("mensagens_massa", "configurar"));
  const canReopen = isAdmin || isFuncionario;

  const handleStartExternal = () => {
    if (canStaffStart) setNewConvOpen(true);
    else if (canStartConversa) setPickerOpen(true);
  };

  const showStartButton = canStartConversa || canStaffStart;
  const openIds = new Set(windows.filter((w) => w.state === "open").map((w) => w.conversaId));
  const minimizedIds = new Set(windows.filter((w) => w.state === "minimized").map((w) => w.conversaId));

  if (canStartConversa) {
    return (
      <AppLayout title="Chat" subtitle="Comunicação interna">
        <ChatList
          conversas={externas} loading={isLoading}
          openIds={openIds} minimizedIds={minimizedIds} unreadMap={unreadMap}
          onSelect={openConversa}
          showStartButton={showStartButton}
          onStart={handleStartExternal}
          funcionarioName={funcionarioName}
          internalCounterpart={internalCounterpart}
          escopo="externo"
          canReopen={false}
        />
        <SubjectPicker
          open={pickerOpen} onOpenChange={setPickerOpen}
          onConversaCreated={(id) => openConversa(id)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Chat" subtitle="Comunicação interna e externa">
      <Tabs defaultValue="externo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="externo"><Globe className="w-4 h-4 mr-1" />Chat Externo</TabsTrigger>
          {canInternalChat && (
            <TabsTrigger value="interno"><Lock className="w-4 h-4 mr-1" />Chat Interno</TabsTrigger>
          )}
          {canConfigureChat && <TabsTrigger value="config">Configuração</TabsTrigger>}
          {canMassMessaging && <TabsTrigger value="massa">Mensagens em Massa</TabsTrigger>}
        </TabsList>

        <TabsContent value="externo" className="mt-4">
          <ChatList
            conversas={externas} loading={isLoading}
            openIds={openIds} minimizedIds={minimizedIds} unreadMap={unreadMap}
            onSelect={openConversa}
            showStartButton={showStartButton}
            onStart={handleStartExternal}
            funcionarioName={funcionarioName}
            internalCounterpart={internalCounterpart}
            escopo="externo"
            canReopen={canReopen}
          />
        </TabsContent>

        {canInternalChat && (
          <TabsContent value="interno" className="mt-4">
            <ChatList
              conversas={internas} loading={isLoading}
              openIds={openIds} minimizedIds={minimizedIds} unreadMap={unreadMap}
              onSelect={openConversa}
              showStartButton
              onStart={() => setNewInternalOpen(true)}
              funcionarioName={funcionarioName}
              internalCounterpart={internalCounterpart}
              escopo="interno"
              canReopen={canReopen}
            />
          </TabsContent>
        )}

        {canConfigureChat && (
          <TabsContent value="config" className="mt-4">
            <AttendanceConfig />
          </TabsContent>
        )}
        {canMassMessaging && (
          <TabsContent value="massa" className="mt-4">
            <MassMessagingTab />
          </TabsContent>
        )}
      </Tabs>

      <NewConversationDialog
        open={newConvOpen} onOpenChange={setNewConvOpen}
        onConversaCreated={(id) => openConversa(id)}
      />
      <NewInternalConversationDialog
        open={newInternalOpen} onOpenChange={setNewInternalOpen}
        onConversaCreated={(id) => openConversa(id)}
      />
    </AppLayout>
  );
}

interface ListProps {
  conversas: Conversa[];
  loading: boolean;
  openIds: Set<string>;
  minimizedIds: Set<string>;
  unreadMap?: Map<string, number>;
  onSelect: (id: string) => void;
  showStartButton: boolean;
  onStart: () => void;
  funcionarioName: (id: string | null) => string | null;
  internalCounterpart: (c: Conversa) => string;
  escopo: "externo" | "interno";
  canReopen: boolean;
}

type StatusTab = "aberto" | "em_atendimento" | "finalizado";

function ChatList({
  conversas, loading, openIds, minimizedIds, unreadMap, onSelect,
  showStartButton, onStart, funcionarioName, internalCounterpart, escopo, canReopen,
}: ListProps) {
  const [statusTab, setStatusTab] = useState<StatusTab>("aberto");
  const reabrir = useReabrirConversa();

  const counts = useMemo(() => ({
    aberto: conversas.filter((c) => c.status === "aberto").length,
    em_atendimento: conversas.filter((c) => c.status === "em_atendimento").length,
    finalizado: conversas.filter((c) => c.status === "finalizado").length,
  }), [conversas]);

  const filtered = useMemo(
    () => conversas.filter((c) => c.status === statusTab),
    [conversas, statusTab],
  );

  const handleReopen = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await reabrir.mutateAsync(id);
      toast.success("Conversa reaberta");
      setStatusTab("em_atendimento");
      onSelect(id);
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível reabrir a conversa");
    }
  };

  const emptyLabel = statusTab === "finalizado"
    ? "Sem conversas finalizadas."
    : statusTab === "em_atendimento"
      ? "Sem conversas em atendimento."
      : escopo === "interno" ? "Sem conversas internas." : "Sem conversas em aberto.";

  return (
    <div className="border rounded-lg flex flex-col overflow-hidden max-w-2xl">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">
          {escopo === "interno" ? "Conversas internas" : "Conversas"}
        </h3>
        {showStartButton && (
          <Button size="sm" onClick={onStart}>
            <MessageSquarePlus className="w-4 h-4 mr-1" /> Nova
          </Button>
        )}
      </div>
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <StatusTabTrigger value="aberto" label="Em aberto" count={counts.aberto} />
          <StatusTabTrigger value="em_atendimento" label="Em atendimento" count={counts.em_atendimento} />
          <StatusTabTrigger value="finalizado" label="Finalizadas" count={counts.finalizado} />
        </TabsList>
      </Tabs>
      <div className="max-h-[calc(100vh-330px)] min-h-[280px] overflow-y-auto">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground p-4">A carregar…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted-foreground">
            <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {emptyLabel}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((c) => {
              const isInternal = c.escopo === "interno";
              const title = isInternal
                ? internalCounterpart(c)
                : c.assunto?.nome ?? "Sem assunto";
              const respNome = isInternal ? null : funcionarioName(c.assumido_por);
              const isOpen = openIds.has(c.id);
              const isMinimized = minimizedIds.has(c.id);
              const unread = unreadMap?.get(c.id) ?? 0;
              const isFinalized = c.status === "finalizado";
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 transition",
                      isOpen && "bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={cn("text-sm truncate flex-1", unread > 0 ? "font-semibold" : "font-medium")}>
                        {isFinalized && "✔ "}{title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unread > 0 && (
                          <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">
                            {unread > 9 ? "9+" : unread}
                          </Badge>
                        )}
                        {isMinimized && (
                          <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                            Minimizada
                          </Badge>
                        )}
                        {isOpen && !isMinimized && (
                          <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                            Aberta
                          </Badge>
                        )}
                        {!isInternal && <StatusDot status={c.status} />}
                      </div>
                    </div>
                    {!isInternal && (
                      <p className="text-xs text-muted-foreground truncate">
                        {respNome ? `→ ${respNome}` : "Sem responsável"}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        {isFinalized && c.finalizado_em
                          ? `Finalizada em ${new Date(c.finalizado_em).toLocaleString("pt-PT")}`
                          : new Date(c.ultima_mensagem_at).toLocaleString("pt-PT")}
                      </p>
                      {isFinalized && canReopen && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={(e) => handleReopen(e, c.id)}
                          disabled={reabrir.isPending}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusTabTrigger({ value, label, count }: { value: string; label: string; count: number }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs"
    >
      {label}
      <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[9px]">
        {count}
      </Badge>
    </TabsTrigger>
  );
}

function StatusDot({ status }: { status: "aberto" | "em_atendimento" | "finalizado" }) {
  const map = {
    aberto: { label: "Aberto", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    em_atendimento: { label: "Atendendo", className: "bg-primary/15 text-primary border-primary/30" },
    finalizado: { label: "Final.", className: "bg-muted text-muted-foreground border-border" },
  } as const;
  const cfg = map[status];
  return <Badge variant="outline" className={cn("text-[9px] font-medium", cfg.className)}>{cfg.label}</Badge>;
}
