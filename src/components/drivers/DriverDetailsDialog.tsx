import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/common/CustomFieldsManager";
import { User, FileText, Car, Calendar, CreditCard, MapPin, Phone, Mail, Image, ScrollText, Loader2, IdCard, ExternalLink, Upload, Receipt, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Motorista, useUpdateMotorista } from "@/hooks/useMotoristas";
import { useDriverContracts, useDriverCurrentVehicle, useDriverVehicleHistory } from "@/hooks/useDriverDetails";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { ProfilePhotoUpload } from "@/components/common/ProfilePhotoUpload";
import { ArchivedDocumentsSection } from "@/components/common/ArchivedDocumentsSection";
import { DriverFines } from "./DriverFines";
import { DriverClaims } from "./DriverClaims";
import { DriverVehicleAssignment } from "./DriverVehicleAssignment";
import { FineDetailsDialog } from "@/components/fines/FineDetailsDialog";
import { ClaimDetailsDialog } from "@/components/claims/ClaimDetailsDialog";

const documentTypeLabels: Record<string, string> = {
  passaporte: "Passaporte",
  titulo_residencia: "Título de Residência",
  cartao_cidadao: "Cartão de Cidadão",
};

const estadoCivilLabels: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_facto: "União de Facto",
};

const statusContratoLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  assinado: "Assinado",
  cancelado: "Cancelado",
  renovado: "Renovado",
  expirado: "Expirado",
};

interface DriverDetailsDialogProps {
  driver: Motorista | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriverDetailsDialog({
  driver,
  open,
  onOpenChange,
}: DriverDetailsDialogProps) {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading: loadingContracts } = useDriverContracts(driver?.id ?? null);
  const { data: currentVehicle, isLoading: loadingVehicle } = useDriverCurrentVehicle(driver?.id ?? null);
  const { data: vehicleHistory = [] } = useDriverVehicleHistory(driver?.id ?? null);
  const updateDriver = useUpdateMotorista();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [localCoverPhoto, setLocalCoverPhoto] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  
  if (!driver) return null;

  const handleNavigateToVehicle = (vehicleId: string) => {
    onOpenChange(false);
    navigate(`/vehicles?view=${vehicleId}`);
  };

  const handleNavigateToOwner = (ownerId: string) => {
    onOpenChange(false);
    navigate(`/owners?view=${ownerId}`);
  };

  const handleNavigateToContract = (contractId: string) => {
    onOpenChange(false);
    navigate(`/contracts?view=${contractId}`);
  };

  const fotos = localPhotos.length > 0 ? localPhotos : ((driver.fotos_galeria as string[]) || []);
  const currentCoverPhoto = localCoverPhoto ?? driver.foto_perfil_url;

