import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, IdCard, MapPin, MessageSquare, Loader2, User, Phone, Banknote, FileText } from "lucide-react";
import { ProfilePhotoUpload } from "@/components/common/ProfilePhotoUpload";
import { PhotoGallery } from "@/components/common/PhotoGallery";
import { AddressFields } from "@/components/common/AddressFields";
import { RecibosVencimentoTab } from "./RecibosVencimentoTab";
import { CustomFieldsManager } from "@/components/common/CustomFieldsManager";
import {
  Funcionario,
  useFuncionarioAssuntos,
  useUpdateFuncionarioProfile,
} from "@/hooks/useFuncionarios";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  funcionario: Funcionario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tipoLabels: Record<string, string> = {
  gerente_geral: "Gerente Geral",
  gestor_frota: "Gestor de Frota",
  administrativo_financas: "Administrativo/Finanças",
};

export function EmployeeDetailsDialog({ funcionario, open, onOpenChange }: Props) {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const update = useUpdateFuncionarioProfile();
  const { data: assuntos = [] } = useFuncionarioAssuntos(funcionario?.id ?? null);

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");
  const [iban, setIban] = useState("");
  const [telemovel, setTelemovel] = useState("");
  const [emergNome, setEmergNome] = useState("");
  const [emergTel, setEmergTel] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [galeria, setGaleria] = useState<string[]>([]);
  const [address, setAddress] = useState({ rua: "", numero: "", complemento: "", cidade: "", cep: "" });

  const isOwnProfile = !!user && funcionario?.user_id === user.id;
  const canEditAll = isSuperAdmin || isAdmin;
  const canEditPhoto = canEditAll || isOwnProfile;

  useEffect(() => {
    if (funcionario && open) {
      setNome(funcionario.nome ?? "");
      setSobrenome(funcionario.sobrenome ?? "");
      setEmail(funcionario.email ?? "");
      setNif(funcionario.nif ?? "");
      setIban(funcionario.iban ?? "");
      setTelemovel(funcionario.telemovel ?? "");
      setEmergNome(funcionario.contato_urgencia_nome ?? "");
      setEmergTel(funcionario.contato_urgencia_telemovel ?? "");
      setFoto(funcionario.foto_perfil_url ?? null);
      setGaleria(funcionario.fotos_galeria ?? []);
      setAddress({
        rua: funcionario.endereco_rua ?? "",
        numero: funcionario.endereco_numero ?? "",
        complemento: funcionario.endereco_complemento ?? "",
        cidade: funcionario.endereco_cidade ?? "",
        cep: funcionario.endereco_cep ?? "",
      });
    }
  }, [funcionario, open]);

  if (!funcionario) return null;

  const handlePhotoChange = async (url: string) => {
    setFoto(url);
    await update.mutateAsync({ id: funcionario.id, updates: { foto_perfil_url: url } as any });
  };

  const handleGalleryChange = async (urls: string[]) => {
    setGaleria(urls);
    await update.mutateAsync({ id: funcionario.id, updates: { fotos_galeria: urls } as any });
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: funcionario.id,
      updates: {
        nome,
        sobrenome,
        nif,
        iban,
        telemovel,
        contato_urgencia_nome: emergNome,
        contato_urgencia_telemovel: emergTel,
        endereco_rua: address.rua,
        endereco_numero: address.numero,
        endereco_complemento: address.complemento,
        endereco_cidade: address.cidade,
        endereco_cep: address.cep,
      } as any,
    });
  };

  const fullName = [funcionario.nome, funcionario.sobrenome].filter(Boolean).join(" ") || funcionario.nome;
  const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do Funcionário</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-start gap-4 pb-4 border-b">
          <ProfilePhotoUpload
            currentPhoto={foto}
            onPhotoChange={handlePhotoChange}
            bucket="avatars"
            folder={`funcionarios/${funcionario.id}`}
            fallbackText={initials}
            size="lg"
            readOnly={!canEditPhoto}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold">{fullName}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{tipoLabels[funcionario.tipo] || funcionario.tipo}</Badge>
              <Badge variant={funcionario.ativo ? "default" : "secondary"}>
                {funcionario.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            {funcionario.email && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <Mail className="w-3 h-3" /> {funcionario.email}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList>
            <TabsTrigger value="dados"><User className="w-4 h-4 mr-1" />Dados</TabsTrigger>
            <TabsTrigger value="assuntos"><MessageSquare className="w-4 h-4 mr-1" />Assuntos</TabsTrigger>
            <TabsTrigger value="recibos"><FileText className="w-4 h-4 mr-1" />Recibos</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
            <TabsTrigger value="galeria">Galeria</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!canEditAll} />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} disabled={!canEditAll} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                <Input value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><IdCard className="w-3 h-3" />NIF</Label>
                <Input value={nif} onChange={(e) => setNif(e.target.value)} disabled={!canEditAll} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="w-3 h-3" />Telemóvel</Label>
                <Input value={telemovel} onChange={(e) => setTelemovel(e.target.value)} disabled={!canEditAll} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Banknote className="w-3 h-3" />IBAN</Label>
                <Input value={iban} onChange={(e) => setIban(e.target.value)} disabled={!canEditAll} />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Label className="text-sm font-medium">Contato de Emergência</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={emergNome} onChange={(e) => setEmergNome(e.target.value)} disabled={!canEditAll} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Telemóvel</Label>
                  <Input value={emergTel} onChange={(e) => setEmergTel(e.target.value)} disabled={!canEditAll} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Label className="flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" />Endereço</Label>
              {canEditAll ? (
                <AddressFields
                  address={address}
                  onChange={(field, value) => setAddress((p) => ({ ...p, [field]: value }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {[address.rua, address.numero, address.complemento, address.cidade, address.cep]
                    .filter(Boolean).join(", ") || "—"}
                </p>
              )}
            </div>

            {canEditAll && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={update.isPending}>
                  {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Alterações
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assuntos" className="pt-4">
            <h4 className="text-sm font-medium mb-3">Assuntos de Atendimento Vinculados</h4>
            {assuntos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Nenhum assunto vinculado a este funcionário.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assuntos.map((a) => (
                  <Badge key={a.id} variant={a.ativo ? "default" : "secondary"} className="text-sm py-1.5 px-3">
                    {a.nome}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recibos" className="pt-4">
            <RecibosVencimentoTab
              funcionarioId={funcionario.id}
              tenantId={funcionario.tenant_id}
              canManage={canEditAll}
            />
          </TabsContent>

          <TabsContent value="extra" className="pt-4">
            <CustomFieldsManager
              entidadeTipo="funcionario"
              entidadeId={funcionario.id}
              readOnly={!canEditAll}
            />
          </TabsContent>

          <TabsContent value="galeria" className="pt-4">
            <PhotoGallery
              photos={galeria}
              onPhotosChange={handleGalleryChange}
              bucket="avatars"
              folder={`funcionarios/${funcionario.id}/galeria`}
              title="Galeria de Arquivos"
              readOnly={!canEditPhoto}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
