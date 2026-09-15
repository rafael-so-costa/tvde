import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsManager } from "@/components/common/CustomFieldsManager";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  User, 
  Calendar,
  Banknote,
} from "lucide-react";
import { Empresa } from "@/hooks/useEmpresas";
import { CompanyDocumentsManager } from "@/components/companies/CompanyDocumentsManager";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface CompanyDetailsDialogProps {
  company: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDetailsDialog({ company, open, onOpenChange }: CompanyDetailsDialogProps) {
  if (!company) return null;

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd/MM/yyyy", { locale: pt });
  };

  const getFullAddress = () => {
    const parts = [
      company.endereco_rua,
      company.endereco_numero,
      company.endereco_complemento,
      company.endereco_cep,
      company.endereco_cidade,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const getStatusBadge = () => {
    if (!company.ativo) return "secondary";
    if (company.status_cadastro === "pendente") return "secondary";
    if (company.status_cadastro === "incompleto") return "outline";
    return "default";
  };

  const getStatusLabel = () => {
    if (!company.ativo) return "Inativo";
    if (company.status_cadastro === "pendente") return "Pendente";
    if (company.status_cadastro === "incompleto") return "Incompleto";
    return "Ativo";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.nome_empresa} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-2xl">{company.nome_empresa}</DialogTitle>
              <p className="text-muted-foreground">NIF: {company.nif}</p>
              <Badge variant={getStatusBadge()} className="mt-2">
                {getStatusLabel()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{company.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telemóvel</p>
                    <p className="font-medium">{company.telemovel || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Morada</p>
                    <p className="font-medium">{getFullAddress()}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Manager Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Gerente
              </h3>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Nome do Gerente</p>
                  <p className="font-medium">{company.nome_gerente || "—"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Informações Financeiras
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Capital Social</p>
                    <p className="font-medium">{formatCurrency(Number(company.capital_social))}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">IBAN</p>
                    <p className="font-medium font-mono text-sm">{company.iban || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* TVDE License */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Licença TVDE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Número da Licença</p>
                    <p className="font-medium">{company.certificado_tvde || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Validade</p>
                    <p className="font-medium">{formatDate(company.certificado_tvde_valid_until)}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <CompanyDocumentsManager empresaId={company.id} />
          </TabsContent>

          <TabsContent value="extra" className="mt-6">
            <CustomFieldsManager
              entidadeTipo="empresa"
              entidadeId={company.id}
              title="Informação Adicional da Empresa"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
