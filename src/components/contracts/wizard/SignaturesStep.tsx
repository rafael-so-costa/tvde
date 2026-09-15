import { useMemo } from "react";
import { SignatureCanvas } from "../SignatureCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, PenLine, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIGNATURE_FIELDS,
  type SignatureFieldDef,
} from "@/utils/contractSignatures";

export interface RemoteSignatureTarget {
  /** Display name (motorista, proprietário ou empresa) */
  nome: string;
  email: string;
  /** user_id do utilizador que deve receber a assinatura no portal */
  signatario_user_id?: string | null;
  /** Tipo do signatário, conforme assinaturas_digitais.signatario_tipo */
  signatario_tipo: "motorista" | "proprietario" | "empresa";
  /** id da entidade (motorista_id / proprietario_id / empresa_id) — opcional */
  signatario_id?: string;
}

interface SignaturesStepProps {
  requiredSignatures: SignatureFieldDef[];
  signatures: Record<string, string>;
  onSignatureChange: (placeholder: string, dataUrl: string | null) => void;
  /** Map placeholder → entidade alvo da assinatura remota */
  remoteTargets: Record<string, RemoteSignatureTarget | undefined>;
  /** Placeholders já marcados para assinatura remota */
  remoteRequested: Record<string, boolean>;
  onRequestRemote: (placeholder: string) => void;
  onRequestAllRemote: (placeholders: string[]) => void;
  onCancelRemote: (placeholder: string) => void;
  isSubmitting?: boolean;
}

export function SignaturesStep({
  requiredSignatures,
  signatures,
  onSignatureChange,
  remoteTargets,
  remoteRequested,
  onRequestRemote,
  onRequestAllRemote,
  onCancelRemote,
  isSubmitting,
}: SignaturesStepProps) {
  const list = useMemo(
    () => (requiredSignatures.length > 0 ? requiredSignatures : []),
    [requiredSignatures],
  );

  if (list.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-muted/30 text-center">
        <PenLine className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Nenhuma assinatura necessária</p>
        <p className="text-sm text-muted-foreground">
          Este template não contém campos de assinatura.
        </p>
      </div>
    );
  }

  const totalReady = list.filter(
    (f) => !!signatures[f.placeholder] || remoteRequested[f.placeholder],
  ).length;
  const requestableRemotePlaceholders = list
    .filter((f) => !signatures[f.placeholder] && !remoteRequested[f.placeholder])
    .filter((f) => {
      const target = remoteTargets[f.placeholder];
      return Boolean(target?.email?.trim());
    })
    .map((f) => f.placeholder);

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            <h4 className="font-medium">Assinaturas do Contrato</h4>
          </div>
          <Badge variant={totalReady === list.length ? "default" : "secondary"}>
            {totalReady} / {list.length} prontas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Para cada signatário, escolha individualmente:{" "}
          <strong>assinar presencialmente</strong> no canvas, ou{" "}
          <strong>pedir assinatura remota</strong>. Cada pedido é independente —
          nada é enviado automaticamente aos outros assinantes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {list.map((field) => {
          const signed = !!signatures[field.placeholder];
          const requested = !!remoteRequested[field.placeholder];
          const target = remoteTargets[field.placeholder];
          const ready = signed || requested;

          return (
            <div
              key={field.placeholder}
              className={cn(
                "p-4 border rounded-lg space-y-3",
                signed && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10",
                requested && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10",
                !ready && "bg-card",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{field.label}</p>
                  {target ? (
                    <p className="text-xs text-muted-foreground">
                      {target.nome} · {target.email || "sem email"}
                    </p>
                  ) : (
                    <code className="text-[10px] text-muted-foreground font-mono">
                      {`{{${field.placeholder}}}`}
                    </code>
                  )}
                </div>
                {signed ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> Assinado
                  </span>
                ) : requested ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="w-3 h-3" /> Pedido enviado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                    <AlertCircle className="w-3 h-3" /> Pendente
                  </span>
                )}
              </div>

              {!requested && (
                <SignatureCanvas
                  onSave={(dataUrl) => onSignatureChange(field.placeholder, dataUrl)}
                  onClear={() => onSignatureChange(field.placeholder, null)}
                  disabled={requested}
                />
              )}

              <div className="flex gap-2">
                {!signed && !requested && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onRequestRemote(field.placeholder)}
                    disabled={!target || !target.email || isSubmitting}
                    title={!target?.email ? "Sem email para envio" : undefined}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Pedir assinatura remota
                  </Button>
                )}
                {requested && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => onCancelRemote(field.placeholder)}
                  >
                    Cancelar pedido remoto
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
