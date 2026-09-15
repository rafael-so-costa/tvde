import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Assunto, ModoDistribuicao,
  useAssuntos, useChatConfig, useUpdateChatConfig,
  useCreateAssunto, useUpdateAssunto, useDeleteAssunto,
  useAssuntoResponsaveis,
} from "@/hooks/useChat";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { Pencil, Plus, Trash2, MessageSquare, Save, Eye, Users, Shuffle } from "lucide-react";

export function AttendanceConfig() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const { data: assuntos = [] } = useAssuntos(tenantId, true);
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: config } = useChatConfig(tenantId);
  const updateConfig = useUpdateChatConfig();
  const createAssunto = useCreateAssunto();
  const updateAssunto = useUpdateAssunto();
  const deleteAssunto = useDeleteAssunto();

  const [welcomeDraft, setWelcomeDraft] = useState<string | null>(null);
  const welcomeValue = welcomeDraft ?? config?.welcome_message ?? "";

  const [editing, setEditing] = useState<Assunto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Assunto | null>(null);

  const activeSubjects = assuntos.filter((a) => a.ativo);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Mensagem inicial
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Texto exibido a Motoristas e Proprietários ao iniciar uma conversa.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={5} value={welcomeValue}
              onChange={(e) => setWelcomeDraft(e.target.value)}
              placeholder="Olá 👋 Bem-vindo ao suporte!"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setWelcomeDraft(null)}
                disabled={welcomeDraft === null}>
                Descartar
              </Button>
              <Button size="sm"
                onClick={() => tenantId && updateConfig.mutate(
                  { tenantId, welcome_message: welcomeValue },
                  { onSuccess: () => setWelcomeDraft(null) },
                )}
                disabled={welcomeDraft === null || updateConfig.isPending}
              >
                <Save className="w-4 h-4 mr-1" /> Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Assuntos de atendimento</CardTitle>
              <p className="text-xs text-muted-foreground">
                Defina os funcionários e o modo de distribuição de cada assunto.
              </p>
            </div>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" /> Novo Assunto
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {assuntos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem assuntos.</p>
            )}
            {assuntos.map((a) => (
              <AssuntoRow
                key={a.id}
                assunto={a}
                funcionarios={funcionarios}
                onEdit={() => setEditing(a)}
                onDelete={() => setDeleting(a)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Pré-visualização
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Como Motoristas e Proprietários verão o início da conversa.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/30 p-4 space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Suporte</p>
                <p className="text-[10px] text-muted-foreground">online</p>
              </div>
            </div>

            <div className="bg-background border rounded-lg rounded-tl-sm p-3 text-sm whitespace-pre-wrap">
              {welcomeValue || <span className="text-muted-foreground italic">Sem mensagem definida</span>}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Assuntos disponíveis
              </p>
              {activeSubjects.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum assunto ativo.</p>
              ) : (
                <div className="grid gap-2">
                  {activeSubjects.map((a) => (
                    <div key={a.id} className="border rounded-md px-3 py-2 text-sm bg-background">
                      {a.nome}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AssuntoDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        assunto={editing}
        funcionarios={funcionarios}
        onSave={async (vals) => {
          if (editing) {
            await updateAssunto.mutateAsync({ id: editing.id, ...vals });
          } else {
            await createAssunto.mutateAsync(vals);
          }
          setCreating(false); setEditing(null);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null); }}
        title="Excluir assunto"
        description={`Deseja excluir "${deleting?.nome}"? Se houver conversas associadas, o assunto será apenas desativado para preservar o histórico.`}
        isDeleting={deleteAssunto.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteAssunto.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

interface AssuntoRowProps {
  assunto: Assunto;
  funcionarios: { id: string; nome: string; ativo: boolean }[];
  onEdit: () => void;
  onDelete: () => void;
}

function AssuntoRow({ assunto, funcionarios, onEdit, onDelete }: AssuntoRowProps) {
  const { data: responsaveis = [] } = useAssuntoResponsaveis(assunto.id);
  const nomes = responsaveis
    .map((r) => funcionarios.find((f) => f.id === r.funcionario_id)?.nome)
    .filter(Boolean) as string[];

  return (
    <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{assunto.nome}</p>
          {!assunto.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
          <Badge variant="outline" className="text-[10px] gap-1">
            {assunto.modo_distribuicao === "rodizio"
              ? <><Shuffle className="w-3 h-3" /> Rodízio</>
              : <><Users className="w-3 h-3" /> Todos recebem</>}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {nomes.length > 0 ? `→ ${nomes.join(", ")}` : "Sem responsáveis"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface AssuntoDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assunto: Assunto | null;
  funcionarios: { id: string; nome: string; ativo: boolean }[];
  onSave: (vals: {
    nome: string;
    ativo: boolean;
    modo_distribuicao: ModoDistribuicao;
    funcionarioIds: string[];
  }) => Promise<void>;
}

function AssuntoDialog({ open, onOpenChange, assunto, funcionarios, onSave }: AssuntoDialogProps) {
  const { data: existingResponsaveis = [] } = useAssuntoResponsaveis(assunto?.id ?? null);

  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [modo, setModo] = useState<ModoDistribuicao>("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(assunto?.nome ?? "");
      setAtivo(assunto?.ativo ?? true);
      setModo(assunto?.modo_distribuicao ?? "todos");
    }
  }, [open, assunto]);

  useEffect(() => {
    if (open && assunto) {
      setSelectedIds(existingResponsaveis.map((r) => r.funcionario_id));
    } else if (open && !assunto) {
      setSelectedIds([]);
    }
  }, [open, assunto, existingResponsaveis]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const activeFuncs = funcionarios.filter((f) => f.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{assunto ? "Editar assunto" : "Novo assunto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Seguro" />
          </div>

          <div className="space-y-2">
            <Label>Funcionários responsáveis</Label>
            {activeFuncs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic border rounded-md p-3">
                Nenhum funcionário ativo. Crie funcionários no módulo Equipa primeiro.
              </p>
            ) : (
              <div className="border rounded-md max-h-44 overflow-y-auto divide-y">
                {activeFuncs.map((f) => (
                  <label key={f.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={selectedIds.includes(f.id)}
                      onCheckedChange={() => toggle(f.id)}
                    />
                    <span className="text-sm">{f.nome}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {selectedIds.length === 0
                ? "Sem ninguém selecionado — apenas o gestor verá as conversas."
                : `${selectedIds.length} selecionado(s)`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Modo de distribuição</Label>
            <RadioGroup value={modo} onValueChange={(v) => setModo(v as ModoDistribuicao)} className="space-y-2">
              <label className="flex items-start gap-3 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="todos" id="modo-todos" className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Todos recebem
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Todos os responsáveis veem a conversa. O primeiro a clicar em "Responder" assume e bloqueia os outros.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="rodizio" id="modo-rodizio" className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Shuffle className="w-3.5 h-3.5" /> Rodízio automático
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O sistema atribui cada nova conversa ao próximo funcionário da lista, em ordem sequencial.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label className="text-sm">Ativo</Label>
              <p className="text-xs text-muted-foreground">Apenas assuntos ativos aparecem aos utilizadores.</p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!nome.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  nome: nome.trim(),
                  ativo,
                  modo_distribuicao: modo,
                  funcionarioIds: selectedIds,
                });
              } finally { setSaving(false); }
            }}
          >
            <Save className="w-4 h-4 mr-1" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
