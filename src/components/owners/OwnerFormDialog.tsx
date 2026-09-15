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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User, Upload, Camera, Loader2, KeyRound } from "lucide-react";
import { Proprietario, ProprietarioInsert, useCreateProprietario, useUpdateProprietario } from "@/hooks/useProprietarios";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useTenant } from "@/contexts/TenantContext";
import { AddressFields } from "@/components/common/AddressFields";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { IncompleteProfileAlert, validateOwnerProfile } from "@/components/common/IncompleteProfileAlert";
import { checkNifExists } from "@/hooks/useUniqueValidation";
import { toast } from "sonner";
import { DocumentUploadSection, UploadedDocument } from "@/components/common/DocumentUploadSection";
import { supabase } from "@/integrations/supabase/client";


// Document types for Company owners
const COMPANY_DOCUMENT_TYPES = [
  "Certidão Permanente",
  "Comprovativo de IBAN da Empresa",
  "Comprovativo de Morada da Empresa",
  "Documento de Identificação do Gerente - Passaporte",
  "Documento de Identificação do Gerente - Cartão Cidadão",
  "Documento de Identificação do Gerente - Título de Residência",
];

// Document types for Individual owners
const INDIVIDUAL_DOCUMENT_TYPES = [
  "Documento de Identificação - Passaporte",
  "Documento de Identificação - Cartão Cidadão",
  "Documento de Identificação - Título de Residência",
  "Comprovativo de Morada",
  "Comprovativo de IBAN",
];

