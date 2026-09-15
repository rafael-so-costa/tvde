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
import { Upload, X, FileText, Plus, Download, Eye, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface ArchivedDocumentsSectionProps {
  entityId: string;
  entityType: "motorista" | "proprietario" | "veiculo";
  predefinedTypes: string[];
  readOnly?: boolean;
}

interface ArchivedDocument {
  id: string;
  tipo_documento: string;
  arquivo_url: string;
  data_validade: string | null;
  uploaded_at: string | null;
}

export function ArchivedDocumentsSection({
  entityId,
  entityType,
  predefinedTypes,
  readOnly = false,
}: ArchivedDocumentsSectionProps) {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const { upload, isUploading } = useFileUpload();
  const [selectedType, setSelectedType] = useState<string>("");
  const [customType, setCustomType] = useState("");
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [allTypes, setAllTypes] = useState<string[]>(predefinedTypes);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["archived-documents", entityId, entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_arquivados")
        .select("*")
        .eq("entidade_id", entityId)
        .eq("entidade_tipo", entityType)
        .order("uploaded_at", { ascending: false });
      
      if (error) throw error;
      return data as ArchivedDocument[];
    },
    enabled: !!entityId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ url, tipo, validade }: { url: string; tipo: string; validade: string | null }) => {
      if (!tenant?.id) throw new Error("Tenant não encontrado");
      const { error } = await supabase.from("documentos_arquivados").insert({
        tenant_id: tenant.id,
        entidade_id: entityId,
        entidade_tipo: entityType,
        tipo_documento: tipo,
        arquivo_url: url,
        data_validade: validade || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-documents", entityId, entityType] });
      toast.success("Documento carregado com sucesso!");
      setSelectedType("");
      setCustomType("");
      setExpiryDate("");
      setIsAddingCustomType(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar documento: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("documentos_arquivados")
        .delete()
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-documents", entityId, entityType] });
      toast.success("Documento removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover documento: " + error.message);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const documentType = isAddingCustomType ? customType.trim() : selectedType;
    
    if (!documentType) {
      toast.error("Selecione ou crie um tipo de documento");
      return;
    }

    try {
      const folder = `${entityType}s/${entityId}`;
      const url = await upload(file, {
        bucket: "documents",
        folder,
      });

      // Add custom type to available types if it's new
      if (isAddingCustomType && customType.trim() && !allTypes.includes(customType.trim())) {
        setAllTypes([...allTypes, customType.trim()]);
      }

      await uploadMutation.mutateAsync({
        url,
        tipo: documentType,
        validade: expiryDate || null,
      });
    } catch (error) {
      // Error is already handled
    }
    
    // Reset file input
    e.target.value = "";
  };

  const handleDownload = (url: string) => {
    const filename = url.split('/').pop() || 'documento';
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

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {!readOnly && (
        <div className="p-4 bg-muted rounded-lg space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Carregar Novo Documento
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Selection */}
            <div className="space-y-2">
              {!isAddingCustomType ? (
                <div className="flex gap-2">
                  <div className="flex-1">
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
                    className="mt-6"
                    onClick={() => setIsAddingCustomType(true)}
                    title="Criar novo tipo"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Novo Tipo</Label>
                    <Input
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Ex: Certificado"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => {
                      setIsAddingCustomType(false);
                      setCustomType("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Validade (opcional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Input
                type="file"
                id="archived-doc-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={isUploading || uploadMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("archived-doc-upload")?.click()}
                disabled={isUploading || uploadMutation.isPending || (!selectedType && !customType.trim())}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading || uploadMutation.isPending ? "Carregando..." : "Carregar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-semibold">Documentos Arquivados ({documents.length})</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{doc.tipo_documento}</Badge>
                      {doc.data_validade && (
                        <Badge 
                          variant={isExpired(doc.data_validade) ? "destructive" : isExpiringSoon(doc.data_validade) ? "default" : "outline"}
                          className={isExpiringSoon(doc.data_validade) && !isExpired(doc.data_validade) ? "bg-warning/20 text-warning border-warning/30" : ""}
                        >
                          {isExpired(doc.data_validade) ? "Vencido" : "Válido até"}: {new Date(doc.data_validade).toLocaleDateString("pt-PT")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      Carregado em: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("pt-PT") : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePreview(doc.arquivo_url)}
                    title="Pré-visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc.arquivo_url)}
                    title="Baixar"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
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
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum documento arquivado</p>
        </div>
      )}
    </div>
  );
}
