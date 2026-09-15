import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Assunto, useAssuntos, useChatConfig, useStartConversa } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversaCreated: (conversaId: string) => void;
}

export function SubjectPicker({ open, onOpenChange, onConversaCreated }: Props) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const { data: assuntos = [], isLoading } = useAssuntos(tenantId);
  const { data: config } = useChatConfig(tenantId);
  const start = useStartConversa();

  const handleSelect = async (a: Assunto) => {
    const c = await start.mutateAsync({ assuntoId: a.id });
    onConversaCreated(c.id);
    onOpenChange(false);
  };

  const welcome = config?.welcome_message ?? "Olá 👋 Bem-vindo ao suporte!\nSelecione o assunto abaixo para continuar.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Iniciar conversa
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm whitespace-pre-wrap text-foreground">{welcome}</p>
        <div className="grid grid-cols-1 gap-2 pt-2">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            assuntos.map((a) => (
              <Button
                key={a.id} variant="outline" className="justify-start h-auto py-3"
                onClick={() => handleSelect(a)} disabled={start.isPending}
              >
                {a.nome}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