interface OwnerFormDialogProps {
  owner?: Proprietario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  forceType?: "empresa" | "pessoa_fisica";
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

export function OwnerFormDialog({
  owner,
  open,
  onOpenChange,
  onSuccess,
  forceType,
}: OwnerFormDialogProps) {
  const isEditing = !!owner;
  const { tenant } = useTenant();
  const createMutation = useCreateProprietario();
  const updateMutation = useUpdateProprietario();
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [formData, setFormData] = useState<Partial<ProprietarioInsert> & { fotos_galeria?: string[]; documentos?: UploadedDocument[] }>({
    tipo: "pessoa_fisica",
    nome_completo: "",
    nome_empresa: "",
    nif: "",
    email: "",
    telemovel: "",
    iban: "",
    estado_civil: undefined,
    filhos: 0,
    data_nascimento: undefined,
    foto_perfil_url: undefined,
    nome_gerente: "",
    capital_social: undefined,
    certidao_permanente: "",
    certidao_valid_until: undefined,
    certificado_tvde: "",
    certificado_tvde_valid_until: undefined,
    cartao_frota: "",
    tipo_documento: undefined,
    numero_documento: "",
    documento_valid_until: undefined,
    fotos_galeria: [],
    documentos: [],
  });

  const [address, setAddress] = useState<AddressData>({
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    cep: "",
  });

  useEffect(() => {
    if (owner) {
      setFormData({
        tipo: owner.tipo,
        nome_completo: owner.nome_completo || "",
        nome_empresa: owner.nome_empresa || "",
        nif: owner.nif || "",
        email: owner.email || "",
        telemovel: owner.telemovel || "",
        iban: owner.iban || "",
        estado_civil: owner.estado_civil || undefined,
        filhos: owner.filhos || 0,
        data_nascimento: owner.data_nascimento || undefined,
        foto_perfil_url: owner.foto_perfil_url || undefined,
        nome_gerente: owner.nome_gerente || "",
        capital_social: owner.capital_social || undefined,
        certidao_permanente: owner.certidao_permanente || "",
        certidao_valid_until: owner.certidao_valid_until || undefined,
        certificado_tvde: owner.certificado_tvde || "",
        certificado_tvde_valid_until: owner.certificado_tvde_valid_until || undefined,
        cartao_frota: (owner as any).cartao_frota || "",
        tipo_documento: owner.tipo_documento || undefined,
        numero_documento: owner.numero_documento || "",
        documento_valid_until: owner.documento_valid_until || undefined,
        fotos_galeria: (owner as any).fotos_galeria || [],
        documentos: [],
      });
      setAddress({
        rua: (owner as any).endereco_rua || "",
        numero: (owner as any).endereco_numero || "",
        complemento: (owner as any).endereco_complemento || "",
        cidade: (owner as any).endereco_cidade || "",
        cep: (owner as any).endereco_cep || "",
      });
    } else {
      setFormData({
        tipo: forceType || "pessoa_fisica",
        nome_completo: "",
        nome_empresa: "",
        nif: "",
        email: "",
        telemovel: "",
        iban: "",
        estado_civil: undefined,
        filhos: 0,
        data_nascimento: undefined,
        foto_perfil_url: undefined,
        nome_gerente: "",
        capital_social: undefined,
        certidao_permanente: "",
        certidao_valid_until: undefined,
        certificado_tvde: "",
        certificado_tvde_valid_until: undefined,
        cartao_frota: "",
        tipo_documento: undefined,
        numero_documento: "",
        documento_valid_until: undefined,
        fotos_galeria: [],
        documentos: [],
      });
      setAddress({
        rua: "",
        numero: "",
        complemento: "",
        cidade: "",
        cep: "",
      });
      setLoginPassword("");
      setConfirmPassword("");
    }
  }, [owner, open, forceType]);

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
        folder: "proprietarios",
      });
      handleChange("foto_perfil_url", url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const needsAccount = !isEditing || (isEditing && !owner?.user_id);
  const hasExistingAccount = isEditing && !!owner?.user_id;

  const handleSaveClick = async () => {
    if (!tenant?.id) return;

    const isEmpresa = formData.tipo === "empresa";
    
    if (isEmpresa && !formData.nome_empresa) {
      return;
    }
    if (!isEmpresa && !formData.nome_completo) {
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

    // For new owners, password is mandatory
    if (!isEditing && (!loginPassword || loginPassword.length < 6)) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (formData.nif) {
      const nifExists = await checkNifExists(formData.nif, owner?.id, "proprietarios");
      if (nifExists) {
        toast.error("Já existe um proprietário cadastrado com este NIF");
        return;
      }
    }

    const validation = validateOwnerProfile(formData, address, isEmpresa);
    
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

    const payload: any = {
      tenant_id: tenant.id,
      tipo: formData.tipo || "pessoa_fisica",
      nome_completo: formData.tipo === "pessoa_fisica" ? formData.nome_completo : formData.nome_gerente,
      nome_empresa: formData.tipo === "empresa" ? formData.nome_empresa : undefined,
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
      nome_gerente: formData.tipo === "empresa" ? formData.nome_gerente : undefined,
      capital_social: formData.tipo === "empresa" ? formData.capital_social : undefined,
      certidao_permanente: formData.tipo === "empresa" ? formData.certidao_permanente : undefined,
      certidao_valid_until: formData.tipo === "empresa" ? formData.certidao_valid_until : undefined,
      certificado_tvde: formData.tipo === "empresa" ? formData.certificado_tvde : undefined,
      certificado_tvde_valid_until: formData.tipo === "empresa" ? formData.certificado_tvde_valid_until : undefined,
      cartao_frota: (formData as any).cartao_frota,
      tipo_documento: formData.tipo === "pessoa_fisica" ? formData.tipo_documento : undefined,
      numero_documento: formData.tipo === "pessoa_fisica" ? formData.numero_documento : undefined,
      documento_valid_until: formData.tipo === "pessoa_fisica" ? formData.documento_valid_until : undefined,
      fotos_galeria: formData.fotos_galeria || [],
      status_cadastro: isComplete ? "ativo" : "incompleto",
      ativo: isComplete,
    };

    try {
      let entityId: string;
      if (isEditing && owner) {
        await updateMutation.mutateAsync({ id: owner.id, ...payload });
        entityId = owner.id;
      } else {
        const result = await createMutation.mutateAsync(payload);
        entityId = (result as any)?.id || "";
      }

      // Create user account (for new owners or existing ones without user_id)
      if (needsAccount && formData.email && loginPassword && entityId) {
        setIsCreatingAccount(true);
        try {
          const response = await supabase.functions.invoke("create-user-account", {
            body: {
              email: formData.email,
              password: loginPassword,
              nome_completo: formData.tipo === "empresa" ? formData.nome_gerente : formData.nome_completo,
              role: "proprietario",
              tenant_id: tenant!.id,
              entity_table: "proprietarios",
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
      if (hasExistingAccount && loginPassword && owner?.user_id) {
        setIsCreatingAccount(true);
        try {
          const response = await supabase.functions.invoke("create-user-account", {
            body: {
              action: "update_password",
              user_id: owner.user_id,
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
  const isEmpresa = formData.tipo === "empresa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Proprietário" : "Novo Proprietário"}
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

            {/* Type Selection - hidden when forceType is set */}
            {!forceType && (
              <div className="space-y-2">
                <Label>Tipo de Proprietário</Label>
                <RadioGroup
                  value={formData.tipo}
                  onValueChange={(value) => handleChange("tipo", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pessoa_fisica" id="pessoa_fisica" />
                    <Label htmlFor="pessoa_fisica" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Particular
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empresa" id="empresa" />
                    <Label htmlFor="empresa" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="w-4 h-4" />
                      Empresa
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="documents">Documentação</TabsTrigger>
                <TabsTrigger value="gallery">Galeria</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Name Fields */}
                {isEmpresa ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                      <Input
                        id="nome_empresa"
                        value={formData.nome_empresa || ""}
                        onChange={(e) => handleChange("nome_empresa", e.target.value)}
                        placeholder="Nome da Empresa Lda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome_gerente">Nome do Gerente *</Label>
                      <Input
                        id="nome_gerente"
                        value={formData.nome_gerente || ""}
                        onChange={(e) => handleChange("nome_gerente", e.target.value)}
                        placeholder="Nome Completo do Gerente"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      value={formData.nome_completo || ""}
                      onChange={(e) => handleChange("nome_completo", e.target.value)}
                      placeholder="Nome Completo"
                    />
                  </div>
                )}

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
                        ? "Este proprietário ainda não possui conta de acesso. Defina uma senha para ativá-la:"
                        : "O email acima será usado como login. Defina uma senha para o proprietário:"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="login_password_owner">
                        {hasExistingAccount ? "Nova Senha" : "Senha"} {!isEditing && "*"}
                      </Label>
                      <Input
                        id="login_password_owner"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={hasExistingAccount ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password_owner">
                        {hasExistingAccount ? "Confirmar Nova Senha" : "Confirmar Senha"} {!isEditing && "*"}
                      </Label>
                      <Input
                        id="confirm_password_owner"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone and IBAN */}
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

                {/* Personal Info - Only for Pessoa Física */}
                {!isEmpresa && (
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
                )}

                {/* Company Specific - Dados da Empresa + Dados do Gerente */}
                {isEmpresa && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">Dados da Empresa</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="capital_social">Capital Social (€)</Label>
                          <Input
                            id="capital_social"
                            type="number"
                            value={formData.capital_social || ""}
                            onChange={(e) => handleChange("capital_social", parseFloat(e.target.value) || undefined)}
                            placeholder="50000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">Dados do Gerente</h4>
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
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <AddressFields address={address} onChange={handleAddressChange} />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                {isEmpresa ? (
                  <>
                    {/* Certidão Permanente */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="certidao_permanente">Código Certidão Permanente</Label>
                        <Input
                          id="certidao_permanente"
                          value={formData.certidao_permanente || ""}
                          onChange={(e) => handleChange("certidao_permanente", e.target.value)}
                          placeholder="1234-5678-9012"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certidao_valid_until">Validade Certidão</Label>
                        <Input
                          id="certidao_valid_until"
                          type="date"
                          value={formData.certidao_valid_until || ""}
                          onChange={(e) => handleChange("certidao_valid_until", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* TVDE Certificate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="certificado_tvde">Certificado TVDE</Label>
                        <Input
                          id="certificado_tvde"
                          value={formData.certificado_tvde || ""}
                          onChange={(e) => handleChange("certificado_tvde", e.target.value)}
                          placeholder="TVDE-2024-0045"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certificado_tvde_valid_until">Validade Certificado TVDE</Label>
                        <Input
                          id="certificado_tvde_valid_until"
                          type="date"
                          value={formData.certificado_tvde_valid_until || ""}
                          onChange={(e) => handleChange("certificado_tvde_valid_until", e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Documento de Identificação */}
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

                    <div className="grid grid-cols-2 gap-4">
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
                  </>
                )}

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

                {/* Document Upload Section */}
                <div className="border-t pt-4 mt-4">
                  <DocumentUploadSection
                    title="Carregar Documentos"
                    predefinedTypes={isEmpresa ? COMPANY_DOCUMENT_TYPES : INDIVIDUAL_DOCUMENT_TYPES}
                    documents={formData.documentos || []}
                    onDocumentsChange={(docs) => handleChange("documentos", docs)}
                    bucket="documents"
                    folder={`proprietarios/${formData.tipo}`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4 mt-4">
                <PhotoGallery
                  photos={formData.fotos_galeria || []}
                  onPhotosChange={(photos) => handleChange("fotos_galeria", photos)}
                  bucket="avatars"
                  folder="proprietarios/galeria"
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
            {isEditing ? "Guardar Alterações" : "Criar Proprietário"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <IncompleteProfileAlert
        open={showIncompleteAlert}
        onOpenChange={setShowIncompleteAlert}
        missingFields={missingFields}
        entityType="proprietário"
        onConfirm={() => handleSubmit(false)}
      />
    </Dialog>
  );
}
