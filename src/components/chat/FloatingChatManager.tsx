import { useEffect, useMemo } from "react";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { useConversas, useMensagens, useMarkConversaAsRead, type Conversa } from "@/hooks/useChat";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useAuth } from "@/contexts/AuthContext";
import { ChatWindow } from "./ChatWindow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingChatManager() {
  const { user } = useAuth();
  const { windows, minimizeConversa, closeConversa, focusConversa } = useFloatingChat();
  const { data: conversas = [] } = useConversas();
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: motoristas = [] } = useMotoristas();
  const { data: proprietarios = [] } = useProprietarios();

  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    funcionarios.forEach((f) => {
      if (f.user_id) m.set(f.user_id, [f.nome, f.sobrenome].filter(Boolean).join(" ") || "Funcionário");
    });
    motoristas.forEach((mo) => {
      if (mo.user_id) m.set(mo.user_id, mo.nome_completo || "Motorista");
    });
    proprietarios.forEach((p) => {
      if (p.user_id) m.set(p.user_id, p.nome_completo || p.nome_empresa || "Proprietário");
    });
    return m;
  }, [funcionarios, motoristas, proprietarios]);

  const titleFor = (c: Conversa): string => {
    if (c.escopo === "interno") {
      const otherId = c.iniciador_user_id === user?.id ? c.destinatario_user_id : c.iniciador_user_id;
      return (otherId && userNameMap.get(otherId)) || "Conversa interna";
    }
    return c.assunto?.nome ?? c.titulo ?? "Conversa";
  };

  if (!user || windows.length === 0) return null;

  const open = windows.filter((w) => w.state === "open");
  const minimized = windows.filter((w) => w.state === "minimized");

  return (
    <>
      {/* Open windows: stacked from the right */}
      <div className="fixed bottom-0 right-4 z-50 flex items-end gap-3 pointer-events-none">
        {open.map((w) => {
          const conv = conversas.find((c) => c.id === w.conversaId);
          if (!conv) return null;
          return (
            <FloatingChatWindow
              key={w.conversaId}
              conversa={conv}
              title={titleFor(conv)}
              onMinimize={() => minimizeConversa(w.conversaId)}
              onClose={() => closeConversa(w.conversaId)}
            />
          );
        })}
      </div>

      {/* Minimized bar */}
      {minimized.length > 0 && (
        <div className="fixed bottom-2 left-4 z-50 flex flex-col gap-2 pointer-events-none">
          {minimized.map((w) => {
            const conv = conversas.find((c) => c.id === w.conversaId);
            if (!conv) return null;
            return (
              <MinimizedTab
                key={w.conversaId}
                conversaId={w.conversaId}
                title={titleFor(conv)}
                unread={w.unread}
                onOpen={() => focusConversa(w.conversaId)}
                onClose={() => closeConversa(w.conversaId)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

interface FloatingChatWindowProps {
  conversa: Conversa;
  title: string;
  onMinimize: () => void;
  onClose: () => void;
}

function FloatingChatWindow({ conversa, title, onMinimize, onClose }: FloatingChatWindowProps) {
  // Subscribe to messages so realtime continues even when not on /chat
  useMensagens(conversa.id);
  const markAsRead = useMarkConversaAsRead();

  // Mark as read when window is open/focused
  useEffect(() => {
    markAsRead.mutate(conversa.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversa.id]);

  return (
    <div
      className={cn(
        "pointer-events-auto bg-card border border-border rounded-t-lg shadow-2xl",
        "flex flex-col w-[360px] h-[520px] max-h-[80vh] animate-in fade-in slide-in-from-bottom-4",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 rounded-t-lg">
        <p className="text-sm font-semibold truncate flex-1">{title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMinimize} aria-label="Minimizar">
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow conversa={conversa} />
      </div>
    </div>
  );
}

interface MinimizedTabProps {
  conversaId: string;
  title: string;
  unread: number;
  onOpen: () => void;
  onClose: () => void;
}

function MinimizedTab({ conversaId, title, unread, onOpen, onClose }: MinimizedTabProps) {
  // Track new messages while minimized to bump unread badge
  const { bumpUnread } = useFloatingChat();
  const { data: mensagens = [] } = useMensagens(conversaId);
  const { user } = useAuth();

  useEffect(() => {
    if (mensagens.length === 0) return;
    const last = mensagens[mensagens.length - 1];
    if (last.autor_user_id !== user?.id) {
      bumpUnread(conversaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagens.length]);

  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-card border border-border rounded-full shadow-lg pl-3 pr-1 py-1 animate-in fade-in">
      <button
        onClick={onOpen}
        className="flex items-center gap-2 text-sm font-medium hover:text-primary transition max-w-[220px]"
      >
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="truncate">{title}</span>
        {unread > 0 && (
          <Badge className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Fechar">
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
