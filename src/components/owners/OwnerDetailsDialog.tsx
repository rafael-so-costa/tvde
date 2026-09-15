import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/common/CustomFieldsManager";
import { Building2, User, FileText, Car, Calendar, CreditCard, MapPin, Phone, Mail, Image, ScrollText, Loader2, ExternalLink, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Proprietario, useUpdateProprietario } from "@/hooks/useProprietarios";
import { useOwnerVehicles, useOwnerContracts } from "@/hooks/useOwnerDetails";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { ProfilePhotoUpload } from "@/components/common/ProfilePhotoUpload";
import { ArchivedDocumentsSection } from "@/components/common/ArchivedDocumentsSection";
import { AssociateVehiclesDialog } from "./AssociateVehiclesDialog";

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

interface OwnerDetailsDialogProps {
  owner: Proprietario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerDetailsDialog({ owner, open, onOpenChange }: OwnerDetailsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = useAuth();
  const isGestor = isAdmin || isSuperAdmin;
  const { data: vehicles = [], isLoading: loadingVehicles } = useOwnerVehicles(owner?.id ?? null);
  const { data: contracts = [], isLoading: loadingContracts } = useOwnerContracts(owner?.id ?? null);
  const updateOwner = useUpdateProprietario();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [localCoverPhoto, setLocalCoverPhoto] = useState<string | null>(null);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [vehicleToRemove, setVehicleToRemove] = useState<{ id: string; matricula: string } | null>(null);

  const removeAssociation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from("veiculos")
        .update({ proprietario_id: null })
        .eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-vehicles", owner?.id] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-for-association"] });
      toast.success("Associação removida");
      setVehicleToRemove(null);
    },
    onError: (e: Error) => toast.error("Erro ao remover associação: " + e.message),
  });

  if (!owner) return null;

  const handleNavigateToVehicle = (vehicleId: string) => {
    onOpenChange(false);
    navigate(`/vehicles?view=${vehicleId}`);
  };

  const handleNavigateToDriver = (driverId: string) => {
    onOpenChange(false);
    navigate(`/drivers?view=${driverId}`);
  };

  const handleNavigateToContract = (contractId: string) => {
    onOpenChange(false);
    navigate(`/contracts?view=${contractId}`);
  };

  const isCompany = owner.tipo === "empresa";
  const name = isCompany ? owner.nome_empresa : owner.nome_completo;
  const fotos = localPhotos.length > 0 ? localPhotos : ((owner.fotos_galeria as string[]) || []);
  const currentCoverPhoto = localCoverPhoto ?? owner.foto_perfil_url;

  const handleProfilePhotoChange = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateOwner.mutateAsync({
      id: owner.id,
      foto_perfil_url: url,
      showToast: false,
    });
  };

  const handleGalleryChange = async (photos: string[]) => {
    setLocalPhotos(photos);
    await updateOwner.mutateAsync({
      id: owner.id,
      fotos_galeria: photos,
      showToast: false,
    });
  };

  const handleSetCoverFromGallery = async (url: string) => {
    setLocalCoverPhoto(url);
    await updateOwner.mutateAsync({
      id: owner.id,
      foto_perfil_url: url,
      showToast: false,
    });
  };

  const formatAddress = () => {
    const parts = [
      owner.endereco_rua,
      owner.endereco_numero && `nº ${owner.endereco_numero}`,
      owner.endereco_complemento,
      owner.endereco_cidade,
      owner.endereco_cep,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : owner.endereco || "-";
  };

  const isDocumentExpiringSoon = (date: string | null) => {
    if (!date) return false;
    return new Date(date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
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
              folder={`owners/${owner.id}`}
              fallbackIcon={isCompany ? "building" : "user"}
              size="lg"
              shape="rounded"
            />
            <div>
              <span className="text-xl">{name}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {isCompany ? "Empresa" : "Particular"} • NIF: {owner.nif || "-"}
              </p>
              <Badge variant={owner.ativo ? "default" : "destructive"} className="mt-1">
                {owner.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details"><FileText className="w-4 h-4 mr-2" />Detalhes</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="w-4 h-4 mr-2" />Galeria</TabsTrigger>
            <TabsTrigger value="documents"><Upload className="w-4 h-4 mr-2" />Documentos</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
            <TabsTrigger value="vehicles"><Car className="w-4 h-4 mr-2" />Veículos ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="contracts"><ScrollText className="w-4 h-4 mr-2" />Contratos ({contracts.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="m-0">
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Informações de Contacto
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Email" value={owner.email || "-"} icon={<Mail className="w-4 h-4" />} />
                    <InfoCard label="Telemóvel" value={owner.telemovel || "-"} icon={<Phone className="w-4 h-4" />} />
                    <InfoCard label="NIF" value={owner.nif || "-"} />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Morada
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Rua" value={owner.endereco_rua || "-"} />
                    <InfoCard label="Número" value={owner.endereco_numero || "-"} />
                    <InfoCard label="Complemento" value={owner.endereco_complemento || "-"} />
                    <InfoCard label="Cidade" value={owner.endereco_cidade || "-"} />
                    <InfoCard label="CEP" value={owner.endereco_cep || "-"} />
                  </div>
                </div>

                {/* Personal Data (for individuals) */}
                {!isCompany && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" /> Dados Pessoais
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <InfoCard label="Nome Completo" value={owner.nome_completo || "-"} />
                      {owner.data_nascimento && (
                        <InfoCard 
                          label="Data de Nascimento" 
                          value={new Date(owner.data_nascimento).toLocaleDateString("pt-PT")} 
                          icon={<Calendar className="w-4 h-4" />} 
                        />
                      )}
                      <InfoCard label="Estado Civil" value={owner.estado_civil ? estadoCivilLabels[owner.estado_civil] : "-"} />
                      <InfoCard label="Filhos" value={owner.filhos?.toString() || "0"} />
                      <InfoCard label="Tipo de Documento" value={owner.tipo_documento ? documentTypeLabels[owner.tipo_documento] : "-"} />
                      <InfoCard label="Número do Documento" value={owner.numero_documento || "-"} />
                      {owner.documento_valid_until && (
                        <DocumentCard
                          label="Validade do Documento"
                          expiry={owner.documento_valid_until}
                          valid={!isDocumentExpiringSoon(owner.documento_valid_until)}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Company Data */}
                {isCompany && (
                  <>
                    {/* Company Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Dados da Empresa
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <InfoCard label="Nome da Empresa" value={owner.nome_empresa || "-"} />
                        <InfoCard label="Capital Social" value={owner.capital_social ? `${owner.capital_social}€` : "-"} />
                        <InfoCard label="Certidão Permanente" value={owner.certidao_permanente || "-"} />
                        {owner.certidao_valid_until && (
                          <DocumentCard
                            label="Validade da Certidão"
                            expiry={owner.certidao_valid_until}
                            valid={!isDocumentExpiringSoon(owner.certidao_valid_until)}
                          />
                        )}
                        <InfoCard label="Certificado TVDE" value={owner.certificado_tvde || "-"} />
                        {owner.certificado_tvde_valid_until && (
                          <DocumentCard
                            label="Validade Certificado TVDE"
                            expiry={owner.certificado_tvde_valid_until}
                            valid={!isDocumentExpiringSoon(owner.certificado_tvde_valid_until)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Manager Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" /> Dados do Gerente
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <InfoCard label="Nome do Gerente" value={owner.nome_gerente || "-"} />
                        {owner.data_nascimento && (
                          <InfoCard 
                            label="Data de Nascimento" 
                            value={new Date(owner.data_nascimento).toLocaleDateString("pt-PT")} 
                            icon={<Calendar className="w-4 h-4" />} 
                          />
                        )}
                        <InfoCard 
                          label="Estado Civil" 
                          value={owner.estado_civil ? estadoCivilLabels[owner.estado_civil] : "-"} 
                        />
                        <InfoCard label="Filhos" value={owner.filhos?.toString() || "0"} />
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Data */}
                {owner.iban && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Dados Financeiros
                    </h4>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">IBAN</p>
                          <p className="font-mono font-medium">{owner.iban}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cartão Frota */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Cartão Frota
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoCard label="Número Cartão Frota" value={(owner as any).cartao_frota || "-"} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              <PhotoGallery
                photos={fotos}
                onPhotosChange={handleGalleryChange}
                bucket="avatars"
                folder={`owners/${owner.id}/gallery`}
                maxPhotos={10}
                coverPhoto={currentCoverPhoto}
                onCoverPhotoChange={handleSetCoverFromGallery}
                showSetCoverOption
              />
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <ArchivedDocumentsSection
                entityId={owner.id}
                entityType="proprietario"
                predefinedTypes={
                  isCompany 
                    ? [
                        "Certidão Permanente",
                        "Comprovativo de IBAN da Empresa",
                        "Comprovativo de Morada da Empresa",
                        "Documento de Identificação do Gerente - Passaporte",
                        "Documento de Identificação do Gerente - Cartão Cidadão",
                        "Documento de Identificação do Gerente - Título de Residência",
                      ]
                    : [
                        "Documento de Identificação - Passaporte",
                        "Documento de Identificação - Cartão Cidadão",
                        "Documento de Identificação - Título de Residência",
                        "Comprovativo de Morada",
                        "Comprovativo de IBAN",
                      ]
                }
              />
            </TabsContent>

            <TabsContent value="extra" className="m-0">
              <CustomFieldsManager entidadeTipo="proprietario" entidadeId={owner.id} />
            </TabsContent>

            <TabsContent value="vehicles" className="m-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    Veículos Associados ({vehicles.length})
                  </h4>
                  {isGestor && (
                    <Button size="sm" onClick={() => setAssociateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Associar Veículo
                    </Button>
                  )}
                </div>

                {loadingVehicles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : vehicles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
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
                          <Badge variant={vehicle.ativo ? "default" : "secondary"} className="mt-1">
                            {vehicle.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {isGestor && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover associação"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVehicleToRemove({ id: vehicle.id, matricula: vehicle.matricula });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum veículo associado a este proprietário</p>
                    {isGestor && (
                      <p className="text-sm mt-1">Clique em "Associar Veículo" para começar</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contracts" className="m-0">
              {loadingContracts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Contratos ({contracts.length})</h4>
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
                              contract.motoristas?.id && "cursor-pointer hover:text-primary hover:underline"
                            )}
                            onClick={(e) => {
                              if (contract.motoristas?.id) {
                                e.stopPropagation();
                                handleNavigateToDriver(contract.motoristas.id);
                              }
                            }}
                          >
                            Motorista: {contract.motoristas?.nome_completo || "-"}
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
          </div>
        </Tabs>
      </DialogContent>

      <AssociateVehiclesDialog
        ownerId={owner.id}
        ownerName={(isCompany ? owner.nome_empresa : owner.nome_completo) || "este proprietário"}
        open={associateOpen}
        onOpenChange={setAssociateOpen}
      />

      <AlertDialog
        open={!!vehicleToRemove}
        onOpenChange={(o) => !o && setVehicleToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover associação?</AlertDialogTitle>
            <AlertDialogDescription>
              O veículo <span className="font-mono font-semibold">{vehicleToRemove?.matricula}</span> deixará de estar associado a este proprietário. Esta ação pode ser revertida criando uma nova associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => vehicleToRemove && removeAssociation.mutate(vehicleToRemove.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
