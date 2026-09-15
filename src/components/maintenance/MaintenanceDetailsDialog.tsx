import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManutencaoGeral } from "@/hooks/useManutencaoGeral";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wrench,
  Car,
  Building2,
  Calendar,
  Gauge,
  FileText,
  Eye,
  Download,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MaintenanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencao: ManutencaoGeral | null;
}

export function MaintenanceDetailsDialog({
  open,
  onOpenChange,
  manutencao,
}: MaintenanceDetailsDialogProps) {
  const navigate = useNavigate();

  if (!manutencao) return null;

  const handleNavigateToOwner = () => {
    if (manutencao.proprietario?.id) {
      onOpenChange(false);
      navigate(`/owners?view=${manutencao.proprietario.id}`);
    }
  };

  const handleNavigateToVehicle = () => {
    if (manutencao.veiculo?.id) {
      onOpenChange(false);
      navigate(`/vehicles?view=${manutencao.veiculo.id}`);
    }
  };

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

  const handleView = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDownload = async (url: string, nome: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getTypeLabel = (tipo: string) => {
    const types: Record<string, string> = {
      orcamento: "Orçamento",
      fatura: "Fatura",
    };
    return types[tipo] || tipo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Detalhes da Manutenção
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Header Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{manutencao.tipo_servico}</h2>
                <p className="text-muted-foreground">
                  {format(new Date(manutencao.data_servico), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClickableInfoCard
                icon={<Building2 className="h-4 w-4" />}
                label="Proprietário"
                value={getOwnerName()}
                onClick={manutencao.proprietario?.id ? handleNavigateToOwner : undefined}
              />
              <ClickableInfoCard
                icon={<Car className="h-4 w-4" />}
                label="Veículo"
                value={getVehicleInfo()}
                onClick={manutencao.veiculo?.id ? handleNavigateToVehicle : undefined}
              />
              <InfoCard
                icon={<Gauge className="h-4 w-4" />}
                label="Quilometragem"
                value={manutencao.km ? `${manutencao.km.toLocaleString()} km` : "—"}
              />
              <InfoCard
                icon={<Calendar className="h-4 w-4" />}
                label="Data do Serviço"
                value={format(new Date(manutencao.data_servico), "dd/MM/yyyy")}
              />
              <InfoCard
                icon={<Calendar className="h-4 w-4" />}
                label="Km da Próxima Revisão"
                value={
                  manutencao.km_proxima_revisao
                    ? `${manutencao.km_proxima_revisao.toLocaleString()} km`
                    : "—"
                }
              />
              <InfoCard
                icon={<Gauge className="h-4 w-4" />}
                label="Valor da Reparação"
                value={
                  manutencao.valor
                    ? `€ ${manutencao.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
                    : "—"
                }
              />
            </div>

            {/* Observations */}
            {manutencao.observacoes && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Observações
                </h3>
                <p className="p-3 bg-muted/50 rounded-lg text-sm">
                  {manutencao.observacoes}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {manutencao.documentos && manutencao.documentos.length > 0 ? (
              <div className="space-y-2">
                {manutencao.documentos.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.nome}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {getTypeLabel(doc.tipo)}
                          </span>
                          <span>
                            {format(new Date(doc.uploaded_at), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(doc.url)}
                        title="Ver"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc.url, doc.nome)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento anexado</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ClickableInfoCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-3 border rounded-lg ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`font-medium ${onClick ? "text-primary hover:underline" : ""}`}>
        {value}
      </p>
    </div>
  );
}
