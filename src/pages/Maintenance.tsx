import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Wrench, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useManutencaoGeral,
  useDeleteManutencaoGeral,
  ManutencaoGeral,
} from "@/hooks/useManutencaoGeral";
import { MaintenanceCard } from "@/components/maintenance/MaintenanceCard";
import { MaintenanceFormDialog } from "@/components/maintenance/MaintenanceFormDialog";
import { MaintenanceDetailsDialog } from "@/components/maintenance/MaintenanceDetailsDialog";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";

export default function Maintenance() {
  const { data: manutencoes = [], isLoading } = useManutencaoGeral();
  const deleteMutation = useDeleteManutencaoGeral();

  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedManutencao, setSelectedManutencao] =
    useState<ManutencaoGeral | null>(null);

  const filteredManutencoes = manutencoes.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      m.tipo_servico.toLowerCase().includes(searchLower) ||
      m.veiculo?.matricula?.toLowerCase().includes(searchLower) ||
      m.proprietario?.nome_empresa?.toLowerCase().includes(searchLower) ||
      m.proprietario?.nome_completo?.toLowerCase().includes(searchLower)
    );
  });

  const handleNew = () => {
    setSelectedManutencao(null);
    setFormOpen(true);
  };

  const handleView = (manutencao: ManutencaoGeral) => {
    setSelectedManutencao(manutencao);
    setDetailsOpen(true);
  };

  const handleEdit = (manutencao: ManutencaoGeral) => {
    setSelectedManutencao(manutencao);
    setFormOpen(true);
  };

  const handleDeleteClick = (manutencao: ManutencaoGeral) => {
    setSelectedManutencao(manutencao);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedManutencao) {
      await deleteMutation.mutateAsync(selectedManutencao.id);
      setDeleteOpen(false);
      setSelectedManutencao(null);
    }
  };

  return (
    <AppLayout title="Manutenção">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manutenção</h1>
            <p className="text-muted-foreground">
              Gerencie as manutenções dos veículos
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Manutenção
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar manutenções..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">Todas ({filteredManutencoes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredManutencoes.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma manutenção encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando uma nova manutenção
                </p>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Manutenção
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredManutencoes.map((manutencao) => (
                  <MaintenanceCard
                    key={manutencao.id}
                    manutencao={manutencao}
                    onView={() => handleView(manutencao)}
                    onEdit={() => handleEdit(manutencao)}
                    onDelete={() => handleDeleteClick(manutencao)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <MaintenanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        manutencao={selectedManutencao}
      />

      <MaintenanceDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        manutencao={selectedManutencao}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Manutenção"
        description="Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita."
        isDeleting={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
