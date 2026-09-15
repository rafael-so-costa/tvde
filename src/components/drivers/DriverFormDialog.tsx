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
import { Upload, Camera, Loader2, KeyRound } from "lucide-react";
import { Motorista, MotoristaInsert, useCreateMotorista, useUpdateMotorista } from "@/hooks/useMotoristas";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useTenant } from "@/contexts/TenantContext";
import { AddressFields } from "@/components/common/AddressFields";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { IncompleteProfileAlert, validateDriverProfile } from "@/components/common/IncompleteProfileAlert";
import { checkNifExists } from "@/hooks/useUniqueValidation";
import { toast } from "sonner";
import { DriverDocumentUpload, DriverDocument } from "./DriverDocumentUpload";
import { supabase } from "@/integrations/supabase/client";


interface DriverFormDialogProps {
  driver?: Motorista | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const estadoCivilOptions = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_facto", label: "União de Facto" },
];

const tipoDocumentoOptions = [
  { value: "cartao_cidadao", label: "Cartão de Cidadão" },
  { value: "passaporte", label: "Passaporte" },
  { value: "titulo_residencia", label: "Título de Residência" },
];

interface AddressData {
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  cep: string;
}

export function DriverFormDialog({
  driver,
  open,
  onOpenChange,
  onSuccess,
}: DriverFormDialogProps) {
  const isEditing = !!driver;
  const { tenant } = useTenant();
  const createMutation = useCreateMotorista();
  const updateMutation = useUpdateMotorista();
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [formData, setFormData] = useState<Partial<MotoristaInsert> & { fotos_galeria?: string[] }>({
    nome_completo: "",
    nif: "",
    email: "",
    telemovel: "",
    iban: "",
    estado_civil: undefined,
    filhos: 0,
    data_nascimento: undefined,
    foto_perfil_url: undefined,
    tipo_documento: undefined,
    numero_documento: "",
    documento_valid_until: undefined,
    carta_numero: "",
    carta_valid_until: undefined,
    registo_criminal_valid_until: undefined,
    fotos_galeria: [],
    bolt_email: "",
    bolt_telemovel: "",
    uber_email: "",
    uber_telemovel: "",
    certificado_tvde: "",
    certificado_tvde_valid_until: undefined,
    cartao_frota: "",
    contato_urgencia_nome: "",
    contato_urgencia_telemovel: "",
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<DriverDocument[]>([]);

  const [address, setAddress] = useState<AddressData>({
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    cep: "",
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        nome_completo: driver.nome_completo || "",
        nif: driver.nif || "",
        email: driver.email || "",
        telemovel: driver.telemovel || "",
        iban: driver.iban || "",
        estado_civil: driver.estado_civil || undefined,
        filhos: driver.filhos || 0,
        data_nascimento: driver.data_nascimento || undefined,
        foto_perfil_url: driver.foto_perfil_url || undefined,
        tipo_documento: driver.tipo_documento || undefined,
        numero_documento: driver.numero_documento || "",
        documento_valid_until: driver.documento_valid_until || undefined,
        carta_numero: driver.carta_numero || "",
        carta_valid_until: driver.carta_valid_until || undefined,
        registo_criminal_valid_until: driver.registo_criminal_valid_until || undefined,
        fotos_galeria: (driver as any).fotos_galeria || [],
        bolt_email: (driver as any).bolt_email || "",
        bolt_telemovel: (driver as any).bolt_telemovel || "",
        uber_email: (driver as any).uber_email || "",
        uber_telemovel: (driver as any).uber_telemovel || "",
        certificado_tvde: (driver as any).certificado_tvde || "",
        certificado_tvde_valid_until: (driver as any).certificado_tvde_valid_until || undefined,
        cartao_frota: (driver as any).cartao_frota || "",
        contato_urgencia_nome: (driver as any).contato_urgencia_nome || "",
        contato_urgencia_telemovel: (driver as any).contato_urgencia_telemovel || "",
      });
      setAddress({
        rua: (driver as any).endereco_rua || "",
        numero: (driver as any).endereco_numero || "",
        complemento: (driver as any).endereco_complemento || "",
        cidade: (driver as any).endereco_cidade || "",
        cep: (driver as any).endereco_cep || "",
      });
      // Load existing documents if available
      const existingDocs = (driver as any).documentos_upload || [];
      setUploadedDocuments(Array.isArray(existingDocs) ? existingDocs : []);
    } else {
      setFormData({
        nome_completo: "",
        nif: "",
        email: "",
        telemovel: "",
        iban: "",
        estado_civil: undefined,
        filhos: 0,
        data_nascimento: undefined,
        foto_perfil_url: undefined,
        tipo_documento: undefined,
        numero_documento: "",
        documento_valid_until: undefined,
        carta_numero: "",
        carta_valid_until: undefined,
        registo_criminal_valid_until: undefined,
        fotos_galeria: [],
        bolt_email: "",
        bolt_telemovel: "",
        uber_email: "",
        uber_telemovel: "",
        certificado_tvde: "",
        certificado_tvde_valid_until: undefined,
        cartao_frota: "",
        contato_urgencia_nome: "",
        contato_urgencia_telemovel: "",
      });
      setAddress({
        rua: "",
        numero: "",
        complemento: "",
        cidade: "",
        cep: "",
      });
      setUploadedDocuments([]);
      setLoginPassword("");
      setConfirmPassword("");
    }
  }, [driver, open]);

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
        folder: "motoristas",
      });
      handleChange("foto_perfil_url", url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const needsAccount = !isEditing || (isEditing && !driver?.user_id);
  const hasExistingAccount = isEditing && !!driver?.user_id;

  const handleSaveClick = async () => {
    if (!tenant?.id) return;

    if (!formData.nome_completo) {
      return;
    }

    // Validate password fields if filled
    if (loginPassword) {
      if (!formData.email) {
        toast.error("Email é obrigatório para criar a conta de acesso");
        return;
      }
      if (loginPassword.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
      }
      if (loginPassword !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    // For new drivers, password is mandatory
    if (!isEditing && (!loginPassword || loginPassword.length < 6)) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (formData.nif) {
      const nifExists = await checkNifExists(formData.nif, driver?.id, "motoristas");
      if (nifExists) {
        toast.error("Já existe um motorista cadastrado com este NIF");
        return;
      }
    }

    const validation = validateDriverProfile(formData, address);
    
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

    if (!formData.nome_completo) {
      return;
    }

    const payload: any = {
      tenant_id: tenant.id,
      nome_completo: formData.nome_completo,
      nif: formData.nif,
      email: formData.email,
      telemovel: formData.telemovel,
      endereco_rua: address.rua,
      endereco_numero: address.numero,
      endereco_complemento: address.complemento,
      endereco_cidade: address.cidade,
      endereco_cep: address.cep,
      iban: formData.iban,
      estado_civil: formData.estado_civil,
      filhos: formData.filhos,
      data_nascimento: formData.data_nascimento,
      foto_perfil_url: formData.foto_perfil_url,
      tipo_documento: formData.tipo_documento,
      numero_documento: formData.numero_documento,
      documento_valid_until: formData.documento_valid_until,
      carta_numero: formData.carta_numero,
      carta_valid_until: formData.carta_valid_until,
      registo_criminal_valid_until: formData.registo_criminal_valid_until,
      fotos_galeria: formData.fotos_galeria || [],
      bolt_email: formData.bolt_email,
      bolt_telemovel: formData.bolt_telemovel,
      uber_email: formData.uber_email,
      uber_telemovel: formData.uber_telemovel,
      certificado_tvde: formData.certificado_tvde,
      certificado_tvde_valid_until: formData.certificado_tvde_valid_until,
      cartao_frota: formData.cartao_frota,
      contato_urgencia_nome: formData.contato_urgencia_nome,
      contato_urgencia_telemovel: formData.contato_urgencia_telemovel,
      documentos_upload: uploadedDocuments,
      status_cadastro: isComplete ? "ativo" : "incompleto",
      ativo: isComplete,
    };

    try {
      let entityId: string;
      if (isEditing && driver) {
        await updateMutation.mutateAsync({ id: driver.id, ...payload });
        entityId = driver.id;
      } else {
        const result = await createMutation.mutateAsync(payload);
        entityId = (result as any)?.id || "";
      }

      // Create user account (for new drivers or existing ones without user_id)
      if (needsAccount && formData.email && loginPassword && entityId) {
        setIsCreatingAccount(true);
        try {
          const response = await supabase.functions.invoke("create-user-account", {
            body: {
              email: formData.email,
              password: loginPassword,
              nome_completo: formData.nome_completo,
              role: "motorista",
              tenant_id: tenant.id,
              entity_table: "motoristas",
              entity_id: entityId,
            },
          });
          if (response.error || response.data?.error) {
            toast.error(`Erro ao criar conta: ${response.data?.error || response.error?.message}`);
          } else {
            toast.success("Conta de acesso criada com sucesso!");
          }
        } catch (err: any) {
          toast.error(`Erro ao criar conta: ${err.message}`);
        } finally {
          setIsCreatingAccount(false);
        }
      }

      // Update password for existing account
      if (hasExistingAccount && loginPassword && driver?.user_id) {
        setIsCreatingAccount(true);
        try {
          const response = await supabase.functions.invoke("create-user-account", {
            body: {
              action: "update_password",
              user_id: driver.user_id,
              password: loginPassword,
            },
          });
          if (response.error || response.data?.error) {
            toast.error(`Erro ao atualizar senha: ${response.data?.error || response.error?.message}`);
          } else {
            toast.success("Senha atualizada com sucesso!");
          }
        } catch (err: any) {
          toast.error(`Erro ao atualizar senha: ${err.message}`);
        } finally {
          setIsCreatingAccount(false);
        }
      }

      setShowIncompleteAlert(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || isCreatingAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Motorista" : "Novo Motorista"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.foto_perfil_url ? (
                    <img 
                      src={formData.foto_perfil_url} 
                      alt="Profile" 
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
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="platforms">Plataformas</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="documents">Documentação</TabsTrigger>
                <TabsTrigger value="gallery">Galeria</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo || ""}
                    onChange={(e) => handleChange("nome_completo", e.target.value)}
                    placeholder="Nome Completo"
                  />
                </div>

                {/* NIF and Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nif">NIF *</Label>
                    <Input
                      id="nif"
                      value={formData.nif || ""}
                      onChange={(e) => handleChange("nif", e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="email@exemplo.pt"
                    />
                  </div>
                </div>

                {/* Credenciais de Acesso - always visible */}
                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Credenciais de Acesso</Label>
                    {hasExistingAccount && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
                        Conta ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasExistingAccount
                      ? "Deixe os campos de senha vazios para manter a senha atual. Preencha apenas se quiser alterar."
                      : needsAccount && isEditing
                        ? "Este motorista ainda não possui conta de acesso. Defina uma senha para ativá-la:"
                        : "O email acima será usado como login. Defina uma senha para o motorista:"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="login_password">
                        {hasExistingAccount ? "Nova Senha" : "Senha"} {!isEditing && "*"}
                      </Label>
                      <Input
                        id="login_password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={hasExistingAccount ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">
                        {hasExistingAccount ? "Confirmar Nova Senha" : "Confirmar Senha"} {!isEditing && "*"}
                      </Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telemovel">Telemóvel</Label>
                    <Input
                      id="telemovel"
                      value={formData.telemovel || ""}
                      onChange={(e) => handleChange("telemovel", e.target.value)}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={formData.iban || ""}
                      onChange={(e) => handleChange("iban", e.target.value)}
                      placeholder="PT50 0002 0123 1234 5678 9015 4"
                    />
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento || ""}
                      onChange={(e) => handleChange("data_nascimento", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Select
                      value={formData.estado_civil || ""}
                      onValueChange={(value) => handleChange("estado_civil", value)}
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
                    <Label htmlFor="filhos">Filhos</Label>
                    <Input
                      id="filhos"
                      type="number"
                      min={0}
                      value={formData.filhos || 0}
                      onChange={(e) => handleChange("filhos", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Contato de Urgência</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contato_urgencia_nome">Nome do Contato de Urgência</Label>
                      <Input
                        id="contato_urgencia_nome"
                        value={formData.contato_urgencia_nome || ""}
                        onChange={(e) => handleChange("contato_urgencia_nome", e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contato_urgencia_telemovel">Telemóvel de Urgência</Label>
                      <Input
                        id="contato_urgencia_telemovel"
                        value={formData.contato_urgencia_telemovel || ""}
                        onChange={(e) => handleChange("contato_urgencia_telemovel", e.target.value)}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="platforms" className="space-y-4 mt-4">
                {/* Bolt */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-4 text-green-600">Bolt</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bolt_email">Email da Bolt</Label>
                      <Input
                        id="bolt_email"
                        type="email"
                        value={formData.bolt_email || ""}
                        onChange={(e) => handleChange("bolt_email", e.target.value)}
                        placeholder="email@bolt.eu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bolt_telemovel">Telemóvel registado na Bolt</Label>
                      <Input
                        id="bolt_telemovel"
                        value={formData.bolt_telemovel || ""}
                        onChange={(e) => handleChange("bolt_telemovel", e.target.value)}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>
                </div>

                {/* Uber */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-4 text-black">Uber</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uber_email">Email da Uber</Label>
                      <Input
                        id="uber_email"
                        type="email"
                        value={formData.uber_email || ""}
                        onChange={(e) => handleChange("uber_email", e.target.value)}
                        placeholder="email@uber.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uber_telemovel">Telemóvel registado na Uber</Label>
                      <Input
                        id="uber_telemovel"
                        value={formData.uber_telemovel || ""}
                        onChange={(e) => handleChange("uber_telemovel", e.target.value)}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <AddressFields address={address} onChange={handleAddressChange} />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                {/* Documento de Identificação - Info Fields */}
                <div>
                  <h4 className="font-medium mb-4">Informação do Documento de Identificação</h4>
                  <div className="space-y-2">
                    <Label>Tipo de Documento de Identificação</Label>
                    <Select
                      value={formData.tipo_documento || ""}
                      onValueChange={(value) => handleChange("tipo_documento", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de documento" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoDocumentoOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero_documento">Número do Documento</Label>
                      <Input
                        id="numero_documento"
                        value={formData.numero_documento || ""}
                        onChange={(e) => handleChange("numero_documento", e.target.value)}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="documento_valid_until">Validade do Documento</Label>
                      <Input
                        id="documento_valid_until"
                        type="date"
                        value={formData.documento_valid_until || ""}
                        onChange={(e) => handleChange("documento_valid_until", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Carta de Condução */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Carta de Condução</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="carta_numero">Número da Carta</Label>
                      <Input
                        id="carta_numero"
                        value={formData.carta_numero || ""}
                        onChange={(e) => handleChange("carta_numero", e.target.value)}
                        placeholder="P-1234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carta_valid_until">Validade da Carta</Label>
                      <Input
                        id="carta_valid_until"
                        type="date"
                        value={formData.carta_valid_until || ""}
                        onChange={(e) => handleChange("carta_valid_until", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Registo Criminal */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Registo Criminal</h4>
                  <div className="space-y-2">
                    <Label htmlFor="registo_criminal_valid_until">Validade do Registo Criminal</Label>
                    <Input
                      id="registo_criminal_valid_until"
                      type="date"
                      value={formData.registo_criminal_valid_until || ""}
                      onChange={(e) => handleChange("registo_criminal_valid_until", e.target.value)}
                    />
                  </div>
                </div>

                {/* Certificado TVDE */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Certificado TVDE</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certificado_tvde">Número do Certificado TVDE</Label>
                      <Input
                        id="certificado_tvde"
                        value={formData.certificado_tvde || ""}
                        onChange={(e) => handleChange("certificado_tvde", e.target.value)}
                        placeholder="TVDE-123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificado_tvde_valid_until">Validade do Certificado TVDE</Label>
                      <Input
                        id="certificado_tvde_valid_until"
                        type="date"
                        value={formData.certificado_tvde_valid_until || ""}
                        onChange={(e) => handleChange("certificado_tvde_valid_until", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Cartão Frota */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Cartão Frota</h4>
                  <div className="space-y-2">
                    <Label htmlFor="cartao_frota">Número do Cartão Frota</Label>
                    <Input
                      id="cartao_frota"
                      value={(formData as any).cartao_frota || ""}
                      onChange={(e) => handleChange("cartao_frota", e.target.value)}
                      placeholder="Ex: 1234-5678-9012"
                    />
                  </div>
                </div>

                {/* Upload de Documentos - Último */}
                <div className="border-t pt-4 mt-4">
                  <DriverDocumentUpload
                    documents={uploadedDocuments}
                    onDocumentsChange={setUploadedDocuments}
                    bucket="documents"
                    folder="motoristas"
                  />
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4 mt-4">
                <PhotoGallery
                  photos={formData.fotos_galeria || []}
                  onPhotosChange={(photos) => handleChange("fotos_galeria", photos)}
                  bucket="avatars"
                  folder="motoristas/galeria"
                  title="Galeria de Fotos"
                  maxPhotos={20}
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
            {isEditing ? "Guardar Alterações" : "Criar Motorista"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <IncompleteProfileAlert
        open={showIncompleteAlert}
        onOpenChange={setShowIncompleteAlert}
        missingFields={missingFields}
        entityType="motorista"
        onConfirm={() => handleSubmit(false)}
      />
    </Dialog>
  );
}
