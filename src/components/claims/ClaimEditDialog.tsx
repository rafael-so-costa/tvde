import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { FileText, CarFront, Calendar, Shield, Car, X, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useUpdateClaim } from "@/hooks/useFinesAndClaims";

interface ClaimEditDialogProps {
  claim: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimEditDialog({ claim, open, onOpenChange }: ClaimEditDialogProps) {
  const { tenant } = useTenant();
  const updateClaim = useUpdateClaim();
  
  const [formData, setFormData] = useState({
    veiculo_id: claim?.veiculo_id || "",
    motorista_id: claim?.motorista_id || "",
    data_sinistro: claim?.data_sinistro || "",
    data_peritagem: claim?.data_peritagem || "",
    peritagem_realizada: claim?.peritagem_realizada || false,
    seguradora: claim?.seguradora || "",
    apolice: claim?.apolice || "",
    numero_processo: claim?.numero_processo || "",
    itens_danificados: (claim?.itens_danificados as string[]) || [],
    descricao: claim?.descricao || "",
    status: claim?.status || "open",
    newDamagedItem: "",
    teve_testemunha: claim?.teve_testemunha || false,
    nome_testemunha: claim?.nome_testemunha || "",
    telemovel_testemunha: claim?.telemovel_testemunha || "",
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

  const handleAddDamagedItem = () => {
    if (formData.newDamagedItem.trim()) {
      setFormData({
        ...formData,
        itens_danificados: [...formData.itens_danificados, formData.newDamagedItem.trim()],
        newDamagedItem: "",
      });
    }
  };

  const handleRemoveDamagedItem = (index: number) => {
    setFormData({
      ...formData,
      itens_danificados: formData.itens_danificados.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.veiculo_id || !formData.data_sinistro) {
      return;
    }
    
    updateClaim.mutate({
      id: claim.id,
      data: {
        veiculo_id: formData.veiculo_id,
        motorista_id: formData.motorista_id || null,
        data_sinistro: formData.data_sinistro,
        data_peritagem: formData.data_peritagem || null,
        peritagem_realizada: formData.peritagem_realizada,
        seguradora: formData.seguradora || null,
        apolice: formData.apolice || null,
        numero_processo: formData.numero_processo || null,
        itens_danificados: formData.itens_danificados,
        descricao: formData.descricao || null,
        status: formData.status,
        teve_testemunha: formData.teve_testemunha,
        nome_testemunha: formData.teve_testemunha ? formData.nome_testemunha || null : null,
        telemovel_testemunha: formData.teve_testemunha ? formData.telemovel_testemunha || null : null,
      },
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  // Update form data when claim changes
  if (claim && formData.veiculo_id !== claim.veiculo_id) {
    setFormData({
      veiculo_id: claim.veiculo_id || "",
      motorista_id: claim.motorista_id || "",
      data_sinistro: claim.data_sinistro || "",
      data_peritagem: claim.data_peritagem || "",
      peritagem_realizada: claim.peritagem_realizada || false,
      seguradora: claim.seguradora || "",
      apolice: claim.apolice || "",
      numero_processo: claim.numero_processo || "",
      itens_danificados: (claim.itens_danificados as string[]) || [],
      descricao: claim.descricao || "",
      status: claim.status || "open",
      newDamagedItem: "",
      teve_testemunha: claim.teve_testemunha || false,
      nome_testemunha: claim.nome_testemunha || "",
      telemovel_testemunha: claim.telemovel_testemunha || "",
    });
  }

  if (!claim) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CarFront className="w-5 h-5" />
            Editar Sinistro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Identification */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Identificação do Sinistro
            </h4>
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
                <Label>Data do Sinistro *</Label>
                <Input
                  type="date"
                  value={formData.data_sinistro}
                  onChange={(e) => setFormData({ ...formData, data_sinistro: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="closed">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Peritagem
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Peritagem</Label>
                <Input
                  type="date"
                  value={formData.data_peritagem}
                  onChange={(e) => setFormData({ ...formData, data_peritagem: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="expertiseDone"
                  checked={formData.peritagem_realizada}
                  onCheckedChange={(checked) => setFormData({ ...formData, peritagem_realizada: checked as boolean })}
                />
                <Label htmlFor="expertiseDone" className="cursor-pointer">
                  Peritagem realizada
                </Label>
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Dados do Seguro
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Seguradora</Label>
                <Input
                  value={formData.seguradora}
                  onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                  placeholder="Ex: Fidelidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Nº Apólice</Label>
                <Input
                  value={formData.apolice}
                  onChange={(e) => setFormData({ ...formData, apolice: e.target.value })}
                  placeholder="POL-XXXX-XXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Nº Processo</Label>
                <Input
                  value={formData.numero_processo}
                  onChange={(e) => setFormData({ ...formData, numero_processo: e.target.value })}
                  placeholder="PROC-XXXX-XXX"
                />
              </div>
            </div>
          </div>

          {/* Witness Information */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Testemunha
            </h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="teveTestemunhaEdit"
                checked={formData.teve_testemunha}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, teve_testemunha: checked as boolean })
                }
              />
              <Label htmlFor="teveTestemunhaEdit" className="cursor-pointer">
                Teve testemunha?
              </Label>
            </div>
            {formData.teve_testemunha && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Testemunha</Label>
                  <Input
                    value={formData.nome_testemunha}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_testemunha: e.target.value })
                    }
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telemóvel da Testemunha</Label>
                  <Input
                    value={formData.telemovel_testemunha}
                    onChange={(e) =>
                      setFormData({ ...formData, telemovel_testemunha: e.target.value })
                    }
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Damaged Items */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Car className="w-4 h-4" />
              Itens Danificados
            </h4>
            <div className="flex gap-2">
              <Input
                value={formData.newDamagedItem}
                onChange={(e) => setFormData({ ...formData, newDamagedItem: e.target.value })}
                placeholder="Ex: Para-choques dianteiro"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDamagedItem();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddDamagedItem}>
                Adicionar
              </Button>
            </div>
            {formData.itens_danificados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.itens_danificados.map((item, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveDamagedItem(index)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição do Sinistro</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o acidente ou danos ocorridos..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 btn-primary" 
              onClick={handleSubmit}
              disabled={updateClaim.isPending}
            >
              {updateClaim.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
