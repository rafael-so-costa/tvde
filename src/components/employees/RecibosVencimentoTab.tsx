import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Eye, Download, Trash2, Loader2 } from "lucide-react";
import { useRecibos, useUploadRecibo, useDeleteRecibo, getReciboSignedUrl } from "@/hooks/useRecibos";
import { toast } from "sonner";

interface Props {
  funcionarioId: string;
  tenantId: string;
  canManage: boolean;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function RecibosVencimentoTab({ funcionarioId, tenantId, canManage }: Props) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const { data: recibos = [], isLoading } = useRecibos(funcionarioId, ano);
  const upload = useUploadRecibo();
  const del = useDeleteRecibo();
  const [uploadingMes, setUploadingMes] = useState<number | null>(null);

  const reciboFor = (mes: number) => recibos.find((r) => r.mes === mes);

  const handleFile = async (mes: number, file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas ficheiros PDF são permitidos");
      return;
    }
    setUploadingMes(mes);
    try {
      await upload.mutateAsync({ funcionarioId, tenantId, ano, mes, file });
    } finally {
      setUploadingMes(null);
    }
  };

  const openFile = async (path: string, download = false) => {
    try {
      const url = await getReciboSignedUrl(path);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        a.click();
      } else {
        window.open(url, "_blank");
      }
    } catch (e: any) {
      toast.error("Erro ao abrir recibo: " + e.message);
    }
  };

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Ano:</Label>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <Badge variant="outline">
          {recibos.length}/12 recibos
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MESES.map((nome, idx) => {
            const mes = idx + 1;
            const recibo = reciboFor(mes);
            const isUploading = uploadingMes === mes;

            return (
              <div
                key={mes}
                className="flex items-center justify-between border rounded-md p-3 bg-card"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${recibo ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{nome}</p>
                    {recibo ? (
                      <p className="text-xs text-muted-foreground truncate">Disponível</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem recibo</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {recibo && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => openFile(recibo.arquivo_url, false)} title="Ver">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openFile(recibo.arquivo_url, true)} title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => del.mutate(recibo)}
                          title="Apagar"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {canManage && (
                    <label className="cursor-pointer">
                      <Button size="icon" variant="ghost" asChild title={recibo ? "Substituir" : "Carregar"} disabled={isUploading}>
                        <span>
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </span>
                      </Button>
                      <Input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          handleFile(mes, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
