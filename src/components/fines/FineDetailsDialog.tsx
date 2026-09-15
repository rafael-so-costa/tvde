import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Receipt, Clock, CheckCircle, AlertTriangle, Car, User, 
  MapPin, Calendar, FileText, Download, Eye, ExternalLink, Upload, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentUploadSection, UploadedDocument } from "@/components/common/DocumentUploadSection";
import { useUpdateFine } from "@/hooks/useFinesAndClaims";

const fineTypeLabels: Record<string, string> = {
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

const FINE_DOCUMENT_TYPES = [
  "Comprovativo de Transferência para o Motorista",
  "Folha da Multa",
  "Comprovativo de Envio pelo Correio",
];

interface FineDetailsDialogProps {
  fine: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

export function FineDetailsDialog({ fine, open, onOpenChange, readOnly = false }: FineDetailsDialogProps) {
  const navigate = useNavigate();
  const updateFine = useUpdateFine();
  const [activeTab, setActiveTab] = useState("details");
  
  // Documents state
  const existingDocs = (fine?.documentos || []).map((doc: any) => ({
    tipo: doc.tipo,
    nome_arquivo: doc.nome_arquivo,
    url: doc.url,
  }));
  const [documents, setDocuments] = useState<UploadedDocument[]>(existingDocs);
  const [hasChanges, setHasChanges] = useState(false);

  if (!fine) return null;

  const status = statusConfig[fine.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleNavigateToVehicle = () => {
    if (fine.veiculo?.id) {
      onOpenChange(false);
      navigate(`/vehicles?view=${fine.veiculo.id}`);
    }
  };

  const handleNavigateToDriver = () => {
    if (fine.motorista?.id) {
      onOpenChange(false);
      navigate(`/drivers?view=${fine.motorista.id}`);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDocumentsChange = (newDocs: UploadedDocument[]) => {
    setDocuments(newDocs);
    setHasChanges(true);
  };

  const handleSaveDocuments = () => {
    updateFine.mutate({
      id: fine.id,
      data: {
        documentos: documents,
      },
    }, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  // Parse documents if stored as JSON
  const currentDocuments = fine.documentos || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <span className="text-xl">{fineTypeLabels[fine.tipo] || fine.tipo}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {fine.numero_notificacao || "Sem número de notificação"}
              </p>
            </div>
            <Badge className={cn("ml-auto", status.class)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="documents">
              Documentos ({currentDocuments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 pt-4">
            {/* Basic Info */}
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informações da Multa
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Nº Notificação" value={fine.numero_notificacao || "-"} />
                <InfoItem 
                  label="Data da Infração" 
                  value={fine.data_multa ? new Date(fine.data_multa).toLocaleDateString("pt-PT") : "-"} 
                  icon={<Calendar className="w-4 h-4" />}
                />
                <InfoItem label="Tipo" value={fineTypeLabels[fine.tipo] || fine.tipo} />
                <InfoItem 
                  label="Valor" 
                  value={`€${Number(fine.valor).toFixed(2)}`} 
                  className="text-destructive font-semibold"
                />
              </div>
            </div>

            {/* Vehicle & Driver */}
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Car className="w-4 h-4" />
                Veículo e Motorista
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={cn(
                    "p-3 bg-background rounded-lg",
                    fine.veiculo?.id && "cursor-pointer hover:bg-accent transition-colors group"
                  )}
                  onClick={handleNavigateToVehicle}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Veículo</span>
                    </div>
                    {fine.veiculo?.id && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="font-medium mt-1">
                    {fine.veiculo ? `${fine.veiculo.matricula} - ${fine.veiculo.marca} ${fine.veiculo.modelo}` : "-"}
                  </p>
                </div>
                <div 
                  className={cn(
                    "p-3 bg-background rounded-lg",
                    fine.motorista?.id && "cursor-pointer hover:bg-accent transition-colors group"
                  )}
                  onClick={handleNavigateToDriver}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Motorista</span>
                    </div>
                    {fine.motorista?.id && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="font-medium mt-1">{fine.motorista?.nome_completo || "-"}</p>
                </div>
              </div>
            </div>

            {/* Location & Description */}
            {(fine.localizacao || fine.descricao) && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Detalhes Adicionais
                </h4>
                {fine.localizacao && (
                  <div>
                    <span className="text-sm text-muted-foreground">Local da Infração</span>
                    <p className="font-medium">{fine.localizacao}</p>
                  </div>
                )}
                {fine.descricao && (
                  <div>
                    <span className="text-sm text-muted-foreground">Descrição</span>
                    <p className="mt-1">{fine.descricao}</p>
                  </div>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground text-right space-y-1">
              {fine.created_at && (
                <p>Criado em: {new Date(fine.created_at).toLocaleString("pt-PT")}</p>
              )}
              {fine.updated_at && fine.updated_at !== fine.created_at && (
                <p>Atualizado em: {new Date(fine.updated_at).toLocaleString("pt-PT")}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 pt-4">
            {/* Existing Documents */}
            {currentDocuments.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos Atuais ({currentDocuments.length})
                </h4>
                <div className="space-y-2">
                  {currentDocuments.map((doc: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <Badge variant="secondary" className="mb-1">{doc.tipo}</Badge>
                          <p className="text-sm text-muted-foreground truncate">{doc.nome_arquivo}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handlePreview(doc.url)}
                          title="Pré-visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownload(doc.url, doc.nome_arquivo)}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Documents - only shown when not readOnly */}
            {!readOnly && (
              <>
                <DocumentUploadSection
                  title="Adicionar Documentos"
                  predefinedTypes={FINE_DOCUMENT_TYPES}
                  documents={documents}
                  onDocumentsChange={handleDocumentsChange}
                  bucket="documents"
                  folder="multas"
                />

                {hasChanges && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveDocuments}
                      disabled={updateFine.isPending}
                    >
                      {updateFine.isPending ? "Salvando..." : "Salvar Documentos"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ 
  label, 
  value, 
  icon, 
  className 
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn("font-medium", className)}>{value}</p>
    </div>
  );
}
