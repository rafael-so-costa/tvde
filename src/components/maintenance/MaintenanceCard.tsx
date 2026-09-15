import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/common/ActionMenu";
import { ManutencaoGeral } from "@/hooks/useManutencaoGeral";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wrench, Car, Building2, Calendar, Gauge } from "lucide-react";

interface MaintenanceCardProps {
  manutencao: ManutencaoGeral;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MaintenanceCard({
  manutencao,
  onView,
  onEdit,
  onDelete,
}: MaintenanceCardProps) {
  const getOwnerName = () => {
    if (!manutencao.proprietario) return "Sem proprietário";
    return manutencao.proprietario.tipo === "empresa"
      ? manutencao.proprietario.nome_empresa
      : manutencao.proprietario.nome_completo;
  };

  const getVehicleInfo = () => {
    if (!manutencao.veiculo) return "Sem veículo";
    return `${manutencao.veiculo.matricula} - ${manutencao.veiculo.marca || ""} ${manutencao.veiculo.modelo || ""}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{manutencao.tipo_servico}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Car className="h-4 w-4" />
                <span>{getVehicleInfo()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{getOwnerName()}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(manutencao.data_servico), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                {manutencao.km && (
                  <div className="flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    <span>{manutencao.km.toLocaleString()} km</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onView}>
              Ver Manutenção
            </Button>
            <ActionMenu
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              showToggle={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
