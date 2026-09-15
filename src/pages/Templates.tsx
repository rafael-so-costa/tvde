import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTemplatesContrato } from "@/hooks/useTemplatesContrato";
import { usePerfisTemplate, type PerfilTemplate } from "@/hooks/usePerfisTemplate";
import { TemplateUploadDialog } from "@/components/contracts/TemplateUploadDialog";
import { TemplateEditor } from "@/components/contracts/editor";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ContractTemplate } from "@/types/contract";
import {
  Plus,
  FileText,
  Search,
  Pencil,
  MoreVertical,
  Trash2,
  FileUp,
  Calendar,
  FolderOpen,
  ArrowLeft,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function CardSkeleton() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export default function Templates() {
  const [activePerfil, setActivePerfil] = useState<PerfilTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCreatePerfil, setShowCreatePerfil] = useState(false);
  const [novoPerfilNome, setNovoPerfilNome] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePerfilTarget, setDeletePerfilTarget] = useState<PerfilTemplate | null>(null);

  const { perfis, isLoading: perfisLoading, createPerfil, deletePerfil } = usePerfisTemplate();
  const { templates: allTemplates } = useTemplatesContrato();
  const { templates, isLoading: templatesLoading, deleteTemplate, updateTemplate } =
    useTemplatesContrato(activePerfil?.id);

  const countByPerfil = (perfilId: string) =>
    allTemplates.filter((t: any) => t.perfil_id === perfilId).length;

  const filteredPerfis = perfis.filter((p) =>
    !searchQuery || p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter((t) =>
    !searchQuery || t.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePerfil = async () => {
    if (!novoPerfilNome.trim()) {
      toast.error("Digite o nome do perfil");
      return;
    }
    try {
      await createPerfil.mutateAsync(novoPerfilNome);
      setNovoPerfilNome("");
      setShowCreatePerfil(false);
    } catch (e) {
      // toast já no hook
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePerfil = async () => {
    if (!deletePerfilTarget) return;
    if (countByPerfil(deletePerfilTarget.id) > 0) {
      toast.error("Este perfil ainda contém templates. Mova ou elimine-os antes.");
      setDeletePerfilTarget(null);
      return;
    }
    await deletePerfil.mutateAsync(deletePerfilTarget.id);
    setDeletePerfilTarget(null);
  };

  // Editor full-screen
  if (editingTemplate) {
    return (
      <div className="h-screen w-full fixed inset-0 z-50 bg-background">
        <TemplateEditor
          template={editingTemplate}
          onSave={async (data) => {
            await updateTemplate.mutateAsync({ id: data.id!, ...data });
          }}
          onClose={() => setEditingTemplate(null)}
        />
      </div>
    );
  }

  // === Vista DENTRO de um perfil ===
  if (activePerfil) {
    return (
      <AppLayout
        title={activePerfil.nome}
        subtitle="Templates dentro deste perfil"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActivePerfil(null);
                setSearchQuery("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Perfis
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Button className="btn-accent" onClick={() => setShowUpload(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            Importar Template
          </Button>
        </div>

        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template neste perfil</h3>
            <p className="text-muted-foreground mb-4">
              Importe um template para começar a usar este perfil.
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <FileUp className="w-4 h-4 mr-2" />
              Importar Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => (
              <div
                key={template.id}
                className="card-elevated p-6 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{template.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.tipo_arquivo?.toUpperCase() || "PDF"}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setEditingTemplate(template)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: template.id, name: template.nome })}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span className="font-medium">
                      {format(new Date(template.created_at), "dd/MM/yyyy", { locale: pt })}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {template.campos_detectados?.length || 0} campos editáveis
                  </Badge>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <TemplateUploadDialog
          open={showUpload}
          onOpenChange={setShowUpload}
          perfilId={activePerfil.id}
        />

        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={() => deleteTarget && handleDeleteTemplate(deleteTarget.id)}
          title="Excluir Template"
          description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        />
      </AppLayout>
    );
  }

  // === Vista de PERFIS ===
  return (
    <AppLayout
      title="Perfis de Templates"
      subtitle="Categorias de modelos de contrato"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar perfis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button className="btn-accent" onClick={() => setShowCreatePerfil(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar novo perfil
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total de Perfis</p>
          <p className="text-2xl font-bold">{perfis.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total de Templates</p>
          <p className="text-2xl font-bold">{allTemplates.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Sem categoria</p>
          <p className="text-2xl font-bold">
            {allTemplates.filter((t: any) => !t.perfil_id).length}
          </p>
        </div>
      </div>

      {perfisLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredPerfis.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum perfil encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie um perfil para organizar os seus templates por categoria.
          </p>
          <Button onClick={() => setShowCreatePerfil(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar novo perfil
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPerfis.map((perfil, index) => {
            const total = countByPerfil(perfil.id);
            return (
              <div
                key={perfil.id}
                className="card-elevated p-6 cursor-pointer hover:border-primary/50 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setActivePerfil(perfil)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{perfil.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {total} {total === 1 ? "template" : "templates"}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={() => setActivePerfil(perfil)}
                        className="gap-2"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Abrir
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletePerfilTarget(perfil)}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir perfil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {perfil.descricao && (
                  <p className="text-sm text-muted-foreground mb-3">{perfil.descricao}</p>
                )}

                <div className="flex gap-2 mt-2 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Abrir perfil
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Criar Perfil */}
      <Dialog open={showCreatePerfil} onOpenChange={setShowCreatePerfil}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo perfil</DialogTitle>
            <DialogDescription>
              Os perfis ajudam a organizar templates por categoria de contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="perfil-nome">Nome do perfil</Label>
            <Input
              id="perfil-nome"
              value={novoPerfilNome}
              onChange={(e) => setNovoPerfilNome(e.target.value)}
              placeholder="Ex: ALUGUER DE VEÍCULOS"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreatePerfil();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePerfil(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePerfil} disabled={createPerfil.isPending}>
              Criar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletePerfilTarget}
        onOpenChange={(open) => !open && setDeletePerfilTarget(null)}
        onConfirm={handleDeletePerfil}
        title="Excluir Perfil"
        description={`Tem certeza que deseja excluir o perfil "${deletePerfilTarget?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </AppLayout>
  );
}
