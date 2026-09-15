import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/common/CustomFieldsManager";
import { Car, Receipt, AlertTriangle, FileText, Fuel, Calendar, Camera, Upload, ChevronLeft, ChevronRight, Wrench, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Veiculo, useManutencoes, useUpdateVeiculo } from "@/hooks/useVeiculos";
import { VehicleFinesTab } from "./VehicleFinesTab";
import { VehicleClaimsTab } from "./VehicleClaimsTab";
import { ProfilePhotoUpload } from "@/components/common/ProfilePhotoUpload";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { ArchivedDocumentsSection } from "@/components/common/ArchivedDocumentsSection";
import { FineDetailsDialog } from "@/components/fines/FineDetailsDialog";
import { ClaimDetailsDialog } from "@/components/claims/ClaimDetailsDialog";
import { MaintenanceDetailsDialog } from "@/components/maintenance/MaintenanceDetailsDialog";
import { useVehicleActiveDrivers, useVehicleDriverHistory, MAX_ACTIVE_DRIVERS_PER_VEHICLE } from "@/hooks/useVehicleDrivers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VehicleDetailsDialogProps {
  vehicle: (Veiculo & { proprietario?: { id: string; nome_completo: string | null; nome_empresa: string | null; tipo: string } | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleDetailsDialog({
  vehicle,
  open,
  onOpenChange,
}: VehicleDetailsDialogProps) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const isGestor = isAdmin || isSuperAdmin;
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { data: manutencoes = [] } = useManutencoes(vehicle?.id || null);
  const { data: activeDrivers = [] } = useVehicleActiveDrivers(vehicle?.id || null);
  const { data: driverHistory = [] } = useVehicleDriverHistory(vehicle?.id || null);
  const updateVehicle = useUpdateVeiculo();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [localCoverPhoto, setLocalCoverPhoto] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  
  if (!vehicle) return null;

  const handleNavigateToOwner = (ownerId: string) => {
    onOpenChange(false);
    navigate(`/owners?view=${ownerId}`);
  };

  const gallery = localPhotos.length > 0 ? localPhotos : ((vehicle.fotos_galeria as string[]) || []);
  const currentCoverPhoto = localCoverPhoto ?? vehicle.foto_principal_url;
  const allImages = [currentCoverPhoto, ...gallery].filter(Boolean) as string[];
  const today = new Date();

  const handleProfilePhotoChange = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateVehicle.mutateAsync({
      id: vehicle.id,
      foto_principal_url: url,
      showToast: false,
    });
  };

  const handleGalleryChange = async (photos: string[]) => {
    setLocalPhotos(photos);
    await updateVehicle.mutateAsync({
      id: vehicle.id,
      fotos_galeria: photos,
      showToast: false,
    });
  };

  const handleSetCoverFromGallery = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateVehicle.mutateAsync({
      id: vehicle.id,
      foto_principal_url: url,
      showToast: false,
    });
  };

  const isCartaVerdeValid = vehicle.carta_verde_valid_until 
    ? new Date(vehicle.carta_verde_valid_until) > today 
    : false;
  const isInspecaoValid = vehicle.inspecao_tvde_valid_until 
    ? new Date(vehicle.inspecao_tvde_valid_until) > today 
    : false;
  const isUberValid = vehicle.uber_valid_until 
    ? new Date(vehicle.uber_valid_until) > today 
    : false;
  const isBoltValid = vehicle.bolt_valid_until 
    ? new Date(vehicle.bolt_valid_until) > today 
    : false;
  const isExtintorValid = (vehicle as any).extintor_valid_until 
    ? new Date((vehicle as any).extintor_valid_until) > today 
    : false;

  const ownerName = vehicle.proprietario 
    ? (vehicle.proprietario.tipo === "empresa" ? vehicle.proprietario.nome_empresa : vehicle.proprietario.nome_completo)
    : "Sem proprietário";

  const nextImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ProfilePhotoUpload
              currentPhoto={currentCoverPhoto}
              onPhotoChange={handleProfilePhotoChange}
              bucket="vehicle-photos"
              folder={`vehicles/${vehicle.id}`}
              fallbackIcon="car"
              size="lg"
              shape="rounded"
              readOnly={!isGestor}
            />
            <div>
              <span className="font-mono text-xl">{vehicle.matricula}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {vehicle.marca} {vehicle.modelo} • {vehicle.cor}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Galeria
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Manutenção
            </TabsTrigger>
            <TabsTrigger value="fines" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Multas
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Sinistros
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="m-0">
              <div className="space-y-6">
                {/* Vehicle Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoCard label="Matrícula" value={vehicle.matricula} />
                  <InfoCard
                    label="Data Matrícula"
                    value={vehicle.data_matricula ? new Date(vehicle.data_matricula).toLocaleDateString("pt-PT") : "-"}
                  />
                  <InfoCard label="Marca" value={vehicle.marca || "-"} />
                  <InfoCard label="Modelo" value={vehicle.modelo || "-"} />
                  <InfoCard label="Cor" value={vehicle.cor || "-"} />
                  <InfoCard label="Combustível" value={vehicle.combustivel || "-"} icon={<Fuel className="w-4 h-4" />} />
                  <InfoCard label="Lugares" value={String(vehicle.lugares || "-")} />
                  <InfoCard label="Portas" value={String(vehicle.portas || "-")} />
                  <InfoCard label="Chassi" value={vehicle.chassi || "-"} />
                  <InfoCard label="Cilindrada" value={vehicle.cilindrada ? `${vehicle.cilindrada} cc` : "-"} />
                  <InfoCard label="Potência" value={vehicle.potencia ? `${vehicle.potencia} cv` : "-"} />
                  <InfoCard label="Caução" value={(vehicle as any).valor_caucao ? `€${(vehicle as any).valor_caucao.toFixed(2)}` : "-"} />
                  <InfoCard label="Aluguel" value={(vehicle as any).valor_aluguel ? `€${(vehicle as any).valor_aluguel.toFixed(2)}` : "-"} />
                  <InfoCard label="Via Verde" value={(vehicle as any).via_verde || "-"} />
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Documentos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DocumentCard
                      label="Carta Verde"
                      expiry={vehicle.carta_verde_valid_until}
                      valid={isCartaVerdeValid}
                    />
                    <DocumentCard
                      label="Inspeção TVDE"
                      expiry={vehicle.inspecao_tvde_valid_until}
                      valid={isInspecaoValid}
                    />
                    <DocumentCard
                      label="Extintor"
                      expiry={(vehicle as any).extintor_valid_until}
                      valid={isExtintorValid}
                    />
                    <DocumentCard
                      label="Uber"
                      expiry={vehicle.uber_valid_until}
                      valid={isUberValid}
                    />
                    <DocumentCard
                      label="Bolt"
                      expiry={vehicle.bolt_valid_until}
                      valid={isBoltValid}
                    />
                  </div>
                </div>

                {/* Archived Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Documentos Arquivados</h4>
                   {isGestor && (
                     <Button size="sm" variant="outline">
                       <Upload className="w-4 h-4 mr-2" />
                       Carregar
                     </Button>
                   )}
                  </div>
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum documento arquivado</p>
                  </div>
                </div>

                {/* Owner */}
                <div 
                  className={cn(
                    "p-4 bg-muted rounded-lg flex items-center justify-between",
                    vehicle.proprietario?.id && "cursor-pointer hover:bg-muted/80 transition-colors group"
                  )}
                  onClick={() => vehicle.proprietario?.id && handleNavigateToOwner(vehicle.proprietario.id)}
                  role={vehicle.proprietario?.id ? "button" : undefined}
                  tabIndex={vehicle.proprietario?.id ? 0 : undefined}
                  onKeyDown={(e) => e.key === "Enter" && vehicle.proprietario?.id && handleNavigateToOwner(vehicle.proprietario.id)}
                >
                  <div>
                    <p className="text-sm text-muted-foreground">Proprietário</p>
                    <p className="font-semibold text-lg">{ownerName}</p>
                  </div>
                  {vehicle.proprietario?.id && (
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                {/* Active Drivers (até 3) */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <p className="text-sm font-semibold">Motoristas Ativos</p>
                    </div>
                    <Badge variant={activeDrivers.length >= MAX_ACTIVE_DRIVERS_PER_VEHICLE ? "destructive" : "secondary"}>
                      {activeDrivers.length}/{MAX_ACTIVE_DRIVERS_PER_VEHICLE}
                    </Badge>
                  </div>
                  {activeDrivers.length > 0 ? (
                    <div className="space-y-2">
                      {activeDrivers.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-background cursor-pointer hover:opacity-80 transition-opacity group"
                          onClick={() => {
                            if (!d.motoristas?.id) return;
                            onOpenChange(false);
                            navigate(`/drivers?view=${d.motoristas.id}`);
                          }}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={d.motoristas?.foto_perfil_url || undefined} />
                            <AvatarFallback>
                              {d.motoristas?.nome_completo?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{d.motoristas?.nome_completo || "Motorista removido"}</p>
                            <p className="text-xs text-muted-foreground">
                              Desde {new Date(d.data_inicio).toLocaleDateString("pt-PT")}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum motorista atribuído</p>
                  )}
                </div>

                {/* Driver History */}
                {driverHistory.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <History className="w-4 h-4" /> Histórico de Motoristas
                    </h4>
                    <div className="space-y-2">
                      {driverHistory.map((h: any) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={h.motoristas?.foto_perfil_url || undefined} />
                              <AvatarFallback>
                                {h.motoristas?.nome_completo?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{h.motoristas?.nome_completo || "Motorista removido"}</p>
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
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              <PhotoGallery
                photos={gallery}
                onPhotosChange={handleGalleryChange}
                bucket="vehicle-photos"
                folder={`vehicles/${vehicle.id}/gallery`}
                maxPhotos={15}
                coverPhoto={currentCoverPhoto}
                onCoverPhotoChange={handleSetCoverFromGallery}
                showSetCoverOption={isGestor}
                title="Galeria do Veículo"
                readOnly={!isGestor}
              />
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <ArchivedDocumentsSection
                entityId={vehicle.id}
                entityType="veiculo"
                predefinedTypes={[
                  "Documento do Carro",
                  "Carta Verde",
                  "Inspeção TVDE",
                ]}
                readOnly={!isGestor}
              />
            </TabsContent>

            <TabsContent value="maintenance" className="m-0">
              <div className="space-y-4">
                <h4 className="font-semibold">Histórico de Manutenção</h4>
                
                {manutencoes.length > 0 ? (
                  <div className="space-y-3">
                    {manutencoes.map((m: any) => {
                      const documentos = (m.documentos || []) as Array<{tipo: string; url: string; nome: string}>;
                      const orcamentos = documentos.filter(d => d.tipo === "Orçamento");
                      const faturas = documentos.filter(d => d.tipo === "Fatura");
                      
                      return (
                        <div key={m.id} className="p-4 border rounded-lg space-y-3">
                          {/* Header with date, type and view button */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">{m.tipo_servico}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {new Date(m.data_servico).toLocaleDateString("pt-PT")}
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedMaintenance(m)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </div>
                          
                          {/* Details grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-xs text-muted-foreground">KM</p>
                              <p className="font-medium">{m.km ? m.km.toLocaleString() : "-"}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-xs text-muted-foreground">Data Serviço</p>
                              <p className="font-medium">{new Date(m.data_servico).toLocaleDateString("pt-PT")}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-xs text-muted-foreground">Última Revisão Básica</p>
                              <p className="font-medium">
                                {m.data_ultima_revisao_basica 
                                  ? new Date(m.data_ultima_revisao_basica).toLocaleDateString("pt-PT")
                                  : "-"
                                }
                              </p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-xs text-muted-foreground">Proprietário</p>
                              <p className="font-medium">
                                {m.proprietario 
                                  ? (m.proprietario.tipo === "empresa" ? m.proprietario.nome_empresa : m.proprietario.nome_completo)
                                  : "-"
                                }
                              </p>
                            </div>
                          </div>
                          
                          {/* Documents summary */}
                          {documentos.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {orcamentos.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  📋 {orcamentos.length} Orçamento(s)
                                </span>
                              )}
                              {faturas.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  🧾 {faturas.length} Fatura(s)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma manutenção registada</p>
                    <p className="text-sm mt-1">Crie uma nova manutenção para este veículo</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="fines" className="m-0">
              <VehicleFinesTab vehicleId={vehicle.id} onViewFine={setSelectedFine} />
            </TabsContent>

            <TabsContent value="extra" className="m-0">
              <CustomFieldsManager entidadeTipo="veiculo" entidadeId={vehicle.id} />
            </TabsContent>

            <TabsContent value="claims" className="m-0">
              <VehicleClaimsTab vehicleId={vehicle.id} onViewClaim={setSelectedClaim} />
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

        {/* Maintenance Details Dialog */}
        <MaintenanceDetailsDialog
          manutencao={selectedMaintenance}
          open={!!selectedMaintenance}
          onOpenChange={(open) => !open && setSelectedMaintenance(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium flex items-center gap-2">
        {icon}
        {value}
      </p>
    </div>
  );
}

function DocumentCard({
  label,
  expiry,
  valid,
}: {
  label: string;
  expiry: string | null;
  valid: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        valid
          ? "bg-success/10 border-success/30"
          : "bg-destructive/10 border-destructive/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            valid ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}
        >
          {valid ? "Válido" : "Expirado"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>
          {expiry 
            ? `Expira: ${new Date(expiry).toLocaleDateString("pt-PT")}`
            : "Não definido"
          }
        </span>
      </div>
    </div>
  );
}