  const handleProfilePhotoChange = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateDriver.mutateAsync({
      id: driver.id,
      foto_perfil_url: url,
      showToast: false,
    });
  };

  const handleGalleryChange = async (photos: string[]) => {
    setLocalPhotos(photos);
    await updateDriver.mutateAsync({
      id: driver.id,
      fotos_galeria: photos,
      showToast: false,
    });
  };

  const handleSetCoverFromGallery = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateDriver.mutateAsync({
      id: driver.id,
      foto_perfil_url: url,
      showToast: false,
    });
  };

  const isDocumentExpiringSoon = (date: string | null) => {
    if (!date) return false;
    return new Date(date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  };

  const getInitials = () => {
    return driver.nome_completo
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ProfilePhotoUpload
              currentPhoto={currentCoverPhoto}
              onPhotoChange={handleProfilePhotoChange}
              bucket="avatars"
              folder={`drivers/${driver.id}`}
              fallbackText={getInitials()}
              size="lg"
              shape="circle"
            />
            <div>
              <span className="text-xl">{driver.nome_completo}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {driver.tipo_documento ? documentTypeLabels[driver.tipo_documento] : "Sem documento"} • {driver.numero_documento || "N/A"}
              </p>
              <Badge variant={driver.ativo ? "default" : "destructive"} className="mt-1">
                {!driver.ativo ? "Inativo" : driver.status_cadastro === "ativo" ? "Ativo" : "Pendente"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="details"><FileText className="w-4 h-4 mr-1" />Detalhes</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="w-4 h-4 mr-1" />Galeria</TabsTrigger>
            <TabsTrigger value="documents"><Upload className="w-4 h-4 mr-1" />Docs</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
            <TabsTrigger value="vehicle"><Car className="w-4 h-4 mr-1" />Veículo</TabsTrigger>
            <TabsTrigger value="contracts"><ScrollText className="w-4 h-4 mr-1" />Contratos</TabsTrigger>
            <TabsTrigger value="fines"><Receipt className="w-4 h-4 mr-1" />Multas</TabsTrigger>
            <TabsTrigger value="claims"><AlertTriangle className="w-4 h-4 mr-1" />Sinistros</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="m-0">
              <div className="space-y-6">
                {/* Primary Info - First */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> Informações Principais
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoCard label="Nome Completo" value={driver.nome_completo} icon={<User className="w-4 h-4" />} />
                    <InfoCard 
                      label="Data de Nascimento" 
                      value={driver.data_nascimento ? new Date(driver.data_nascimento).toLocaleDateString("pt-PT") : "-"} 
                      icon={<Calendar className="w-4 h-4" />}
                    />
                    <InfoCard label="NIF" value={driver.nif || "-"} />
                    <InfoCard label="Telemóvel" value={driver.telemovel || "-"} icon={<Phone className="w-4 h-4" />} />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Outras Informações de Contacto
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard label="Email" value={driver.email || "-"} icon={<Mail className="w-4 h-4" />} />
                    <InfoCard label="IBAN" value={driver.iban || "-"} icon={<CreditCard className="w-4 h-4" />} />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-red-500" /> Contato de Urgência
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard label="Nome" value={(driver as any).contato_urgencia_nome || "-"} icon={<User className="w-4 h-4" />} />
                    <InfoCard label="Telemóvel" value={(driver as any).contato_urgencia_telemovel || "-"} icon={<Phone className="w-4 h-4" />} />
                  </div>
                </div>

                {/* Personal Data */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> Dados Pessoais
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Estado Civil" value={driver.estado_civil ? estadoCivilLabels[driver.estado_civil] : "-"} />
                    <InfoCard label="Filhos" value={driver.filhos?.toString() || "0"} />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Morada
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Rua" value={driver.endereco_rua || "-"} />
                    <InfoCard label="Número" value={driver.endereco_numero || "-"} />
                    <InfoCard label="Complemento" value={driver.endereco_complemento || "-"} />
                    <InfoCard label="Cidade" value={driver.endereco_cidade || "-"} />
                    <InfoCard label="CEP" value={driver.endereco_cep || "-"} />
                  </div>
                </div>

                {/* Documentation */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <IdCard className="w-4 h-4" /> Documentação
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Tipo de Documento" value={driver.tipo_documento ? documentTypeLabels[driver.tipo_documento] : "-"} />
                    <InfoCard label="Número do Documento" value={driver.numero_documento || "-"} />
                    {driver.documento_valid_until && (
                      <DocumentCard
                        label="Validade do Documento"
                        expiry={driver.documento_valid_until}
                        valid={!isDocumentExpiringSoon(driver.documento_valid_until)}
                      />
                    )}
                    <InfoCard label="Carta de Condução" value={driver.carta_numero || "-"} />
                    {driver.carta_valid_until && (
                      <DocumentCard
                        label="Validade da Carta"
                        expiry={driver.carta_valid_until}
                        valid={!isDocumentExpiringSoon(driver.carta_valid_until)}
                      />
                    )}
                    {driver.registo_criminal_valid_until && (
                      <DocumentCard
                        label="Validade Registo Criminal"
                        expiry={driver.registo_criminal_valid_until}
                        valid={!isDocumentExpiringSoon(driver.registo_criminal_valid_until)}
                      />
                    )}
                    <InfoCard label="Certificado TVDE" value={(driver as any).certificado_tvde || "-"} />
                    {(driver as any).certificado_tvde_valid_until && (
                      <DocumentCard
                        label="Validade Certificado TVDE"
                        expiry={(driver as any).certificado_tvde_valid_until}
                        valid={!isDocumentExpiringSoon((driver as any).certificado_tvde_valid_until)}
                      />
                    )}
                    <InfoCard label="Cartão Frota" value={(driver as any).cartao_frota || "-"} />
                  </div>
                </div>

                {/* Platform Data - Bolt */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-green-600">
                    <Car className="w-4 h-4" /> Bolt
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <InfoCard label="Email Bolt" value={(driver as any).bolt_email || "-"} icon={<Mail className="w-4 h-4" />} />
                    <InfoCard label="Telemóvel Bolt" value={(driver as any).bolt_telemovel || "-"} icon={<Phone className="w-4 h-4" />} />
                  </div>
                </div>

                {/* Platform Data - Uber */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4" /> Uber
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <InfoCard label="Email Uber" value={(driver as any).uber_email || "-"} icon={<Mail className="w-4 h-4" />} />
                    <InfoCard label="Telemóvel Uber" value={(driver as any).uber_telemovel || "-"} icon={<Phone className="w-4 h-4" />} />
                  </div>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              <PhotoGallery
                photos={fotos}
                onPhotosChange={handleGalleryChange}
                bucket="avatars"
                folder={`drivers/${driver.id}/gallery`}
                maxPhotos={10}
                coverPhoto={currentCoverPhoto}
                onCoverPhotoChange={handleSetCoverFromGallery}
                showSetCoverOption
              />
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <ArchivedDocumentsSection
                entityId={driver.id}
                entityType="motorista"
                predefinedTypes={[
                  "Documento de Identificação - Passaporte",
                  "Documento de Identificação - Cartão Cidadão",
                  "Documento de Identificação - Título de Residência",
                  "Comprovativo de Morada",
                  "Comprovativo de IBAN",
                  "Carta de Condução",
                  "Certificado TVDE",
                  "Registo Criminal",
                ]}
              />
            </TabsContent>

            <TabsContent value="extra" className="m-0">
              <CustomFieldsManager entidadeTipo="motorista" entidadeId={driver.id} />
            </TabsContent>

            <TabsContent value="vehicle" className="m-0">
              <DriverVehicleAssignment
                driverId={driver.id}
                currentVehicle={currentVehicle}
                isLoadingVehicle={loadingVehicle}
                onNavigateToVehicle={handleNavigateToVehicle}
              />
              {/* Vehicles from contracts */}
              {contracts.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold">Veículos dos Contratos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from(
                      new Map(
                        contracts
                          .filter((c: any) => c.veiculos?.id)
                          .map((c: any) => [c.veiculos.id, c.veiculos])
                      ).values()
                    ).map((vehicle: any) => (
                      <div 
                        key={vehicle.id}
                        className="p-4 bg-muted rounded-lg flex items-center gap-4 cursor-pointer hover:bg-muted/80 transition-colors group"
                        onClick={() => handleNavigateToVehicle(vehicle.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleNavigateToVehicle(vehicle.id)}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-background flex items-center justify-center">
                          {vehicle.foto_principal_url ? (
                            <img src={vehicle.foto_principal_url} alt={vehicle.matricula} className="w-full h-full object-cover" />
                          ) : (
                            <Car className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{vehicle.matricula}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.marca} {vehicle.modelo}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle History */}
              {vehicleHistory.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold">Histórico de Veículos</h4>
                  <div className="space-y-2">
                    {vehicleHistory.map((h: any) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => h.veiculos?.id && handleNavigateToVehicle(h.veiculos.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {h.veiculos?.foto_principal_url ? (
                              <img src={h.veiculos.foto_principal_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Car className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm font-mono">{h.veiculos?.matricula || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(h.data_inicio).toLocaleDateString("pt-PT")} —{" "}
                              {h.data_fim ? new Date(h.data_fim).toLocaleDateString("pt-PT") : "atual"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={h.ativo ? "default" : "secondary"}>
                          {h.ativo ? "Ativo" : "Encerrado"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="m-0">
              {loadingContracts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Histórico de Contratos ({contracts.length})</h4>
                  <div className="space-y-3">
                    {contracts.map((contract: any) => (
                      <div 
                        key={contract.id} 
                        className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors group"
                        onClick={() => handleNavigateToContract(contract.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleNavigateToContract(contract.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ScrollText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {contract.templates_contrato?.nome || 
                               (contract.tipo === "prestacao_servico" ? "Prestação de Serviço" : 
                                contract.tipo === "aluguer" ? "Aluguer" : contract.tipo)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <Badge variant={
                            contract.status === "assinado" ? "default" : 
                            contract.status === "cancelado" ? "destructive" : 
                            "secondary"
                          }>
                            {statusContratoLabels[contract.status] || contract.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p
                            className={cn(
                              contract.proprietarios?.id && "cursor-pointer hover:text-primary hover:underline"
                            )}
                            onClick={(e) => {
                              if (contract.proprietarios?.id) {
                                e.stopPropagation();
                                handleNavigateToOwner(contract.proprietarios.id);
                              }
                            }}
                          >
                            Proprietário: {contract.proprietarios?.tipo === "empresa" ? contract.proprietarios?.nome_empresa : contract.proprietarios?.nome_completo || "-"}
                          </p>
                          <p
                            className={cn(
                              contract.veiculos?.id && "cursor-pointer hover:text-primary hover:underline"
                            )}
                            onClick={(e) => {
                              if (contract.veiculos?.id) {
                                e.stopPropagation();
                                handleNavigateToVehicle(contract.veiculos.id);
                              }
                            }}
                          >
                            Veículo: {contract.veiculos ? `${contract.veiculos.matricula} - ${contract.veiculos.marca} ${contract.veiculos.modelo}` : "-"}
                          </p>
                          <p>Início: {contract.data_inicio ? new Date(contract.data_inicio).toLocaleDateString("pt-PT") : "-"}</p>
                          <p>Fim: {contract.data_fim ? new Date(contract.data_fim).toLocaleDateString("pt-PT") : "-"}</p>
                          {contract.valor_semanal && (
                            <p className="font-medium text-foreground">Valor Semanal: €{Number(contract.valor_semanal).toFixed(2)}</p>
                          )}
                        </div>
                        {contract.veiculos?.foto_principal_url && (
                          <div 
                            className="mt-3 flex items-center gap-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              contract.veiculos?.id && handleNavigateToVehicle(contract.veiculos.id);
                            }}
                          >
                            <img 
                              src={contract.veiculos.foto_principal_url} 
                              alt={contract.veiculos.matricula} 
                              className="w-16 h-12 object-cover rounded hover:opacity-80 transition-opacity"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum contrato associado</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fines" className="m-0">
              <DriverFines driverId={driver.id} onViewFine={setSelectedFine} />
            </TabsContent>

            <TabsContent value="claims" className="m-0">
              <DriverClaims driverId={driver.id} onViewClaim={setSelectedClaim} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Fine Details Dialog */}
        <FineDetailsDialog
          fine={selectedFine}
          open={!!selectedFine}
          onOpenChange={(open) => !open && setSelectedFine(null)}
          readOnly
        />

        {/* Claim Details Dialog */}
        <ClaimDetailsDialog
          claim={selectedClaim}
          open={!!selectedClaim}
          onOpenChange={(open) => !open && setSelectedClaim(null)}
          readOnly
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium flex items-center gap-2">{icon}{value}</p>
    </div>
  );
}

function DocumentCard({ label, expiry, valid }: { label: string; expiry: string; valid: boolean }) {
  return (
    <div className={cn("p-3 rounded-lg border", valid ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30")}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{new Date(expiry).toLocaleDateString("pt-PT")}</span>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded", valid ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
          {valid ? "Válido" : "A Expirar"}
        </span>
      </div>
    </div>
  );
}
