import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Camera, Loader2 } from "lucide-react";
import { Veiculo, VeiculoInsert, useCreateVeiculo, useUpdateVeiculo } from "@/hooks/useVeiculos";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useTenant } from "@/contexts/TenantContext";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { IncompleteProfileAlert, validateVehicleProfile } from "@/components/common/IncompleteProfileAlert";
import { checkMatriculaExists } from "@/hooks/useUniqueValidation";
import { toast } from "sonner";

interface VehicleFormDialogProps {
  vehicle?: Veiculo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VehicleFormDialog({
  vehicle,
  open,
  onOpenChange,
  onSuccess,
}: VehicleFormDialogProps) {
  const isEditing = !!vehicle;
  const { tenant } = useTenant();
  const createMutation = useCreateVeiculo();
  const updateMutation = useUpdateVeiculo();
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: proprietarios } = useProprietarios();
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<VeiculoInsert> & { fotos_galeria?: string[]; extintor_valid_until?: string; valor_caucao?: number; valor_aluguel?: number }>({
    matricula: "",
    data_matricula: undefined,
    marca: "",
    modelo: "",
    cor: "",
    combustivel: "Gasolina",
    lugares: 5,
    portas: 4,
    chassi: "",
    cilindrada: undefined,
    potencia: undefined,
    proprietario_id: undefined,
    foto_principal_url: undefined,
    carta_verde: "",
    carta_verde_valid_until: undefined,
    inspecao_tvde: "",
    inspecao_tvde_valid_until: undefined,
    uber_valid_until: undefined,
    bolt_valid_until: undefined,
    extintor_valid_until: undefined,
    valor_caucao: undefined,
    valor_aluguel: undefined,
    via_verde: "",
    fotos_galeria: [],
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        matricula: vehicle.matricula || "",
        data_matricula: vehicle.data_matricula || undefined,
        marca: vehicle.marca || "",
        modelo: vehicle.modelo || "",
        cor: vehicle.cor || "",
        combustivel: vehicle.combustivel || "Gasolina",
        lugares: vehicle.lugares || 5,
        portas: vehicle.portas || 4,
        chassi: vehicle.chassi || "",
        cilindrada: vehicle.cilindrada || undefined,
        potencia: vehicle.potencia || undefined,
        proprietario_id: vehicle.proprietario_id || undefined,
        foto_principal_url: vehicle.foto_principal_url || undefined,
        carta_verde: vehicle.carta_verde || "",
        carta_verde_valid_until: vehicle.carta_verde_valid_until || undefined,
        inspecao_tvde: vehicle.inspecao_tvde || "",
        inspecao_tvde_valid_until: vehicle.inspecao_tvde_valid_until || undefined,
        uber_valid_until: vehicle.uber_valid_until || undefined,
        bolt_valid_until: vehicle.bolt_valid_until || undefined,
        extintor_valid_until: (vehicle as any).extintor_valid_until || undefined,
        valor_caucao: (vehicle as any).valor_caucao || undefined,
        valor_aluguel: (vehicle as any).valor_aluguel || undefined,
        via_verde: (vehicle as any).via_verde || "",
        fotos_galeria: (vehicle.fotos_galeria as string[]) || [],
      });
    } else {
      setFormData({
        matricula: "",
        data_matricula: undefined,
        marca: "",
        modelo: "",
        cor: "",
        combustivel: "Gasolina",
        lugares: 5,
        portas: 4,
        chassi: "",
        cilindrada: undefined,
        potencia: undefined,
        proprietario_id: undefined,
        foto_principal_url: undefined,
        carta_verde: "",
        carta_verde_valid_until: undefined,
        inspecao_tvde: "",
        inspecao_tvde_valid_until: undefined,
        uber_valid_until: undefined,
        bolt_valid_until: undefined,
        extintor_valid_until: undefined,
        valor_caucao: undefined,
        valor_aluguel: undefined,
        via_verde: "",
        fotos_galeria: [],
      });
    }
  }, [vehicle, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await upload(file, {
        bucket: "vehicle-photos",
        folder: "main",
      });
      handleChange("foto_principal_url", url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const handleSaveClick = async () => {
    if (!tenant?.id) return;

    // Check if has minimum data to save
    if (!formData.matricula || !formData.marca || !formData.modelo) {
      return;
    }

    // Check for duplicate matricula
    const matriculaExists = await checkMatriculaExists(formData.matricula, vehicle?.id);
    if (matriculaExists) {
      toast.error("Já existe um veículo cadastrado com esta matrícula");
      return;
    }

    const validation = validateVehicleProfile(formData);
    
    if (!validation.isComplete) {
      setMissingFields(validation.missingFields);
      setShowIncompleteAlert(true);
    } else {
      handleSubmit(true);
    }
  };

  const handleSubmit = async (isComplete: boolean) => {
    if (!tenant?.id) {
      return;
    }

    if (!formData.matricula || !formData.marca || !formData.modelo) {
      return;
    }

    const payload: any = {
      tenant_id: tenant.id,
      matricula: formData.matricula,
      data_matricula: formData.data_matricula,
      marca: formData.marca,
      modelo: formData.modelo,
      cor: formData.cor,
      combustivel: formData.combustivel,
      lugares: formData.lugares,
      portas: formData.portas,
      chassi: formData.chassi,
      cilindrada: formData.cilindrada,
      potencia: formData.potencia,
      proprietario_id: formData.proprietario_id,
      foto_principal_url: formData.foto_principal_url,
      carta_verde: formData.carta_verde,
      carta_verde_valid_until: formData.carta_verde_valid_until,
      inspecao_tvde: formData.inspecao_tvde,
      inspecao_tvde_valid_until: formData.inspecao_tvde_valid_until,
      uber_valid_until: formData.uber_valid_until,
      bolt_valid_until: formData.bolt_valid_until,
      extintor_valid_until: formData.extintor_valid_until,
      valor_caucao: formData.valor_caucao,
      valor_aluguel: formData.valor_aluguel,
      via_verde: (formData as any).via_verde,
      fotos_galeria: formData.fotos_galeria || [],
      status_cadastro: isComplete ? "ativo" : "incompleto",
      ativo: isComplete,
    };

    try {
      if (isEditing && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowIncompleteAlert(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Veículo" : "Novo Veículo"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {/* Main Photo */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="w-32 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.foto_principal_url ? (
                    <img 
                      src={formData.foto_principal_url} 
                      alt="Vehicle" 
                      className="w-full h-full object-cover"
                    />
                  ) : isUploading ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 translate-x-1/4 translate-y-1/4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="gallery">Galeria</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Plate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula *</Label>
                    <Input
                      id="matricula"
                      value={formData.matricula || ""}
                      onChange={(e) => handleChange("matricula", e.target.value.toUpperCase())}
                      placeholder="AA-00-AA"
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_matricula">Data de Matrícula</Label>
                    <Input
                      id="data_matricula"
                      type="date"
                      value={formData.data_matricula || ""}
                      onChange={(e) => handleChange("data_matricula", e.target.value)}
                    />
                  </div>
                </div>

                {/* Brand and Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca *</Label>
                    <Input
                      id="marca"
                      value={formData.marca || ""}
                      onChange={(e) => handleChange("marca", e.target.value)}
                      placeholder="Tesla, Mercedes, BMW..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo *</Label>
                    <Input
                      id="modelo"
                      value={formData.modelo || ""}
                      onChange={(e) => handleChange("modelo", e.target.value)}
                      placeholder="Model 3, Classe E..."
                    />
                  </div>
                </div>

                {/* Color and Fuel */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cor">Cor</Label>
                    <Input
                      id="cor"
                      value={formData.cor || ""}
                      onChange={(e) => handleChange("cor", e.target.value)}
                      placeholder="Branco, Preto, Cinza..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="combustivel">Combustível</Label>
                    <Select
                      value={formData.combustivel || ""}
                      onValueChange={(value) => handleChange("combustivel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gasolina">Gasolina</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Elétrico">Elétrico</SelectItem>
                        <SelectItem value="Híbrido">Híbrido</SelectItem>
                        <SelectItem value="GPL">GPL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Via Verde */}
                <div className="space-y-2">
                  <Label htmlFor="via_verde">Via Verde</Label>
                  <Input
                    id="via_verde"
                    value={(formData as any).via_verde || ""}
                    onChange={(e) => handleChange("via_verde", e.target.value)}
                    placeholder="Número do identificador Via Verde"
                  />
                </div>

                {/* Chassis and Engine */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chassi">Chassi</Label>
                    <Input
                      id="chassi"
                      value={formData.chassi || ""}
                      onChange={(e) => handleChange("chassi", e.target.value)}
                      placeholder="VIN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cilindrada">Cilindrada (cc)</Label>
                    <Input
                      id="cilindrada"
                      type="number"
                      value={formData.cilindrada || ""}
                      onChange={(e) => handleChange("cilindrada", parseInt(e.target.value) || undefined)}
                      placeholder="1600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="potencia">Potência (cv)</Label>
                    <Input
                      id="potencia"
                      type="number"
                      value={formData.potencia || ""}
                      onChange={(e) => handleChange("potencia", parseInt(e.target.value) || undefined)}
                      placeholder="120"
                    />
                  </div>
                </div>

                {/* Seats and Doors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lugares">Lugares</Label>
                    <Input
                      id="lugares"
                      type="number"
                      min={2}
                      max={9}
                      value={formData.lugares || 5}
                      onChange={(e) => handleChange("lugares", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portas">Portas</Label>
                    <Input
                      id="portas"
                      type="number"
                      min={2}
                      max={5}
                      value={formData.portas || 4}
                      onChange={(e) => handleChange("portas", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {/* Owner */}
                <div className="space-y-2">
                  <Label htmlFor="proprietario_id">Proprietário</Label>
                  <Select
                    value={formData.proprietario_id || ""}
                    onValueChange={(value) => handleChange("proprietario_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o proprietário" />
                    </SelectTrigger>
                    <SelectContent>
                      {proprietarios?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.tipo === "empresa" ? p.nome_empresa : p.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Financial Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_caucao">Caução do Veículo (€)</Label>
                    <Input
                      id="valor_caucao"
                      type="number"
                      step="0.01"
                      value={formData.valor_caucao || ""}
                      onChange={(e) => handleChange("valor_caucao", parseFloat(e.target.value) || undefined)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor_aluguel">Aluguel do Veículo (€)</Label>
                    <Input
                      id="valor_aluguel"
                      type="number"
                      step="0.01"
                      value={formData.valor_aluguel || ""}
                      onChange={(e) => handleChange("valor_aluguel", parseFloat(e.target.value) || undefined)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                {/* Carta Verde */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carta_verde">Carta Verde (Número)</Label>
                    <Input
                      id="carta_verde"
                      value={formData.carta_verde || ""}
                      onChange={(e) => handleChange("carta_verde", e.target.value)}
                      placeholder="Número da Carta Verde"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carta_verde_valid_until">Validade Carta Verde</Label>
                    <Input
                      id="carta_verde_valid_until"
                      type="date"
                      value={formData.carta_verde_valid_until || ""}
                      onChange={(e) => handleChange("carta_verde_valid_until", e.target.value)}
                    />
                  </div>
                </div>

                {/* Inspeção TVDE */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inspecao_tvde">Inspeção TVDE (Número)</Label>
                    <Input
                      id="inspecao_tvde"
                      value={formData.inspecao_tvde || ""}
                      onChange={(e) => handleChange("inspecao_tvde", e.target.value)}
                      placeholder="Número da Inspeção"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspecao_tvde_valid_until">Validade Inspeção TVDE</Label>
                    <Input
                      id="inspecao_tvde_valid_until"
                      type="date"
                      value={formData.inspecao_tvde_valid_until || ""}
                      onChange={(e) => handleChange("inspecao_tvde_valid_until", e.target.value)}
                    />
                  </div>
                </div>

                {/* Platform Validity */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="uber_valid_until">Validade Uber</Label>
                    <Input
                      id="uber_valid_until"
                      type="date"
                      value={formData.uber_valid_until || ""}
                      onChange={(e) => handleChange("uber_valid_until", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bolt_valid_until">Validade Bolt</Label>
                    <Input
                      id="bolt_valid_until"
                      type="date"
                      value={formData.bolt_valid_until || ""}
                      onChange={(e) => handleChange("bolt_valid_until", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extintor_valid_until">Validade do Extintor</Label>
                    <Input
                      id="extintor_valid_until"
                      type="date"
                      value={formData.extintor_valid_until || ""}
                      onChange={(e) => handleChange("extintor_valid_until", e.target.value)}
                    />
                  </div>
                </div>

                {/* Document Upload Area */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Carregar Documentos</h4>
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">Arraste documentos aqui ou clique para selecionar</p>
                    <Button variant="outline" size="sm">
                      Selecionar Ficheiros
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Documentos sugeridos: Documento Único Automóvel, Carta Verde, Inspeção TVDE
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4 mt-4">
                <PhotoGallery
                  photos={formData.fotos_galeria || []}
                  onPhotosChange={(photos) => handleChange("fotos_galeria", photos)}
                  bucket="vehicle-photos"
                  folder="galeria"
                  title="Galeria de Fotos do Veículo"
                  maxPhotos={30}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSaveClick} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar Alterações" : "Criar Veículo"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <IncompleteProfileAlert
        open={showIncompleteAlert}
        onOpenChange={setShowIncompleteAlert}
        missingFields={missingFields}
        entityType="veículo"
        onConfirm={() => handleSubmit(false)}
      />
    </Dialog>
  );
}
