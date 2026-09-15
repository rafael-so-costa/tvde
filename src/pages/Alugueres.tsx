import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAlugueres } from "@/hooks/useAlugueres";
import { AluguerWizardDialog } from "@/components/alugueres/AluguerWizardDialog";
import { AluguerDevolucaoDialog } from "@/components/alugueres/AluguerDevolucaoDialog";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import {
  Plus, Car, User, Building2, Calendar, MoreVertical, Eye, Pencil,
  Trash2, CheckCircle2, FileText, ClipboardCheck, Loader2, PackageCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Aluguer, StatusAluguer } from "@/types/aluguer";
import { cn } from "@/lib/utils";

const statusBadge: Record<StatusAluguer, { label: string; class: string }> = {
  rascunho: { label: "Rascunho", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
  ativo: { label: "Ativo", class: "bg-success/15 text-success" },
  finalizado: { label: "Finalizado", class: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  cancelado: { label: "Cancelado", class: "bg-muted text-muted-foreground" },
};

function AluguerCard({ aluguer, onEdit, onView, onFinalizar, onDevolver, onDelete }: {
  aluguer: Aluguer;
  onEdit: () => void;
  onView: () => void;
  onFinalizar: () => void;
  onDevolver: () => void;
  onDelete: () => void;
}) {
  const status = statusBadge[aluguer.status];
  const isRascunho = aluguer.status === "rascunho";
  const isAtivo = aluguer.status === "ativo";
  const isFinalizado = aluguer.status === "finalizado";
  const ownerName = aluguer.proprietario?.tipo === "empresa"
    ? aluguer.proprietario?.nome_empresa
    : aluguer.proprietario?.nome_completo;

  return (
    <Card className="card-elevated">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                {aluguer.veiculo?.matricula || "Sem veículo"}
                {aluguer.veiculo?.modelo && (
                  <span className="text-muted-foreground font-normal"> · {aluguer.veiculo.marca} {aluguer.veiculo.modelo}</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {format(new Date(aluguer.created_at), "dd/MM/yyyy", { locale: pt })}
                {isRascunho && ` · Passo ${aluguer.rascunho_passo}/4`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", status.class)}>{status.label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isRascunho && (
                  <DropdownMenuItem onClick={onEdit} className="gap-2"><Pencil className="w-4 h-4" /> Continuar</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onView} className="gap-2"><Eye className="w-4 h-4" /> Ver detalhes</DropdownMenuItem>
                {isAtivo && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDevolver} className="gap-2 text-primary">
                      <PackageCheck className="w-4 h-4" /> Devolver veículo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onFinalizar} className="gap-2 text-success">
                      <CheckCircle2 className="w-4 h-4" /> Finalizar (sem devolução)
                    </DropdownMenuItem>
                  </>
                )}
                {!isFinalizado && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{aluguer.motorista?.nome_completo || "Sem motorista"}</span>
          </div>
          {ownerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{ownerName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {aluguer.data_inicio ? format(new Date(aluguer.data_inicio), "dd/MM/yyyy", { locale: pt }) : "—"}
              {" → "}
              {aluguer.data_fim ? format(new Date(aluguer.data_fim), "dd/MM/yyyy", { locale: pt }) :
                isFinalizado && aluguer.data_finalizacao ? format(new Date(aluguer.data_finalizacao), "dd/MM/yyyy", { locale: pt }) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {aluguer.contrato_aluguer_id && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Aluguer</span>}
            {aluguer.contrato_prestacao_id && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Prestação</span>}
            {aluguer.checklist_entrega_id && <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> Entrega</span>}
            {aluguer.checklist_devolucao_id && <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> Devolução</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Alugueres() {
  const { alugueres, isLoading, finalizarAluguer, removerAluguer } = useAlugueres();
  const [tab, setTab] = useState<StatusAluguer>("ativo");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAluguer, setEditingAluguer] = useState<Aluguer | null>(null);
  const [devolucaoAluguer, setDevolucaoAluguer] = useState<Aluguer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = alugueres.filter((a) => a.status === tab);
  const counts = {
    ativo: alugueres.filter((a) => a.status === "ativo").length,
    rascunho: alugueres.filter((a) => a.status === "rascunho").length,
    finalizado: alugueres.filter((a) => a.status === "finalizado").length,
  };

  const openCreate = () => {
    setEditingAluguer(null);
    setWizardOpen(true);
  };

  const openEdit = (a: Aluguer) => {
    setEditingAluguer(a);
    setWizardOpen(true);
  };

  return (
    <AppLayout title="Aluguer de Carro">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Aluguer de Carro</h1>
            <p className="text-muted-foreground">Gerir todo o processo de aluguer de veículos</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Criar novo aluguer
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusAluguer)}>
          <TabsList>
            <TabsTrigger value="ativo">Ativos {counts.ativo > 0 && <Badge className="ml-2" variant="secondary">{counts.ativo}</Badge>}</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunhos {counts.rascunho > 0 && <Badge className="ml-2" variant="secondary">{counts.rascunho}</Badge>}</TabsTrigger>
            <TabsTrigger value="finalizado">Finalizados {counts.finalizado > 0 && <Badge className="ml-2" variant="secondary">{counts.finalizado}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum aluguer {tab === "ativo" ? "ativo" : tab === "rascunho" ? "em rascunho" : "finalizado"}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((a) => (
                  <AluguerCard
                    key={a.id}
                    aluguer={a}
                    onEdit={() => openEdit(a)}
                    onView={() => openEdit(a)}
                    onFinalizar={() => finalizarAluguer.mutate(a.id)}
                    onDevolver={() => setDevolucaoAluguer(a)}
                    onDelete={() => setDeleteId(a.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AluguerWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialAluguer={editingAluguer}
      />

      <AluguerDevolucaoDialog
        open={!!devolucaoAluguer}
        onOpenChange={(o) => !o && setDevolucaoAluguer(null)}
        aluguer={devolucaoAluguer}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            removerAluguer.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        title="Eliminar aluguer"
        description="Esta ação irá remover o aluguer. Os contratos e check-list vinculados não serão eliminados."
      />
    </AppLayout>
  );
}
