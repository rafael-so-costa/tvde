import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useAssuntos, useStartConversaParaUsuario } from "@/hooks/useChat";
import { Search, User, Building2, Loader2, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversaCreated: (conversaId: string) => void;
}

type Destinatario = {
  user_id: string;
  nome: string;
  tipo: "motorista" | "proprietario";
  detalhe?: string;
};

export function NewConversationDialog({ open, onOpenChange, onConversaCreated }: Props) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  const { data: motoristas = [], isLoading: loadingM } = useMotoristas();
  const { data: proprietarios = [], isLoading: loadingP } = useProprietarios();
  const { data: assuntos = [], isLoading: loadingA } = useAssuntos(tenantId);
  const start = useStartConversaParaUsuario();

  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [assuntoId, setAssuntoId] = useState<string>("");

  const destinatarios = useMemo<Destinatario[]>(() => {
    const m: Destinatario[] = motoristas
      .filter((x) => !!x.user_id)
      .map((x) => ({
        user_id: x.user_id as string,
        nome: x.nome_completo,
        tipo: "motorista" as const,
        detalhe: x.email ?? x.telemovel ?? undefined,
      }));
    const p: Destinatario[] = proprietarios
      .filter((x) => !!x.user_id)
      .map((x) => ({
        user_id: x.user_id as string,
        nome: x.nome_completo || x.nome_empresa || "Proprietário",
        tipo: "proprietario" as const,
        detalhe: x.email ?? x.telemovel ?? undefined,
      }));
    return [...m, ...p].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [motoristas, proprietarios]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return destinatarios;
    return destinatarios.filter(
      (d) => d.nome.toLowerCase().includes(q) || d.detalhe?.toLowerCase().includes(q),
    );
  }, [destinatarios, search]);

  const handleSubmit = async () => {
    if (!selectedUserId || !assuntoId) {
      toast.error("Selecione um utilizador e um assunto");
      return;
    }
    try {
      const conversa = await start.mutateAsync({ destinatarioUserId: selectedUserId, assuntoId });
      onConversaCreated(conversa.id);
      onOpenChange(false);
      // reset
      setSelectedUserId(null);
      setSearch("");
      setAssuntoId("");
    } catch {
      /* toast handled in hook */
    }
  };

  const loading = loadingM || loadingP || loadingA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" /> Nova conversa
          </DialogTitle>
          <DialogDescription>
            Selecione um motorista ou proprietário e o assunto para iniciar a conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Pesquisar utilizador</Label>
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

          <ScrollArea className="h-56 border rounded-md">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-6">
                Nenhum utilizador com conta de acesso encontrado.
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
                        {d.tipo === "motorista" ? (
                          <User className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {d.tipo === "motorista" ? "Motorista" : "Proprietário"}
                            {d.detalhe ? ` · ${d.detalhe}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div>
            <Label className="text-xs">Assunto</Label>
            <Select value={assuntoId} onValueChange={setAssuntoId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um assunto" />
              </SelectTrigger>
              <SelectContent>
                {assuntos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || !assuntoId || start.isPending}
          >
            {start.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquarePlus className="w-4 h-4 mr-2" />}
            Iniciar conversa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
