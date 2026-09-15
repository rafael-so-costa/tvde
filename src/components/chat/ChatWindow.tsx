import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversa, Mensagem, useMensagens, useSendMensagem, useUploadChatAnexo,
  useAssumirConversa, useFinalizarConversa, useReabrirConversa, useMyFuncionario,
  useMarkConversaAsRead, useMarkConversaAsUnread, useEditMensagem, useDeleteMensagem,
} from "@/hooks/useChat";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Send, CheckCircle2, UserCheck, Lock, CircleCheck, RotateCcw,
  Smile, Paperclip, ImageIcon, Camera, X, FileText, Download, Loader2,
  MoreVertical, Pencil, Trash2, MailOpen, Check, CheckCheck,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  conversa: Conversa;
}

const PAGE_SIZE = 30;

export function ChatWindow({ conversa }: Props) {
  const { user, isAdmin } = useAuth();
  const { data: mensagens = [] } = useMensagens(conversa.id);
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: myFuncionario } = useMyFuncionario();
  const send = useSendMensagem();
  const upload = useUploadChatAnexo();
  const assumir = useAssumirConversa();
  const finalizar = useFinalizarConversa();
  const reabrir = useReabrirConversa();
  const markRead = useMarkConversaAsRead();
  const markUnread = useMarkConversaAsUnread();
  const editMsg = useEditMensagem();
  const deleteMsg = useDeleteMensagem();

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; preview?: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isIniciador = conversa.iniciador_user_id === user?.id;
  const isAssumidoPorMim = !!myFuncionario && conversa.assumido_por === myFuncionario.id;
  const isFinalizado = conversa.status === "finalizado";
  const isAberto = conversa.status === "aberto";
  const isStaff = !!myFuncionario || isAdmin;
  const isBroadcastReadOnly = !!conversa.somente_leitura && !isStaff;
  const canWrite = !isFinalizado && !isBroadcastReadOnly && (isIniciador || isAssumidoPorMim || isAdmin);
  const canClaim = !isFinalizado && isAberto && !!myFuncionario && !conversa.assumido_por;
  const canFinalize = !isFinalizado && (isAssumidoPorMim || isAdmin);
  const canReopen = isFinalizado && (!!myFuncionario || isAdmin);

  const responsavelFunc = conversa.assumido_por
    ? funcionarios.find((f) => f.id === conversa.assumido_por)
    : null;
  const responsavelNome = responsavelFunc?.nome ?? null;
  // Detetar redirecionamento: existe outro funcionário cujo substituto é o atual responsável e está ativo hoje
  const redirecionadoDe = (() => {
    if (!responsavelFunc) return null;
    const today = new Date().toISOString().slice(0, 10);
    const original = funcionarios.find(
      (f) =>
        f.substituicao_ativa &&
        f.substituto_id === responsavelFunc.id &&
        (!f.substituicao_inicio || f.substituicao_inicio <= today) &&
        (!f.substituicao_fim || f.substituicao_fim >= today),
    );
    return original ?? null;
  })();

  // Auto-scroll on new message
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens.length, typingFrom]);

  // Mark as read when conversa is open and there are messages from others
  useEffect(() => {
    if (!user || mensagens.length === 0) return;
    const hasUnreadFromOthers = mensagens.some((m) => !m.lida && m.autor_user_id !== user.id);
    if (hasUnreadFromOthers) markRead.mutate(conversa.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversa.id, mensagens.length, user?.id]);

  // Reset on conversa change
  useEffect(() => { setVisibleCount(PAGE_SIZE); setPendingFile(null); setText(""); }, [conversa.id]);

  // Typing broadcast channel
  useEffect(() => {
    const ch = supabase.channel(`typing-${conversa.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      const fromId = (payload.payload as { userId?: string })?.userId;
      if (!fromId || fromId === user?.id) return;
      setTypingFrom(fromId);
      window.clearTimeout((window as unknown as { __typingT?: number }).__typingT);
      (window as unknown as { __typingT?: number }).__typingT = window.setTimeout(() => setTypingFrom(null), 2500);
    }).subscribe();
    broadcastChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [conversa.id, user?.id]);

  const broadcastTyping = () => {
    if (!user?.id) return;
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    broadcastChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
    typingTimeoutRef.current = window.setTimeout(() => { typingTimeoutRef.current = null; }, 1500);
  };

  // Pagination slice
  const visible = useMemo(() => mensagens.slice(Math.max(0, mensagens.length - visibleCount)), [mensagens, visibleCount]);
  const hasMore = mensagens.length > visible.length;

  const handlePickFile = (kind: "file" | "image" | "camera") => {
    if (kind === "file") fileInputRef.current?.click();
    if (kind === "image") imageInputRef.current?.click();
    if (kind === "camera") cameraInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Ficheiro muito grande (máx 25MB)"); return; }
    const isImage = file.type.startsWith("image/");
    setPendingFile({ file, preview: isImage ? URL.createObjectURL(file) : undefined });
  };

  const handleSend = async () => {
    const value = text.trim();
    if (!value && !pendingFile) return;
    try {
      if (pendingFile) {
        const res = await upload.mutateAsync({ conversaId: conversa.id, file: pendingFile.file });
        const isImage = pendingFile.file.type.startsWith("image/");
        await send.mutateAsync({
          conversaId: conversa.id,
          conteudo: value || undefined,
          tipo: isImage ? "imagem" : "arquivo",
          anexo_url: res.url, anexo_nome: res.name, anexo_mime: res.mime, anexo_tamanho: res.size,
        });
        if (pendingFile.preview) URL.revokeObjectURL(pendingFile.preview);
        setPendingFile(null);
      } else {
        await send.mutateAsync({ conversaId: conversa.id, conteudo: value });
      }
      setText("");
    } catch { /* toast handled in hook */ }
  };

  const sending = send.isPending || upload.isPending;

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Header */}
      <div className="border-b p-3 flex items-start justify-between gap-2 bg-card">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversa.assunto?.nome ?? conversa.titulo ?? "Conversa"}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <StatusPill status={conversa.status} />
            {responsavelNome && (
              <span className="text-xs text-muted-foreground">Atendido por: {responsavelNome}</span>
            )}
          </div>
          {redirecionadoDe && responsavelFunc && (
            <div className="mt-2 text-xs px-3 py-1.5 rounded-md bg-accent/40 text-accent-foreground border border-border">
              Atendimento redirecionado de <span className="font-medium">{redirecionadoDe.nome}</span> para <span className="font-medium">{responsavelFunc.nome}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canClaim && (
            <Button size="sm" onClick={() => assumir.mutate(conversa.id)} disabled={assumir.isPending}>
              <UserCheck className="w-4 h-4 mr-1" /> Responder
            </Button>
          )}
          {canFinalize && (
            <Button size="sm" variant="outline" onClick={() => setConfirmFinalizeOpen(true)} disabled={finalizar.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar
            </Button>
          )}
          {canReopen && (
            <Button size="sm" variant="outline" onClick={() => reabrir.mutate(conversa.id)} disabled={reabrir.isPending}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reabrir
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Mais opções">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => markUnread.mutate(conversa.id)}>
                <MailOpen className="w-4 h-4 mr-2" /> Marcar como não lida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--muted-foreground) / 0.06) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Carregar mensagens anteriores
            </Button>
          </div>
        )}

        {mensagens.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sem mensagens ainda. Diga olá 👋</p>
        )}

        {visible.map((m) => {
          const mine = m.autor_user_id === user?.id;
          const isEditing = editingId === m.id;
          const canModify = mine && !m.excluida && canEditOrDelete(m);
          return (
            <div key={m.id} className={cn("flex animate-fade-in group", mine ? "justify-end" : "justify-start")}>
              <div className="flex items-start gap-1 max-w-[85%]">
                {mine && canModify && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity self-center"
                        aria-label="Opções da mensagem"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.tipo === "texto" && (
                        <DropdownMenuItem onClick={() => { setEditingId(m.id); setEditingText(m.conteudo ?? ""); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Apagar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className={cn(
                  "rounded-2xl px-3 py-2 text-sm shadow-sm",
                  m.excluida
                    ? "bg-muted text-muted-foreground italic border"
                    : mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                )}>
                  {m.excluida ? (
                    <p className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Mensagem apagada
                    </p>
                  ) : isEditing ? (
                    <div className="space-y-2 min-w-[220px]">
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="text-sm bg-background text-foreground min-h-[60px]"
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={editMsg.isPending || !editingText.trim()}
                          onClick={async () => {
                            try {
                              await editMsg.mutateAsync({ mensagemId: m.id, novoConteudo: editingText.trim() });
                              setEditingId(null);
                            } catch { /* toast handled */ }
                          }}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.tipo === "imagem" && m.anexo_url && (
                        <a href={m.anexo_url} target="_blank" rel="noreferrer" className="block mb-1">
                          <img src={m.anexo_url} alt={m.anexo_nome ?? "imagem"}
                            className="rounded-lg max-h-64 object-cover" loading="lazy" />
                        </a>
                      )}
                      {m.tipo === "arquivo" && m.anexo_url && (
                        <a href={m.anexo_url} target="_blank" rel="noreferrer"
                          className={cn(
                            "flex items-center gap-2 rounded-lg p-2 mb-1 transition",
                            mine ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                 : "bg-muted hover:bg-muted/80"
                          )}>
                          <FileText className="w-5 h-5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{m.anexo_nome ?? "Arquivo"}</p>
                            {m.anexo_tamanho != null && (
                              <p className={cn("text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {formatBytes(m.anexo_tamanho)}
                              </p>
                            )}
                          </div>
                          <Download className="w-4 h-4 shrink-0 opacity-70" />
                        </a>
                      )}
                      {m.conteudo && (
                        <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                      )}
                    </>
                  )}
                  {!isEditing && (
                    <div className={cn(
                      "flex items-center gap-1 justify-end mt-1 text-[10px]",
                      m.excluida
                        ? "text-muted-foreground"
                        : mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {m.editada_em && !m.excluida && <span className="italic">editada</span>}
                      <span>
                        {new Date(m.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {mine && !m.excluida && (
                        m.lida
                          ? <CheckCheck className="w-3.5 h-3.5" />
                          : <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingFrom && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card border rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {isFinalizado && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-md py-2 mt-2">
            <CircleCheck className="w-4 h-4" /> Conversa finalizada
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {canWrite ? (
        <div className="border-t bg-card">
          {pendingFile && (
            <div className="p-3 border-b flex items-center gap-3 animate-fade-in">
              {pendingFile.preview ? (
                <img src={pendingFile.preview} alt="preview" className="w-16 h-16 object-cover rounded-md border" />
              ) : (
                <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pendingFile.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                if (pendingFile.preview) URL.revokeObjectURL(pendingFile.preview);
                setPendingFile(null);
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="p-2 flex items-end gap-1">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" aria-label="Emoji">
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="p-0 w-auto border-none">
                <EmojiPicker
                  theme={Theme.AUTO}
                  width={320} height={380}
                  onEmojiClick={(e) => { setText((t) => t + e.emoji); setEmojiOpen(false); }}
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" type="button" onClick={() => handlePickFile("file")} aria-label="Anexar">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" onClick={() => handlePickFile("image")} aria-label="Imagem">
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" onClick={() => handlePickFile("camera")} aria-label="Câmara">
              <Camera className="w-5 h-5" />
            </Button>

            <input ref={fileInputRef} type="file" hidden onChange={onFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*" />
            <input ref={imageInputRef} type="file" hidden onChange={onFileChange} accept="image/*" />
            <input ref={cameraInputRef} type="file" hidden onChange={onFileChange} accept="image/*" capture="environment" />

            <Input
              value={text}
              onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Escreva uma mensagem..."
              className="rounded-full"
            />
            <Button onClick={handleSend} disabled={(!text.trim() && !pendingFile) || sending}
              size="icon" className="rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-card flex-wrap">
          <Lock className="w-3.5 h-3.5" />
          {isBroadcastReadOnly
            ? "Esta é uma mensagem informativa. Não é possível responder."
            : isFinalizado
              ? "Conversa finalizada — inicie um novo chat para continuar."
              : conversa.assumido_por
                ? "Esta conversa já foi assumida por outro funcionário."
                : "Aguardando atendimento."}
          {canReopen && (
            <Button size="sm" variant="outline" onClick={() => reabrir.mutate(conversa.id)} disabled={reabrir.isPending} className="ml-2">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reabrir conversa
            </Button>
          )}
        </div>
      )}

      {/* Confirmação de finalização */}
      <AlertDialog open={confirmFinalizeOpen} onOpenChange={setConfirmFinalizeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja finalizar esta conversa? O utilizador deixará de poder enviar mensagens
              até que seja reaberta ou que inicie uma nova conversa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmFinalizeOpen(false); finalizar.mutate(conversa.id); }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão de mensagem */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem ficará marcada como apagada para todos os participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteId) deleteMsg.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Regra de tempo: pode editar/apagar livremente se não lida; até 4 min após leitura. */
function canEditOrDelete(m: Mensagem): boolean {
  if (m.excluida) return false;
  if (!m.lida_em) return true;
  const lidaMs = new Date(m.lida_em).getTime();
  return Date.now() - lidaMs < 4 * 60 * 1000;
}

function StatusPill({ status }: { status: Conversa["status"] }) {
  const map = {
    aberto: { label: "Aberto", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    em_atendimento: { label: "Em atendimento", className: "bg-primary/15 text-primary border-primary/30" },
    finalizado: { label: "Finalizado", className: "bg-muted text-muted-foreground border-border" },
  } as const;
  const cfg = map[status];
  return <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.className)}>{cfg.label}</Badge>;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-4">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
