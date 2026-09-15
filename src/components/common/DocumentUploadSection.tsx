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
import { Upload, X, FileText, Plus, Download, Eye } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";

export interface UploadedDocument {
  url: string;
  tipo: string;
  nome_arquivo: string;
}

interface DocumentUploadSectionProps {
  title?: string;
  predefinedTypes: string[];
  documents: UploadedDocument[];
  onDocumentsChange: (docs: UploadedDocument[]) => void;
  bucket: string;
  folder?: string;
  readOnly?: boolean;
}

export function DocumentUploadSection({
  title = "Documentos",
  predefinedTypes,
  documents,
  onDocumentsChange,
  bucket,
  folder,
  readOnly = false,
}: DocumentUploadSectionProps) {
  const { upload, isUploading } = useFileUpload();
  const [selectedType, setSelectedType] = useState<string>("");
  const [customType, setCustomType] = useState("");
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [allTypes, setAllTypes] = useState<string[]>(predefinedTypes);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const documentType = isAddingCustomType ? customType.trim() : selectedType;
    
    if (!documentType) {
      toast.error("Selecione ou crie um tipo de documento");
      return;
    }

    try {
      const url = await upload(file, {
        bucket,
        folder,
      });

      const newDoc: UploadedDocument = {
        url,
        tipo: documentType,
        nome_arquivo: file.name,
      };

      onDocumentsChange([...documents, newDoc]);
      
      // Add custom type to available types if it's new
      if (isAddingCustomType && customType.trim() && !allTypes.includes(customType.trim())) {
        setAllTypes([...allTypes, customType.trim()]);
      }
      
      // Reset state
      setSelectedType("");
      setCustomType("");
      setIsAddingCustomType(false);
      
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

  return (
    <>
    <div className="p-4 bg-muted rounded-lg space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {title}
      </h4>
      
      <div className="space-y-3">
        {/* Type Selection - only show if not readOnly */}
        {!readOnly && (
          <>
            <div className="flex gap-2 items-end">
              {!isAddingCustomType ? (
                <>
                  <div className="flex-1 space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddingCustomType(true)}
                    title="Criar novo tipo"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-2">
                    <Label>Novo Tipo de Documento</Label>
                    <Input
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Ex: Declaração Amigável"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsAddingCustomType(false);
                      setCustomType("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {/* File Upload */}
            <div className="flex gap-2">
              <Input
                type="file"
                id="doc-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("doc-upload")?.click()}
                disabled={isUploading || (!selectedType && !customType.trim())}
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
            {!readOnly && (
              <Label className="text-sm text-muted-foreground">Documentos Carregados:</Label>
            )}
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
                        onClick={() => setDeleteIndex(index)}
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

    <DeleteConfirmDialog
      open={deleteIndex !== null}
      onOpenChange={(open) => !open && setDeleteIndex(null)}
      onConfirm={() => {
        if (deleteIndex !== null) {
          handleRemoveDocument(deleteIndex);
          setDeleteIndex(null);
        }
      }}
      title="Remover documento"
      description="Tem certeza que deseja remover este documento? Esta ação não pode ser desfeita."
    />
    </>
  );
}
