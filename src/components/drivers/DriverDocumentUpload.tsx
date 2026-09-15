import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, FileText, Download, Eye } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export interface DriverDocument {
  url: string;
  tipo: string;
  nome_arquivo: string;
  data_validade?: string;
}

interface DriverDocumentUploadProps {
  documents: DriverDocument[];
  onDocumentsChange: (docs: DriverDocument[]) => void;
  bucket: string;
  folder?: string;
  readOnly?: boolean;
}

const DRIVER_DOCUMENT_TYPES = [
  { value: "passaporte", label: "Documento de Identificação - Passaporte" },
  { value: "cartao_cidadao", label: "Documento de Identificação - Cartão Cidadão" },
  { value: "titulo_residencia", label: "Documento de Identificação - Título de Residência" },
  { value: "comprovativo_morada", label: "Comprovativo de Morada" },
  { value: "comprovativo_iban", label: "Comprovativo de IBAN" },
  { value: "certificado_tvde", label: "Certificado TVDE" },
  { value: "registo_criminal", label: "Registo Criminal" },
  { value: "carta_conducao", label: "Carta de Condução" },
];

export function DriverDocumentUpload({
  documents,
  onDocumentsChange,
  bucket,
  folder,
  readOnly = false,
}: DriverDocumentUploadProps) {
  const { upload, isUploading } = useFileUpload();
  const [selectedType, setSelectedType] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedType) {
      toast.error("Selecione o tipo de documento primeiro");
      return;
    }

    try {
      const url = await upload(file, {
        bucket,
        folder,
      });

      const docTypeLabel = DRIVER_DOCUMENT_TYPES.find(t => t.value === selectedType)?.label || selectedType;

      const newDoc: DriverDocument = {
        url,
        tipo: docTypeLabel,
        nome_arquivo: file.name,
        data_validade: expiryDate || undefined,
      };

      onDocumentsChange([...documents, newDoc]);
      
      // Reset state
      setSelectedType("");
      setExpiryDate("");
      
      toast.success("Documento carregado com sucesso!");
    } catch (error) {
      // Error is already handled in useFileUpload
    }
    
    // Reset file input
    e.target.value = "";
  };

  const handleRemoveDocument = (index: number) => {
    const newDocs = documents.filter((_, i) => i !== index);
    onDocumentsChange(newDocs);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (url: string) => {
    window.open(url, '_blank');
  };

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: pt });
    } catch {
      return dateStr;
    }
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="p-4 bg-muted rounded-lg space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Carregar Novo Documento
      </h4>
      
      <div className="space-y-3">
        {/* Document Type Selection */}
        {!readOnly && (
          <>
            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Date (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="doc-expiry">Data de Validade (Opcional)</Label>
              <Input
                id="doc-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* File Upload */}
            <div className="flex gap-2">
              <Input
                type="file"
                id="driver-doc-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("driver-doc-upload")?.click()}
                disabled={isUploading || !selectedType}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Carregando..." : "Carregar Documento"}
              </Button>
            </div>
          </>
        )}

        {/* Uploaded Documents List */}
        {documents.length > 0 ? (
          <div className="space-y-2 mt-4">
            <Label className="text-sm text-muted-foreground">Documentos Carregados:</Label>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <Badge variant="secondary" className="mb-1">
                        {doc.tipo}
                      </Badge>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.nome_arquivo}
                      </p>
                      {doc.data_validade && (
                        <p className={`text-xs mt-1 ${
                          isExpired(doc.data_validade) 
                            ? "text-destructive font-medium" 
                            : isExpiringSoon(doc.data_validade)
                            ? "text-yellow-600 font-medium"
                            : "text-muted-foreground"
                        }`}>
                          Validade: {formatExpiryDate(doc.data_validade)}
                          {isExpired(doc.data_validade) && " (Expirado)"}
                          {isExpiringSoon(doc.data_validade) && !isExpired(doc.data_validade) && " (Expira em breve)"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(doc.url)}
                      title="Pré-visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.url, doc.nome_arquivo)}
                      title="Baixar"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(index)}
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum documento carregado</p>
          </div>
        )}
      </div>
    </div>
  );
}
