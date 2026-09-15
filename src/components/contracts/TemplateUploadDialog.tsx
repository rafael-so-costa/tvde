import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTemplatesContrato, detectFields } from "@/hooks/useTemplatesContrato";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  File,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import type { ContractField } from "@/types/contract";

interface TemplateUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  perfilId?: string | null;
}

export function TemplateUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  perfilId,
}: TemplateUploadDialogProps) {
  const [nome, setNome] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [detectedFields, setDetectedFields] = useState<ContractField[]>([]);
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");
  const [isParsing, setIsParsing] = useState(false);

  const { createTemplate } = useTemplatesContrato();
  const { upload, isUploading, progress } = useFileUpload();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    // Also check by extension for files that might have wrong MIME type
    const fileName = selectedFile.name.toLowerCase();
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
      toast.error("Formato não suportado. Use PDF, DOCX ou TXT.");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      // For text files, read content directly
      if (selectedFile.type === "text/plain" || fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        setContent(text);
        const fields = detectFields(text);
        setDetectedFields(fields);
        setStep("review");
        toast.success(`${fields.length} campo(s) detectado(s) no documento.`);
      } else {
        // For PDF/DOCX, use the edge function to parse
        const formData = new FormData();
        formData.append('file', selectedFile);

        const { data, error } = await supabase.functions.invoke('parse-contract-document', {
          body: formData,
        });

        if (error) {
          throw new Error(error.message || 'Erro ao processar documento');
        }

        if (data?.success) {
          setContent(data.content || '');
          setDetectedFields(data.fields || []);
          setStep("review");
          toast.success(`${data.fields?.length || 0} campo(s) detectado(s) no documento.`);
        } else {
          throw new Error(data?.error || 'Erro ao processar documento');
        }
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar documento';
      toast.error(errorMessage);
      // Still allow manual paste as fallback
      toast.info("Você pode colar o conteúdo do contrato manualmente.");
      setStep("review");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleContentChange = (text: string) => {
    setContent(text);
    const fields = detectFields(text);
    setDetectedFields(fields);
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    try {
      let arquivoUrl: string | null = null;

      if (file) {
        arquivoUrl = await upload(file, {
          bucket: "contract-templates",
        });
      }

      await createTemplate.mutateAsync({
        nome,
        arquivo_url: arquivoUrl,
        tipo_arquivo: file?.type.includes("pdf") ? "pdf" : file?.type.includes("word") ? "docx" : "txt",
        conteudo_original: content,
        campos_detectados: detectedFields,
        perfil_id: perfilId ?? null,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating template:", error);
    }
  };

  const resetForm = () => {
    setNome("");
    setFile(null);
    setContent("");
    setDetectedFields([]);
    setStep("upload");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {step === "upload" && "Importar Template de Contrato"}
            {step === "review" && "Revisar Campos Detectados"}
            {step === "confirm" && "Confirmar Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <>
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Contrato Padrão TVDE"
                />
              </div>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />

                {file ? (
                  <div className="space-y-2">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                        <p className="font-medium">A processar documento...</p>
                        <p className="text-sm text-muted-foreground">
                          A extrair texto e campos editáveis
                        </p>
                      </>
                    ) : (
                      <>
                        <File className="w-12 h-12 mx-auto text-primary" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setContent("");
                            setDetectedFields([]);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">
                      Arraste um arquivo ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suporta PDF, DOCX e TXT
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ou cole o conteúdo do contrato</Label>
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Cole aqui o texto do contrato com campos no formato {{NOME_CAMPO}}..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Como marcar campos editáveis:</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Use a sintaxe <code className="bg-background px-1 py-0.5 rounded">{"{{NOME_CAMPO}}"}</code> para marcar campos que podem ser editados.
                </p>
                <div className="text-sm space-y-1">
                  <p><code>{"{{NOME_MOTORISTA}}"}</code> - Campo de texto</p>
                  <p><code>{"{{DATA_INICIO}}"}</code> - Campo de data</p>
                  <p><code>{"{{VALOR_MENSAL}}"}</code> - Campo de moeda</p>
                  <p><code>{"{{NIF_PROPRIETARIO}}"}</code> - Campo de NIF/CPF</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (content) {
                      const fields = detectFields(content);
                      setDetectedFields(fields);
                    }
                    setStep("review");
                  }}
                  disabled={!nome.trim() || (!file && !content.trim()) || isParsing}
                >
                  {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Review Fields */}
          {step === "review" && (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {detectedFields.length > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span className="font-medium">
                    {detectedFields.length} campo(s) detectado(s)
                  </span>
                </div>
              </div>

              {detectedFields.length > 0 ? (
                <div className="space-y-3">
                  <Label>Campos Encontrados</Label>
                  <div className="border rounded-lg divide-y">
                    {detectedFields.map((field) => (
                      <div
                        key={field.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{field.label}</p>
                          <p className="text-sm text-muted-foreground">
                            <code>{`{{${field.name}}}`}</code> · Tipo: {field.type}
                            {field.required && " · Obrigatório"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            field.required
                              ? "bg-red-100 text-red-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {field.required ? "Obrigatório" : "Opcional"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                  <p className="font-medium">Nenhum campo detectado</p>
                  <p className="text-sm text-muted-foreground">
                    Certifique-se de usar a sintaxe {"{{CAMPO}}"} para marcar campos editáveis.
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={createTemplate.isPending || isUploading}>
                  {(createTemplate.isPending || isUploading) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Criar Template
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
