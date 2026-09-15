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
import { Upload, X, FileText, Plus, Download, Eye, Calendar } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  useDocumentosArquivados,
  useCreateDocumentoArquivado,
  useDeleteDocumentoArquivado,
} from "@/hooks/useDocumentosArquivados";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { format, isBefore, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const DEFAULT_TYPES = [
  "Certidão Permanente",
  "Comprovativo de IBAN da Empresa",
  "Comprovativo de Morada da Empresa",
  "Documento de Identificação do Gerente - Passaporte",
  "Documento de Identificação do Gerente - Cartão Cidadão",
  "Documento de Identificação do Gerente - Título de Residência",
  "Licença TVDE",
];

interface CompanyDocumentsManagerProps {
  empresaId: string;
  readOnly?: boolean;
}

export function CompanyDocumentsManager({ empresaId, readOnly = false }: CompanyDocumentsManagerProps) {
  const { data: documents = [], isLoading } = useDocumentosArquivados("empresa", empresaId);
  const createDoc = useCreateDocumentoArquivado();
  const deleteDoc = useDeleteDocumentoArquivado();
  const { upload, isUploading } = useFileUpload();

  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [validade, setValidade] = useState("");
  const [extraTypes, setExtraTypes] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const allTypes = Array.from(
    new Set([...DEFAULT_TYPES, ...extraTypes, ...documents.map((d) => d.tipo_documento)]),
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipo = isAddingCustom ? customType.trim() : selectedType;
    if (!tipo) {
      toast.error("Selecione ou crie um tipo de documento");
      return;
    }
    try {
      const url = await upload(file, {
        bucket: "documents",
        folder: `empresas/${empresaId}`,
      });
      await createDoc.mutateAsync({
        entidade_tipo: "empresa",
        entidade_id: empresaId,
        tipo_documento: tipo,
        arquivo_url: url,
        data_validade: validade || null,
      });
      if (isAddingCustom && tipo && !allTypes.includes(tipo)) {
        setExtraTypes((prev) => [...prev, tipo]);
      }
      setSelectedType("");
      setCustomType("");
      setIsAddingCustom(false);
      setValidade("");
    } catch {
      // erro tratado nos hooks
    }
    e.target.value = "";
  };

  const handlePreview = (url: string) => window.open(url, "_blank");
  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileNameFromUrl = (url: string) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return "documento";
    }
  };

  const isExpired = (date: string | null) =>
    !!date && isBefore(parseISO(date), new Date());

  return (
    <>
      <div className="p-4 bg-muted rounded-lg space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documentos da Empresa
        </h4>

        {!readOnly && (
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              {!isAddingCustom ? (
                <>
                  <div className="flex-1 space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddingCustom(true)}
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
                      placeholder="Ex: Declaração Especial"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsAddingCustom(false);
                      setCustomType("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Validade (opcional)</Label>
              <Input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
              />
            </div>

            <Input
              type="file"
              id="empresa-doc-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={isUploading || createDoc.isPending}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById("empresa-doc-upload")?.click()}
              disabled={
                isUploading ||
                createDoc.isPending ||
                (!selectedType && !customType.trim())
              }
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading || createDoc.isPending
                ? "Carregando..."
                : "Carregar Documento"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando documentos...
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2 mt-4">
            {!readOnly && (
              <Label className="text-sm text-muted-foreground">
                Documentos Carregados:
              </Label>
            )}
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <Badge variant="secondary">{doc.tipo_documento}</Badge>
                        {doc.data_validade && (
                          <Badge
                            variant={isExpired(doc.data_validade) ? "destructive" : "outline"}
                            className="gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            {format(parseISO(doc.data_validade), "dd/MM/yyyy", { locale: pt })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {fileNameFromUrl(doc.arquivo_url)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(doc.arquivo_url)}
                      title="Pré-visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDownload(doc.arquivo_url, fileNameFromUrl(doc.arquivo_url))
                      }
                      title="Baixar"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(doc.id)}
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

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteDoc.mutate({
              id: deleteId,
              entidade_tipo: "empresa",
              entidade_id: empresaId,
            });
            setDeleteId(null);
          }
        }}
        title="Remover documento"
        description="Tem certeza que deseja remover este documento? Esta ação não pode ser desfeita."
      />
    </>
  );
}
