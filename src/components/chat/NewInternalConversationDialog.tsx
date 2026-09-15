import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useStartConversaInterna } from "@/hooks/useChat";
import { Search, User, Loader2, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversaCreated: (conversaId: string) => void;
}

export function NewInternalConversationDialog({ open, onOpenChange, onConversaCreated }: Props) {
  const { user } = useAuth();
  const { data: funcionarios = [], isLoading } = useFuncionarios();
  const start = useStartConversaInterna();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const candidatos = useMemo(() => {
    return funcionarios
      .filter((f) => !!f.user_id && f.user_id !== user?.id && f.ativo !== false)
      .map((f) => ({
        user_id: f.user_id as string,
        nome: [f.nome, f.sobrenome].filter(Boolean).join(" ") || "Funcionário",
        detalhe: f.email ?? f.telemovel ?? undefined,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [funcionarios, user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidatos;
    return candidatos.filter(
      (d) => d.nome.toLowerCase().includes(q) || d.detalhe?.toLowerCase().includes(q),
    );
  }, [candidatos, search]);

  const handleSubmit = async () => {
    if (!selectedUserId) return toast.error("Selecione um colega");
    try {
      const conversa = await start.mutateAsync(selectedUserId);
      onConversaCreated(conversa.id);
      onOpenChange(false);
      setSelectedUserId(null);
      setSearch("");
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" /> Nova conversa interna
          </DialogTitle>
          <DialogDescription>
            Selecione um colega para iniciar uma conversa privada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Pesquisar</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, email ou telemóvel..."
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="h-64 border rounded-md">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-6">
                Sem colegas disponíveis.
              </p>
            ) : (
              <ul className="divide-y">
                {filtered.map((d) => {
                  const selected = selectedUserId === d.user_id;
                  return (
                    <li key={d.user_id}>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(d.user_id)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-muted/50 transition flex items-center gap-2",
                          selected && "bg-muted",
                        )}
                      >
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.nome}</p>
                          {d.detalhe && (
                            <p className="text-xs text-muted-foreground truncate">{d.detalhe}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || start.isPending}>
            {start.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquarePlus className="w-4 h-4 mr-2" />}
            Iniciar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
