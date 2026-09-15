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
import { Camera, Loader2, Upload } from "lucide-react";
import { useCreateEmpresa, useUpdateEmpresa, Empresa } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { AddressFields } from "@/components/common/AddressFields";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { CompanyDocumentsManager } from "@/components/companies/CompanyDocumentsManager";
import { toast } from "sonner";

const estadoCivilOptions = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_facto", label: "União de Facto" },
];

// Document types for Companies
const COMPANY_DOCUMENT_TYPES = [
  "Certidão Permanente",
  "Comprovativo de IBAN da Empresa",
  "Comprovativo de Morada da Empresa",
  "Documento de Identificação do Gerente - Passaporte",
  "Documento de Identificação do Gerente - Cartão Cidadão",
  "Documento de Identificação do Gerente - Título de Residência",
  "Licença TVDE",
];

interface CompanyFormDialogNewProps {
  company?: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddressData {
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  cep: string;
}

export function CompanyFormDialogNew({
  company,
  open,
  onOpenChange,
}: CompanyFormDialogNewProps) {
  const { profile } = useAuth();
  const createMutation = useCreateEmpresa();
  const updateMutation = useUpdateEmpresa();
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!company;

  const [formData, setFormData] = useState({
    nome_empresa: "",
    nif: "",
    email: "",
    telemovel: "",
    nome_gerente: "",
    data_nascimento_gerente: "",
    estado_civil_gerente: "",
    filhos_gerente: 0,
    iban: "",
    capital_social: "",
    certificado_tvde: "",
    certificado_tvde_valid_until: "",
    logo_url: "" as string | null,
    fotos_galeria: [] as string[],
  });

  const [address, setAddress] = useState<AddressData>({
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    cep: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        nome_empresa: company.nome_empresa || "",
        nif: company.nif || "",
        email: company.email || "",
        telemovel: company.telemovel || "",
        nome_gerente: company.nome_gerente || "",
        data_nascimento_gerente: (company as any).data_nascimento_gerente || "",
        estado_civil_gerente: (company as any).estado_civil_gerente || "",
        filhos_gerente: (company as any).filhos_gerente || 0,
        iban: company.iban || "",
        capital_social: company.capital_social?.toString() || "",
        certificado_tvde: company.certificado_tvde || "",
        certificado_tvde_valid_until: company.certificado_tvde_valid_until || "",
        logo_url: company.logo_url || null,
        fotos_galeria: (company as any).fotos_galeria || [],
      });
      setAddress({
        rua: company.endereco_rua || "",
        numero: company.endereco_numero || "",
        complemento: company.endereco_complemento || "",
        cidade: company.endereco_cidade || "",
        cep: company.endereco_cep || "",
      });
    } else {
      setFormData({
        nome_empresa: "",
        nif: "",
        email: "",
        telemovel: "",
        nome_gerente: "",
        data_nascimento_gerente: "",
        estado_civil_gerente: "",
        filhos_gerente: 0,
        iban: "",
        capital_social: "",
        certificado_tvde: "",
        certificado_tvde_valid_until: "",
        logo_url: null,
        fotos_galeria: [],
      });
      setAddress({
        rua: "",
        numero: "",
        complemento: "",
        cidade: "",
        cep: "",
      });
    }
  }, [company, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof AddressData, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await upload(file, {
        bucket: "avatars",
        folder: "empresas",
      });
      handleChange("logo_url", url);
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.tenant_id) {
      return;
    }

    const payload = {
      nome_empresa: formData.nome_empresa,
      nif: formData.nif,
      email: formData.email || null,
      telemovel: formData.telemovel || null,
      nome_gerente: formData.nome_gerente || null,
      endereco_rua: address.rua || null,
      endereco_numero: address.numero || null,
      endereco_complemento: address.complemento || null,
      endereco_cep: address.cep || null,
      endereco_cidade: address.cidade || null,
      iban: formData.iban || null,
      capital_social: formData.capital_social ? parseFloat(formData.capital_social) : null,
      certificado_tvde: formData.certificado_tvde || null,
      certificado_tvde_valid_until: formData.certificado_tvde_valid_until || null,
      logo_url: formData.logo_url,
    };

    if (isEditing && company) {
      updateMutation.mutate(
        { id: company.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(
        { ...payload, tenant_id: profile.tenant_id },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Empresa" : "Nova Empresa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {/* Profile Photo / Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.logo_url ? (
                    <img 
                      src={formData.logo_url} 
                      alt="Logo da Empresa" 
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
                  type="button"
                  size="icon" 
                  variant="outline" 
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="documents">Documentação</TabsTrigger>
                <TabsTrigger value="gallery">Galeria</TabsTrigger>
              </TabsList>

              {/* Basic Data Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                    <Input
                      id="nome_empresa"
                      value={formData.nome_empresa}
                      onChange={(e) => handleChange("nome_empresa", e.target.value)}
                      placeholder="Nome da Empresa Lda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_gerente">Nome do Gerente</Label>
                    <Input
                      id="nome_gerente"
                      value={formData.nome_gerente}
                      onChange={(e) => handleChange("nome_gerente", e.target.value)}
                      placeholder="Nome Completo do Gerente"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento_gerente">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento_gerente"
                      type="date"
                      value={formData.data_nascimento_gerente}
                      onChange={(e) => handleChange("data_nascimento_gerente", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado_civil_gerente">Estado Civil</Label>
                    <Select
                      value={formData.estado_civil_gerente}
                      onValueChange={(value) => handleChange("estado_civil_gerente", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadoCivilOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filhos_gerente">Filhos</Label>
                    <Input
                      id="filhos_gerente"
                      type="number"
                      min={0}
                      value={formData.filhos_gerente}
                      onChange={(e) => handleChange("filhos_gerente", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nif">NIF *</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={(e) => handleChange("nif", e.target.value)}
                      placeholder="123456789"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="empresa@exemplo.pt"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telemovel">Telemóvel</Label>
                    <Input
                      id="telemovel"
                      value={formData.telemovel}
                      onChange={(e) => handleChange("telemovel", e.target.value)}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => handleChange("iban", e.target.value)}
                      placeholder="PT50 0002 0123 1234 5678 9015 4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capital_social">Capital Social (€)</Label>
                    <Input
                      id="capital_social"
                      type="number"
                      step="0.01"
                      value={formData.capital_social}
                      onChange={(e) => handleChange("capital_social", e.target.value)}
                      placeholder="50000.00"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Licença TVDE
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certificado_tvde">Número da Licença</Label>
                      <Input
                        id="certificado_tvde"
                        value={formData.certificado_tvde}
                        onChange={(e) => handleChange("certificado_tvde", e.target.value)}
                        placeholder="TVDE-2024-XXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificado_tvde_valid_until">Validade</Label>
                      <Input
                        id="certificado_tvde_valid_until"
                        type="date"
                        value={formData.certificado_tvde_valid_until}
                        onChange={(e) => handleChange("certificado_tvde_valid_until", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <AddressFields address={address} onChange={handleAddressChange} />
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                {isEditing && company ? (
                  <CompanyDocumentsManager empresaId={company.id} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-muted rounded-lg">
                    <p className="text-sm">
                      Guarde a empresa primeiro para poder anexar documentos.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="space-y-4 mt-4">
                <PhotoGallery
                  photos={formData.fotos_galeria}
                  onPhotosChange={(photos) => handleChange("fotos_galeria", photos)}
                  bucket="avatars"
                  folder="empresas/gallery"
                  coverPhoto={formData.logo_url}
                  onCoverPhotoChange={(url) => handleChange("logo_url", url)}
                  showSetCoverOption
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Guardar Alterações" : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
