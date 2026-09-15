import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import {
  useListasTransmissao, useCreateListaTransmissao,
  useUpdateListaTransmissao, useDeleteListaTransmissao,
  type ListaTransmissao,
} from "@/hooks/useListasTransmissao";
import { useAudienciaUsers } from "@/hooks/useCampanhas";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function BroadcastListsDialog({ open, onOpenChange }: Props) {
  const { data: listas = [] } = useListasTransmissao();
  const { data: users = [] } = useAudienciaUsers();
  const create = useCreateListaTransmissao();
  const update = useUpdateListaTransmissao();
  const del = useDeleteListaTransmissao();

  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<ListaTransmissao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Only motoristas + proprietarios per requirement
  const eligibleUsers = useMemo(
    () => users.filter((u) => u.tipo === "motorista" || u.tipo === "proprietario"),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter((u) => u.nome.toLowerCase().includes(q));
  }, [eligibleUsers, search]);

  useEffect(() => {
    if (!open) {
      setView("list"); setEditing(null);
      setNome(""); setIds([]); setSearch("");
    }
  }, [open]);

  const openNew = () => {
    setEditing(null); setNome(""); setIds([]); setSearch(""); setView("form");
  };
  const openEdit = (l: ListaTransmissao) => {
    setEditing(l); setNome(l.nome); setIds(l.destinatarios_ids ?? []);
    setSearch(""); setView("form");
  };

  const toggle = (id: string) =>
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    if (!nome.trim()) return toast.error("Indique o nome da lista");
    if (ids.length === 0) return toast.error("Selecione pelo menos um destinatário");
    if (editing) {
      await update.mutateAsync({ id: editing.id, nome: nome.trim(), destinatarios_ids: ids });
    } else {
      await create.mutateAsync({ nome: nome.trim(), destinatarios_ids: ids });
    }
    setView("list");
  };

  const tipoBadge = (id: string) => {
    const u = users.find((x) => x.user_id === id);
    if (!u) return null;
    return u.tipo === "motorista" ? "M" : "P";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {view === "list" ? "Listas de transmissão" : editing ? "Editar lista" : "Nova lista"}
          </DialogTitle>
          <DialogDescription>
            {view === "list"
              ? "Crie grupos reutilizáveis para envios em massa."
              : "Selecione os destinatários a incluir nesta lista."}
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 mr-1" /> Nova lista
              </Button>
            </div>
            {listas.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Sem listas de transmissão.
              </p>
            ) : (
              <div className="space-y-2">
                {listas.map((l) => (
                  <Card key={l.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{l.nome}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {l.destinatarios_ids?.length ?? 0} destinatário(s)
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(l)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletingId(l.id)} title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Nome da lista</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Motoristas Lisboa" />
            </div>
            <div>
              <Label>Selecionar destinatários</Label>
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-2"
              />
              <ScrollArea className="h-64 border rounded-md mt-2 p-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sem utilizadores</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredUsers.map((u) => (
                      <li key={u.user_id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
                        <Checkbox
                          checked={ids.includes(u.user_id)}
                          onCheckedChange={() => toggle(u.user_id)}
                        />
                        <span className="text-sm flex-1 truncate">{u.nome}</span>
                        <Badge variant="outline" className="text-[10px]">{tipoBadge(u.user_id)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="secondary">{ids.length}</Badge> selecionado(s)
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {view === "form" ? (
            <>
              <Button variant="outline" onClick={() => setView("list")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
                Salvar lista
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>

        <DeleteConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          onConfirm={() => { if (deletingId) del.mutate(deletingId); setDeletingId(null); }}
          title="Excluir lista de transmissão?"
          description="Tem certeza que deseja excluir esta lista? Esta ação não afeta mensagens já enviadas."
          isDeleting={del.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
