import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useContratoVersions } from "@/hooks/useContratos";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  History,
  Clock,
  User,
  ArrowRight,
  RotateCcw,
  Eye,
  Loader2,
} from "lucide-react";
import type { ContractVersion } from "@/types/contract";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  currentVersion: number;
  onRestoreVersion?: (version: ContractVersion) => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  contratoId,
  currentVersion,
  onRestoreVersion,
}: VersionHistoryDialogProps) {
  const { data: versions = [], isLoading } = useContratoVersions(contratoId);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[ContractVersion | null, ContractVersion | null]>([null, null]);

  const handleSelectForCompare = (version: ContractVersion) => {
    if (!compareVersions[0]) {
      setCompareVersions([version, null]);
    } else if (!compareVersions[1]) {
      setCompareVersions([compareVersions[0], version]);
    } else {
      setCompareVersions([version, null]);
    }
  };

  const getDiff = (v1: Record<string, any>, v2: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    const changes: Array<{ key: string; old: any; new: any }> = [];

    allKeys.forEach((key) => {
      if (v1[key] !== v2[key]) {
        changes.push({ key, old: v1[key], new: v2[key] });
      }
    });

    return changes;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Versões
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersions([null, null]);
              }}
            >
              Comparar Versões
            </Button>
            {compareMode && compareVersions[0] && compareVersions[1] && (
              <Badge variant="secondary">
                v{compareVersions[0].versao_numero} → v{compareVersions[1].versao_numero}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma versão encontrada
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      version.versao_numero === currentVersion
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    } ${
                      compareMode &&
                      (compareVersions[0]?.id === version.id ||
                        compareVersions[1]?.id === version.id)
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => {
                      if (compareMode) {
                        handleSelectForCompare(version);
                      } else {
                        setSelectedVersion(
                          selectedVersion?.id === version.id ? null : version
                        );
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            version.versao_numero === currentVersion
                              ? "default"
                              : "outline"
                          }
                        >
                          v{version.versao_numero}
                        </Badge>
                        {version.versao_numero === currentVersion && (
                          <Badge variant="secondary">Atual</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", {
                          locale: pt,
                        })}
                      </div>
                    </div>

                    {version.observacoes && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {version.observacoes}
                      </p>
                    )}

                    {/* Expanded view */}
                    {selectedVersion?.id === version.id && !compareMode && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <h4 className="font-medium text-sm">Dados Preenchidos</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(version.dados_campos || {}).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="p-2 bg-muted rounded text-sm"
                              >
                                <p className="text-muted-foreground text-xs">
                                  {key}
                                </p>
                                <p className="font-medium">{String(value) || "-"}</p>
                              </div>
                            )
                          )}
                        </div>

                        {version.versao_numero !== currentVersion &&
                          onRestoreVersion && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreVersion(version);
                              }}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restaurar esta versão
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Compare View */}
          {compareMode && compareVersions[0] && compareVersions[1] && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Diferenças entre v{compareVersions[0].versao_numero} e v
                {compareVersions[1].versao_numero}
              </h4>

              <div className="space-y-2">
                {getDiff(
                  compareVersions[0].dados_campos || {},
                  compareVersions[1].dados_campos || {}
                ).map((change) => (
                  <div
                    key={change.key}
                    className="p-3 bg-muted rounded-lg flex items-center gap-4"
                  >
                    <span className="font-medium text-sm min-w-[120px]">
                      {change.key}
                    </span>
                    <span className="text-sm text-red-600 line-through">
                      {String(change.old) || "(vazio)"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-green-600">
                      {String(change.new) || "(vazio)"}
                    </span>
                  </div>
                ))}

                {getDiff(
                  compareVersions[0].dados_campos || {},
                  compareVersions[1].dados_campos || {}
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma diferença encontrada
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
