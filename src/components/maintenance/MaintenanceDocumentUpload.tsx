import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Upload, Eye, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  { value: "orcamento", label: "Orçamento" },
  { value: "fatura", label: "Fatura" },
];

export interface MaintenanceDocument {
  tipo: string;
  url: string;
  nome: string;
  uploaded_at: string;
}

interface MaintenanceDocumentUploadProps {
  documents: MaintenanceDocument[];
  onDocumentsChange: (documents: MaintenanceDocument[]) => void;
  bucket?: string;
  folder?: string;
}

export function MaintenanceDocumentUpload({
  documents,
  onDocumentsChange,
  bucket = "documents",
  folder = "manutencoes",
}: MaintenanceDocumentUploadProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const { upload, isUploading } = useFileUpload();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    try {
      const url = await upload(file, {
        bucket,
        folder,
      });

      const newDoc: MaintenanceDocument = {
        tipo: selectedType,
        url,
        nome: file.name,
        uploaded_at: new Date().toISOString(),
      };

      onDocumentsChange([...documents, newDoc]);
      setSelectedType("");
      e.target.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleDelete = (index: number) => {
    const updatedDocs = documents.filter((_, i) => i !== index);
    onDocumentsChange(updatedDocs);
  };

  const handleView = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDownload = async (url: string, nome: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getTypeLabel = (tipo: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === tipo)?.label || tipo;
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <h4 className="font-medium">Importar Documento</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ficheiro</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={!selectedType || isUploading}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="flex-1"
              />
              {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          </div>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <Label>Documentos Carregados</Label>
          <div className="border rounded-lg divide-y">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{doc.nome}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {getTypeLabel(doc.tipo)}
                      </span>
                      <span>
                        {format(new Date(doc.uploaded_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(doc.url)}
                    title="Ver"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc.url, doc.nome)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
                    className="text-destructive hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
