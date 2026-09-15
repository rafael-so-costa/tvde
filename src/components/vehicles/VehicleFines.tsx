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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle, CheckCircle, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleFine, mockFines } from "@/types/vehicle";

interface VehicleFinesProps {
  vehicleId: string;
}

const fineTypeLabels = {
  speeding: "Excesso de Velocidade",
  parking: "Estacionamento",
  red_light: "Avanço de Sinal",
  other: "Outro",
};

const statusConfig = {
  pending: { label: "Pendente", class: "badge-warning", icon: Clock },
  paid: { label: "Pago", class: "badge-success", icon: CheckCircle },
  contested: { label: "Contestado", class: "badge-destructive", icon: AlertTriangle },
};

export function VehicleFines({ vehicleId }: VehicleFinesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [fines] = useState<VehicleFine[]>(
    mockFines.filter((f) => f.vehicleId === vehicleId)
  );

  const [newFine, setNewFine] = useState({
    driverName: "",
    date: "",
    location: "",
    description: "",
    amount: "",
    type: "other" as VehicleFine["type"],
    notificationNumber: "",
  });

  const handleAddFine = () => {
    // Here you would add the fine to the database
    console.log("Adding fine:", newFine);
    setIsAddDialogOpen(false);
    setNewFine({
      driverName: "",
      date: "",
      location: "",
      description: "",
      amount: "",
      type: "other",
      notificationNumber: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Multas e Infrações</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-accent">
              <Plus className="w-4 h-4 mr-2" />
              Nova Multa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nova Multa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notificationNumber">Nº Notificação</Label>
                  <Input
                    id="notificationNumber"
                    value={newFine.notificationNumber}
                    onChange={(e) =>
                      setNewFine({ ...newFine, notificationNumber: e.target.value })
                    }
                    placeholder="NOT-2024-XXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fineDate">Data da Infração</Label>
                  <Input
                    id="fineDate"
                    type="date"
                    value={newFine.date}
                    onChange={(e) =>
                      setNewFine({ ...newFine, date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Motorista</Label>
                <Select
                  value={newFine.driverName}
                  onValueChange={(value) =>
                    setNewFine({ ...newFine, driverName: value })
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fineType">Tipo de Infração</Label>
                  <Select
                    value={newFine.type}
                    onValueChange={(value) =>
                      setNewFine({ ...newFine, type: value as VehicleFine["type"] })
                    }
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
                  <Label htmlFor="amount">Valor (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newFine.amount}
                    onChange={(e) =>
                      setNewFine({ ...newFine, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local da Infração</Label>
                <Input
                  id="location"
                  value={newFine.location}
                  onChange={(e) =>
                    setNewFine({ ...newFine, location: e.target.value })
                  }
                  placeholder="Ex: A1, km 45"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newFine.description}
                  onChange={(e) =>
                    setNewFine({ ...newFine, description: e.target.value })
                  }
                  placeholder="Detalhes da infração..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1 btn-primary" onClick={handleAddFine}>
                  Registrar Multa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {fines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma multa registrada para este veículo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fines.map((fine) => {
            const status = statusConfig[fine.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={fine.id}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{fineTypeLabels[fine.type]}</p>
                    <p className="text-sm text-muted-foreground">
                      {fine.notificationNumber}
                    </p>
                  </div>
                  <span className={status.class}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <span className="text-muted-foreground">Motorista: </span>
                    <span className="font-medium">{fine.driverName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data: </span>
                    <span className="font-medium">
                      {new Date(fine.date).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Local: </span>
                    <span className="font-medium">{fine.location}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor: </span>
                    <span className="font-medium text-destructive">
                      €{fine.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{fine.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
