import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, CheckCircle, Clock, Car, Calendar, Shield, FileText, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleClaim, mockClaims } from "@/types/vehicle";

interface VehicleClaimsProps {
  vehicleId: string;
}

const statusConfig = {
  open: { label: "Aberto", class: "badge-warning", icon: Clock },
  in_progress: { label: "Em Andamento", class: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: AlertTriangle },
  closed: { label: "Encerrado", class: "badge-success", icon: CheckCircle },
};

export function VehicleClaims({ vehicleId }: VehicleClaimsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [claims] = useState<VehicleClaim[]>(
    mockClaims.filter((c) => c.vehicleId === vehicleId)
  );

  const [newClaim, setNewClaim] = useState({
    driverName: "",
    accidentDate: "",
    expertiseDate: "",
    expertiseDone: false,
    insuranceCompany: "",
    policyNumber: "",
    processNumber: "",
    damagedItems: [] as string[],
    description: "",
    newDamagedItem: "",
  });

  const handleAddDamagedItem = () => {
    if (newClaim.newDamagedItem.trim()) {
      setNewClaim({
        ...newClaim,
        damagedItems: [...newClaim.damagedItems, newClaim.newDamagedItem.trim()],
        newDamagedItem: "",
      });
    }
  };

  const handleRemoveDamagedItem = (index: number) => {
    setNewClaim({
      ...newClaim,
      damagedItems: newClaim.damagedItems.filter((_, i) => i !== index),
    });
  };

  const handleAddClaim = () => {
    // Here you would add the claim to the database
    console.log("Adding claim:", newClaim);
    setIsAddDialogOpen(false);
    setNewClaim({
      driverName: "",
      accidentDate: "",
      expertiseDate: "",
      expertiseDone: false,
      insuranceCompany: "",
      policyNumber: "",
      processNumber: "",
      damagedItems: [],
      description: "",
      newDamagedItem: "",
    });
  };

  const isExpertisePending = (claim: VehicleClaim) => {
    if (claim.expertiseDone) return false;
    if (!claim.expertiseDate) return false;
    const expertiseDate = new Date(claim.expertiseDate);
    const today = new Date();
    return expertiseDate >= today;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestão de Sinistros</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-accent">
              <Plus className="w-4 h-4 mr-2" />
              Novo Sinistro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Novo Sinistro</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Identification Header */}
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Identificação do Sinistro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driverName">Motorista</Label>
                    <Select
                      value={newClaim.driverName}
                      onValueChange={(value) =>
                        setNewClaim({ ...newClaim, driverName: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manuel Silva">Manuel Silva</SelectItem>
                        <SelectItem value="Ana Costa">Ana Costa</SelectItem>
                        <SelectItem value="Pedro Santos">Pedro Santos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accidentDate">Data do Sinistro</Label>
                    <Input
                      id="accidentDate"
                      type="date"
                      value={newClaim.accidentDate}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, accidentDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Expertise/Survey */}
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Peritagem
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expertiseDate">Data da Peritagem</Label>
                    <Input
                      id="expertiseDate"
                      type="date"
                      value={newClaim.expertiseDate}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, expertiseDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="expertiseDone"
                      checked={newClaim.expertiseDone}
                      onCheckedChange={(checked) =>
                        setNewClaim({ ...newClaim, expertiseDone: checked as boolean })
                      }
                    />
                    <Label htmlFor="expertiseDone" className="cursor-pointer">
                      Peritagem realizada
                    </Label>
                  </div>
                </div>
              </div>

              {/* Insurance Info */}
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Dados do Seguro
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceCompany">Seguradora</Label>
                    <Input
                      id="insuranceCompany"
                      value={newClaim.insuranceCompany}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, insuranceCompany: e.target.value })
                      }
                      placeholder="Ex: Fidelidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyNumber">Nº Apólice</Label>
                    <Input
                      id="policyNumber"
                      value={newClaim.policyNumber}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, policyNumber: e.target.value })
                      }
                      placeholder="POL-XXXX-XXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="processNumber">Nº Processo</Label>
                    <Input
                      id="processNumber"
                      value={newClaim.processNumber}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, processNumber: e.target.value })
                      }
                      placeholder="PROC-XXXX-XXX"
                    />
                  </div>
                </div>
              </div>

              {/* Damaged Items */}
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Itens Danificados
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={newClaim.newDamagedItem}
                    onChange={(e) =>
                      setNewClaim({ ...newClaim, newDamagedItem: e.target.value })
                    }
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
                {newClaim.damagedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newClaim.damagedItems.map((item, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
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
                <Label htmlFor="description">Descrição do Sinistro</Label>
                <Textarea
                  id="description"
                  value={newClaim.description}
                  onChange={(e) =>
                    setNewClaim({ ...newClaim, description: e.target.value })
                  }
                  placeholder="Descreva o acidente ou danos ocorridos..."
                  rows={4}
                />
              </div>

              {/* Photo Upload Placeholder */}
              <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste fotos ou clique para fazer upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (Fotos, boletins de ocorrência, orçamentos)
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1 btn-primary" onClick={handleAddClaim}>
                  Registrar Sinistro
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum sinistro registrado para este veículo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const status = statusConfig[claim.status];
            const StatusIcon = status.icon;
            const hasPendingExpertise = isExpertisePending(claim);

            return (
              <div
                key={claim.id}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg">
                      Processo: {claim.processNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {claim.insuranceCompany} • Apólice: {claim.policyNumber}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", status.class)}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {status.label}
                    </span>
                    {hasPendingExpertise && (
                      <span className="badge-warning text-xs">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Peritagem: {new Date(claim.expertiseDate!).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                    {claim.expertiseDone && (
                      <span className="badge-success text-xs">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Peritagem Concluída
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Motorista</span>
                    <span className="font-medium">{claim.driverName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Data do Sinistro</span>
                    <span className="font-medium">
                      {new Date(claim.accidentDate).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Seguradora</span>
                    <span className="font-medium">{claim.insuranceCompany}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Nº Apólice</span>
                    <span className="font-medium">{claim.policyNumber}</span>
                  </div>
                </div>

                {/* Damaged Items */}
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground block mb-2">
                    Itens Danificados:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {claim.damagedItems.map((item, index) => (
                      <Badge key={index} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">{claim.description}</p>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-1" />
                    Fotos
                  </Button>
                  {!claim.expertiseDone && claim.expertiseDate && (
                    <Button variant="outline" size="sm" className="text-success border-success hover:bg-success/10">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Marcar Peritagem Feita
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
