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
  AlertTriangle, CheckCircle, Clock, Car, User, Calendar, Shield, 
  FileText, Download, Eye, ExternalLink, Wrench, CarFront, Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentUploadSection, UploadedDocument } from "@/components/common/DocumentUploadSection";
import { useUpdateClaim } from "@/hooks/useFinesAndClaims";

const statusConfig = {
  open: { label: "Aberto", class: "badge-warning", icon: Clock },
  in_progress: { label: "Em Andamento", class: "bg-info/20 text-info border-info/30", icon: AlertTriangle },
  closed: { label: "Encerrado", class: "badge-success", icon: CheckCircle },
};

const CLAIM_DOCUMENT_TYPES = [
  "Declaração Amigável",
  "Folha de Peritagem",
  "Fotos do Acidente",
];

interface ClaimDetailsDialogProps {
  claim: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

export function ClaimDetailsDialog({ claim, open, onOpenChange, readOnly = false }: ClaimDetailsDialogProps) {
  const navigate = useNavigate();
  const updateClaim = useUpdateClaim();
  const [activeTab, setActiveTab] = useState("details");
  
  // Documents state
  const existingDocs = (claim?.documentos || []).map((doc: any) => ({
    tipo: doc.tipo,
    nome_arquivo: doc.nome_arquivo,
    url: doc.url,
  }));
  const [documents, setDocuments] = useState<UploadedDocument[]>(existingDocs);
  const [hasChanges, setHasChanges] = useState(false);

  if (!claim) return null;

  const status = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.open;
  const StatusIcon = status.icon;

  const handleNavigateToVehicle = () => {
    if (claim.veiculo?.id) {
      onOpenChange(false);
      navigate(`/vehicles?view=${claim.veiculo.id}`);
    }
  };

  const handleNavigateToDriver = () => {
    if (claim.motorista?.id) {
      onOpenChange(false);
      navigate(`/drivers?view=${claim.motorista.id}`);
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
    updateClaim.mutate({
      id: claim.id,
      data: {
        documentos: documents,
      },
    }, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  // Parse documents and damaged items
  const currentDocuments = claim.documentos || [];
  const damagedItems = (claim.itens_danificados as string[]) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <CarFront className="w-6 h-6 text-warning" />
            </div>
            <div>
              <span className="text-xl">Sinistro</span>
              <p className="text-sm font-normal text-muted-foreground">
                {claim.numero_processo || "Sem número de processo"}
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
                Informações do Sinistro
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Nº Processo" value={claim.numero_processo || "-"} />
                <InfoItem 
                  label="Data do Sinistro" 
                  value={claim.data_sinistro ? new Date(claim.data_sinistro).toLocaleDateString("pt-PT") : "-"} 
                  icon={<Calendar className="w-4 h-4" />}
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
                    claim.veiculo?.id && "cursor-pointer hover:bg-accent transition-colors group"
                  )}
                  onClick={handleNavigateToVehicle}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Veículo</span>
                    </div>
                    {claim.veiculo?.id && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="font-medium mt-1">
                    {claim.veiculo ? `${claim.veiculo.matricula} - ${claim.veiculo.marca} ${claim.veiculo.modelo}` : "-"}
                  </p>
                </div>
                <div 
                  className={cn(
                    "p-3 bg-background rounded-lg",
                    claim.motorista?.id && "cursor-pointer hover:bg-accent transition-colors group"
                  )}
                  onClick={handleNavigateToDriver}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Motorista</span>
                    </div>
                    {claim.motorista?.id && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="font-medium mt-1">{claim.motorista?.nome_completo || "-"}</p>
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
                <InfoItem 
                  label="Data da Peritagem" 
                  value={claim.data_peritagem ? new Date(claim.data_peritagem).toLocaleDateString("pt-PT") : "Não agendada"} 
                />
                <div>
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <div className="mt-1">
                    {claim.peritagem_realizada ? (
                      <Badge className="badge-success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Realizada
                      </Badge>
                    ) : claim.data_peritagem ? (
                      <Badge className="badge-warning">
                        <Clock className="w-3 h-3 mr-1" />
                        Agendada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            {(claim.seguradora || claim.apolice) && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Dados do Seguro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Seguradora" value={claim.seguradora || "-"} />
                  <InfoItem label="Nº Apólice" value={claim.apolice || "-"} />
                </div>
              </div>
            )}

            {/* Witness Information */}
            {claim.teve_testemunha && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Testemunha
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Nome" value={claim.nome_testemunha || "-"} />
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        Telemóvel
                      </div>
                      <p className="font-medium">{claim.telemovel_testemunha || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Damaged Items */}
            {damagedItems.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Itens Danificados ({damagedItems.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {damagedItems.map((item, index) => (
                    <Badge key={index} variant="outline" className="bg-background">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {claim.descricao && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descrição
                </h4>
                <p className="text-sm">{claim.descricao}</p>
              </div>
            )}

            {/* Photos */}
            {claim.fotos && (claim.fotos as string[]).length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Fotos ({(claim.fotos as string[]).length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(claim.fotos as string[]).map((url, index) => (
                    <div 
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handlePreview(url)}
                    >
                      <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground text-right space-y-1">
              {claim.created_at && (
                <p>Criado em: {new Date(claim.created_at).toLocaleString("pt-PT")}</p>
              )}
              {claim.updated_at && claim.updated_at !== claim.created_at && (
                <p>Atualizado em: {new Date(claim.updated_at).toLocaleString("pt-PT")}</p>
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
                  predefinedTypes={CLAIM_DOCUMENT_TYPES}
                  documents={documents}
                  onDocumentsChange={handleDocumentsChange}
                  bucket="documents"
                  folder="sinistros"
                />

                {hasChanges && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveDocuments}
                      disabled={updateClaim.isPending}
                    >
                      {updateClaim.isPending ? "Salvando..." : "Salvar Documentos"}
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
