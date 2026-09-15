import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CalendarDays, Lock, UserCog } from "lucide-react";
import {
  useAusencias, useCreateAusencia, useUpdateAusencia, useDeleteAusencia,
  isAusenciaAtivaHoje, TIPO_AUSENCIA_LABEL,
  type FuncionarioAusencia, type TipoAusencia,
} from "@/hooks/useFuncionarioAusencias";
import type { Funcionario } from "@/hooks/useFuncionarios";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  funcionarioId: string;
  todosFuncionarios: Funcionario[];
}

const TIPOS: TipoAusencia[] = ["ferias", "doenca", "folga", "outro"];

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-PT");
const nomeOf = (f?: Funcionario) => f ? [f.nome, f.sobrenome].filter(Boolean).join(" ") : "—";

export function AusenciasTab({ funcionarioId, todosFuncionarios }: Props) {
  const { data: ausencias = [], isLoading } = useAusencias(funcionarioId);
  const create = useCreateAusencia();
  const update = useUpdateAusencia();
  const del = useDeleteAusencia();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuncionarioAusencia | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const possiveisSubstitutos = todosFuncionarios.filter((f) => f.id !== funcionarioId && f.ativo);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Ausências</h3>
          <p className="text-xs text-muted-foreground">Registe múltiplos períodos de férias, doença ou folga ao longo do ano.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nova ausência
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">A carregar…</p>
      ) : ausencias.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Sem ausências registadas.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {ausencias.map((a) => {
            const ativaHoje = isAusenciaAtivaHoje(a);
            const sub = todosFuncionarios.find((f) => f.id === a.substituto_id);
            return (
              <Card key={a.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{TIPO_AUSENCIA_LABEL[a.tipo]}</Badge>
                      {ativaHoje && <Badge>Em curso</Badge>}
                      {a.bloquear_acesso && (
                        <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" /> Bloqueado</Badge>
                      )}
                      {a.substituicao_ativa && a.substituto_id && (
                        <Badge variant="secondary" className="gap-1">
                          <UserCog className="w-3 h-3" /> Substituto: {nomeOf(sub)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{fmt(a.data_inicio)} → {fmt(a.data_fim)}</p>
                    {a.observacoes && <p className="text-xs text-muted-foreground">{a.observacoes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDelId(a.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AusenciaFormDialog
        open={open} onOpenChange={setOpen}
        funcionarioId={funcionarioId} ausencia={editing}
        possiveisSubstitutos={possiveisSubstitutos}
        onSubmit={async (data) => {
          if (editing) await update.mutateAsync({ id: editing.id, funcionario_id: funcionarioId, ...data });
          else await create.mutateAsync({ ...data, funcionario_id: funcionarioId });
          setOpen(false);
        }}
        saving={create.isPending || update.isPending}
      />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ausência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (delId) del.mutate({ id: delId, funcionario_id: funcionarioId });
              setDelId(null);
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AusenciaFormDialog({
  open, onOpenChange, ausencia, possiveisSubstitutos, onSubmit, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  funcionarioId: string;
  ausencia: FuncionarioAusencia | null;
  possiveisSubstitutos: Funcionario[];
  onSubmit: (data: {
    tipo: TipoAusencia; data_inicio: string; data_fim: string;
    substituto_id: string | null; substituicao_ativa: boolean;
    bloquear_acesso: boolean; observacoes: string | null;
  }) => Promise<void>;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<TipoAusencia>("ferias");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [substituto, setSubstituto] = useState<string>("");
  const [subAtiva, setSubAtiva] = useState(true);
  const [bloquear, setBloquear] = useState(false);
  const [obs, setObs] = useState("");

  useHydrate(open, ausencia, {
    setTipo, setInicio, setFim, setSubstituto, setSubAtiva, setBloquear, setObs,
  });

  const handleSave = async () => {
    if (!inicio || !fim) return;
    if (fim < inicio) return;
    await onSubmit({
      tipo, data_inicio: inicio, data_fim: fim,
      substituto_id: subAtiva ? (substituto || null) : null,
      substituicao_ativa: subAtiva,
      bloquear_acesso: bloquear,
      observacoes: obs.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ausencia ? "Editar ausência" : "Nova ausência"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAusencia)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_AUSENCIA_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de início *</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data de fim *</Label>
              <Input type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ativar substituição automática</Label>
              <Switch checked={subAtiva} onCheckedChange={setSubAtiva} />
            </div>
            {subAtiva && (
              <div>
                <Label>Funcionário substituto</Label>
                <Select value={substituto} onValueChange={setSubstituto}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {possiveisSubstitutos.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{nomeOf(f)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <Label className="text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Bloquear acesso durante o período</Label>
              <Switch checked={bloquear} onCheckedChange={setBloquear} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !inicio || !fim}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper hook to hydrate form state when dialog opens / ausencia changes
function useHydrate(
  open: boolean,
  ausencia: FuncionarioAusencia | null,
  setters: {
    setTipo: (v: TipoAusencia) => void; setInicio: (v: string) => void; setFim: (v: string) => void;
    setSubstituto: (v: string) => void; setSubAtiva: (v: boolean) => void;
    setBloquear: (v: boolean) => void; setObs: (v: string) => void;
  }
) {
  useEffect(() => {
    if (!open) return;
    if (ausencia) {
      setters.setTipo(ausencia.tipo);
      setters.setInicio(ausencia.data_inicio);
      setters.setFim(ausencia.data_fim);
      setters.setSubstituto(ausencia.substituto_id ?? "");
      setters.setSubAtiva(ausencia.substituicao_ativa);
      setters.setBloquear(ausencia.bloquear_acesso);
      setters.setObs(ausencia.observacoes ?? "");
    } else {
      setters.setTipo("ferias");
      setters.setInicio(""); setters.setFim("");
      setters.setSubstituto(""); setters.setSubAtiva(true);
      setters.setBloquear(false); setters.setObs("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ausencia?.id]);
}
