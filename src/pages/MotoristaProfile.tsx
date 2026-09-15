import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  User,
  Phone,
  Mail,
  MapPin,
  IdCard,
  Car,
  Camera,
} from "lucide-react";

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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="font-medium mt-0.5 text-sm">{value || "-"}</p>
    </div>
  );
}

function DocumentField({ label, expiry }: { label: string; expiry: string | null }) {
  if (!expiry) return <InfoField label={label} value="-" />;
  const isExpiring = new Date(expiry) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const isExpired = new Date(expiry) < new Date();
  return (
    <div>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="font-medium text-sm">{new Date(expiry).toLocaleDateString("pt-PT")}</p>
        {isExpired ? (
          <Badge variant="destructive" className="text-xs">Expirado</Badge>
        ) : isExpiring ? (
          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">A expirar</Badge>
        ) : null}
      </div>
    </div>
  );
}

export default function MotoristaProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: motorista } = useQuery({
    queryKey: ["motorista-full-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("motoristas")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (motorista?.foto_perfil_url) {
      setPhotoPreview(motorista.foto_perfil_url);
    }
  }, [motorista]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const ext = file.name.split(".").pop();
      const path = `motoristas/${user?.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const photoUrl = urlData.publicUrl + `?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("motoristas")
        .update({ foto_perfil_url: photoUrl })
        .eq("user_id", user?.id);
      if (updateError) throw updateError;
      setPhotoPreview(photoUrl);
      await queryClient.invalidateQueries({ queryKey: ["motorista-full-profile", user?.id] });
      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar foto: " + error.message);
    }
  };

  const getInitials = () => {
    if (!motorista?.nome_completo) return "M";
    return motorista.nome_completo
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <AppLayout title="Meu Perfil" subtitle="Dados completos do motorista">
      <div className="max-w-4xl space-y-6">
        {/* Header with photo */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{getInitials()}</span>
                )}
              </div>
              <label htmlFor="photo-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{motorista?.nome_completo || "Motorista"}</h2>
              <p className="text-muted-foreground text-sm">{motorista?.email || user?.email}</p>
              <Badge variant={motorista?.ativo ? "default" : "destructive"} className="mt-1">
                {!motorista?.ativo ? "Inativo" : motorista?.status_cadastro === "ativo" ? "Ativo" : "Pendente"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Full Profile - Read Only */}
        <div className="card-elevated p-6 space-y-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <User className="w-4 h-4" /> Informações Principais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoField label="Nome Completo" value={motorista?.nome_completo || "-"} />
              <InfoField label="Data de Nascimento" value={motorista?.data_nascimento ? new Date(motorista.data_nascimento).toLocaleDateString("pt-PT") : "-"} />
              <InfoField label="NIF" value={motorista?.nif || "-"} />
              <InfoField label="Telemóvel" value={motorista?.telemovel || "-"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4" /> Contacto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Email" value={motorista?.email || user?.email || "-"} />
              <InfoField label="IBAN" value={motorista?.iban || "-"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-destructive" /> Contato de Urgência
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Nome" value={(motorista as any)?.contato_urgencia_nome || "-"} />
              <InfoField label="Telemóvel" value={(motorista as any)?.contato_urgencia_telemovel || "-"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <User className="w-4 h-4" /> Dados Pessoais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Estado Civil" value={motorista?.estado_civil ? estadoCivilLabels[motorista.estado_civil] : "-"} />
              <InfoField label="Filhos" value={motorista?.filhos?.toString() || "0"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" /> Morada
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Rua" value={motorista?.endereco_rua || "-"} />
              <InfoField label="Número" value={motorista?.endereco_numero || "-"} />
              <InfoField label="Complemento" value={motorista?.endereco_complemento || "-"} />
              <InfoField label="Cidade" value={motorista?.endereco_cidade || "-"} />
              <InfoField label="CEP" value={motorista?.endereco_cep || "-"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <IdCard className="w-4 h-4" /> Documentação
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Tipo de Documento" value={motorista?.tipo_documento ? documentTypeLabels[motorista.tipo_documento] : "-"} />
              <InfoField label="Número do Documento" value={motorista?.numero_documento || "-"} />
              <DocumentField label="Validade do Documento" expiry={motorista?.documento_valid_until || null} />
              <InfoField label="Carta de Condução" value={motorista?.carta_numero || "-"} />
              <DocumentField label="Validade da Carta" expiry={motorista?.carta_valid_until || null} />
              <DocumentField label="Validade Registo Criminal" expiry={motorista?.registo_criminal_valid_until || null} />
              <InfoField label="Certificado TVDE" value={(motorista as any)?.certificado_tvde || "-"} />
              <DocumentField label="Validade Certificado TVDE" expiry={(motorista as any)?.certificado_tvde_valid_until || null} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Car className="w-4 h-4" /> Plataformas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoField label="Email Bolt" value={(motorista as any)?.bolt_email || "-"} />
              <InfoField label="Telemóvel Bolt" value={(motorista as any)?.bolt_telemovel || "-"} />
              <InfoField label="Email Uber" value={(motorista as any)?.uber_email || "-"} />
              <InfoField label="Telemóvel Uber" value={(motorista as any)?.uber_telemovel || "-"} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
