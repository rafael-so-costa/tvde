import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useTenant } from "@/contexts/TenantContext";
import {
  useCreateManutencaoGeral,
  useUpdateManutencaoGeral,
  ManutencaoGeral,
} from "@/hooks/useManutencaoGeral";
import {
  MaintenanceDocumentUpload,
  MaintenanceDocument,
} from "./MaintenanceDocumentUpload";
import { Loader2 } from "lucide-react";

const TIPOS_SERVICO = [
  "Revisão Básica",
  "Revisão Completa",
  "Troca de Óleo",
  "Troca de Pneus",
  "Alinhamento e Balanceamento",
  "Freios",
  "Suspensão",
  "Sistema Elétrico",
  "Ar Condicionado",
  "Motor",
  "Transmissão",
  "Outro",
];

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencao?: ManutencaoGeral | null;
}

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  manutencao,
}: MaintenanceFormDialogProps) {
  const { tenant } = useTenant();
  const { data: proprietarios = [] } = useProprietarios();
  const { data: veiculos = [] } = useVeiculos();
  const createMutation = useCreateManutencaoGeral();
  const updateMutation = useUpdateManutencaoGeral();

  const [formData, setFormData] = useState({
    proprietario_id: "",
    veiculo_id: "",
    km: "",
    data_servico: "",
    tipo_servico: "",
    km_proxima_revisao: "",
    valor: "",
    observacoes: "",
  });
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);

  const isEditing = !!manutencao;

  useEffect(() => {
    if (manutencao) {
      setFormData({
        proprietario_id: manutencao.proprietario_id || "",
        veiculo_id: manutencao.veiculo_id || "",
        km: manutencao.km?.toString() || "",
        data_servico: manutencao.data_servico || "",
        tipo_servico: manutencao.tipo_servico || "",
        km_proxima_revisao: manutencao.km_proxima_revisao?.toString() || "",
        valor: manutencao.valor?.toString() || "",
        observacoes: manutencao.observacoes || "",
      });
      setDocuments(manutencao.documentos || []);
    } else {
      setFormData({
        proprietario_id: "",
        veiculo_id: "",
        km: "",
        data_servico: "",
        tipo_servico: "",
        km_proxima_revisao: "",
        valor: "",
        observacoes: "",
      });
      setDocuments([]);
    }
  }, [manutencao, open]);

  // Filter vehicles by selected proprietario
  const filteredVeiculos = formData.proprietario_id
    ? veiculos.filter((v) => v.proprietario_id === formData.proprietario_id)
    : veiculos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    const payload = {
      tenant_id: tenant.id,
      proprietario_id: formData.proprietario_id || null,
      veiculo_id: formData.veiculo_id,
      km: formData.km ? parseInt(formData.km) : null,
      data_servico: formData.data_servico,
      tipo_servico: formData.tipo_servico,
      km_proxima_revisao: formData.km_proxima_revisao ? parseInt(formData.km_proxima_revisao) : null,
      valor: formData.valor ? parseFloat(formData.valor) : null,
      observacoes: formData.observacoes || null,
      documentos: documents,
    };

    try {
      if (isEditing && manutencao) {
        await updateMutation.mutateAsync({ id: manutencao.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving maintenance:", error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Manutenção" : "Nova Manutenção"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proprietario">Proprietário</Label>
              <Select
                value={formData.proprietario_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    proprietario_id: value,
                    veiculo_id: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o proprietário" />
                </SelectTrigger>
                <SelectContent>
                  {proprietarios
                    .filter((p) => p.ativo)
                    .map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.tipo === "empresa"
                          ? prop.nome_empresa
                          : prop.nome_completo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="veiculo">Veículo *</Label>
              <Select
                value={formData.veiculo_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, veiculo_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVeiculos
                    .filter((v) => v.ativo)
                    .map((veiculo) => (
                      <SelectItem key={veiculo.id} value={veiculo.id}>
                        {veiculo.matricula} - {veiculo.marca} {veiculo.modelo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="km">KM</Label>
              <Input
                id="km"
                type="number"
                value={formData.km}
                onChange={(e) =>
                  setFormData({ ...formData, km: e.target.value })
                }
                placeholder="Ex: 50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_servico">Data do Serviço *</Label>
              <Input
                id="data_servico"
                type="date"
                value={formData.data_servico}
                onChange={(e) =>
                  setFormData({ ...formData, data_servico: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_servico">Tipo do Serviço *</Label>
              <Select
                value={formData.tipo_servico}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_servico: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor da Reparação (€)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) =>
                  setFormData({ ...formData, valor: e.target.value })
                }
                placeholder="Ex: 150.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_proxima_revisao">Km da Próxima Revisão</Label>
              <Input
                id="km_proxima_revisao"
                type="number"
                value={formData.km_proxima_revisao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    km_proxima_revisao: e.target.value,
                  })
                }
                placeholder="Ex: 60000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Observações sobre a manutenção..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <MaintenanceDocumentUpload
              documents={documents}
              onDocumentsChange={setDocuments}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Manutenção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
