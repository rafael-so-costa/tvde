import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useUpdateFine } from "@/hooks/useFinesAndClaims";

interface FineEditDialogProps {
  fine: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FineEditDialog({ fine, open, onOpenChange }: FineEditDialogProps) {
  const { tenant } = useTenant();
  const updateFine = useUpdateFine();
  
  const [formData, setFormData] = useState({
    veiculo_id: fine?.veiculo_id || "",
    motorista_id: fine?.motorista_id || "",
    data_multa: fine?.data_multa || "",
    localizacao: fine?.localizacao || "",
    descricao: fine?.descricao || "",
    valor: fine?.valor?.toString() || "",
    tipo: fine?.tipo || "other",
    numero_notificacao: fine?.numero_notificacao || "",
    status: fine?.status || "pending",
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, matricula, marca, modelo")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome_completo")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && open,
  });

  const handleSubmit = () => {
    if (!formData.veiculo_id || !formData.data_multa || !formData.valor) {
      return;
    }
    
    updateFine.mutate({
      id: fine.id,
      data: {
        veiculo_id: formData.veiculo_id,
        motorista_id: formData.motorista_id || null,
        data_multa: formData.data_multa,
        localizacao: formData.localizacao || null,
        descricao: formData.descricao || null,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        numero_notificacao: formData.numero_notificacao || null,
        status: formData.status,
      },
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  // Update form data when fine changes
  if (fine && formData.veiculo_id !== fine.veiculo_id) {
    setFormData({
      veiculo_id: fine.veiculo_id || "",
      motorista_id: fine.motorista_id || "",
      data_multa: fine.data_multa || "",
      localizacao: fine.localizacao || "",
      descricao: fine.descricao || "",
      valor: fine.valor?.toString() || "",
      tipo: fine.tipo || "other",
      numero_notificacao: fine.numero_notificacao || "",
      status: fine.status || "pending",
    });
  }

  if (!fine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Editar Multa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Identification */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Identificação da Multa
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Notificação</Label>
                <Input
                  value={formData.numero_notificacao}
                  onChange={(e) => setFormData({ ...formData, numero_notificacao: e.target.value })}
                  placeholder="NOT-2024-XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Infração *</Label>
                <Input
                  type="date"
                  value={formData.data_multa}
                  onChange={(e) => setFormData({ ...formData, data_multa: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select
                  value={formData.veiculo_id}
                  onValueChange={(value) => setFormData({ ...formData, veiculo_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.matricula} - {v.marca} {v.modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select
                  value={formData.motorista_id}
                  onValueChange={(value) => setFormData({ ...formData, motorista_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Detalhes da Infração
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Infração</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="speeding">Excesso de Velocidade</SelectItem>
                    <SelectItem value="parking">Estacionamento</SelectItem>
                    <SelectItem value="red_light">Avanço de Sinal</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="contested">Contestado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local da Infração</Label>
              <Input
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                placeholder="Ex: A1, km 45"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes da infração..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 btn-primary" 
              onClick={handleSubmit}
              disabled={updateFine.isPending}
            >
              {updateFine.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
