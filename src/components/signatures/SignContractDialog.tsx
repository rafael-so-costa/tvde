import { useState, useMemo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, FileText, ArrowDown } from "lucide-react";
import { SignatureCanvas } from "@/components/contracts/SignatureCanvas";
import {
  useContractFullData,
  generateContractFieldMappings,
  renderContractSegments,
  type ContractSegment,
} from "@/hooks/useContractFullData";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useConfirmarAssinatura, type AssinaturaPendente } from "@/hooks/useMinhasAssinaturas";
import { useResolvedSignatures } from "@/hooks/useResolvedSignatures";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface SignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assinatura: AssinaturaPendente | null;
}

export function SignContractDialog({ open, onOpenChange, assinatura }: SignContractDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contractId = assinatura?.contrato_id ?? null;
  const { data: fullData, isLoading } = useContractFullData(contractId);
  const { upload, isUploading } = useFileUpload();
  const confirmar = useConfirmarAssinatura();

  const { data: signatureRows } = useQuery({
    queryKey: ["contract-signatures-preview", contractId],
    enabled: !!contractId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assinaturas_digitais")
        .select("signatario_tipo, assinatura_url")
        .eq("contrato_id", contractId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const rawSignatureValues = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    (signatureRows || []).forEach((s: any) => {
      const key = `ASSINATURA_${String(s.signatario_tipo || "").toUpperCase()}`;
      if (s.assinatura_url) out[key] = s.assinatura_url;
    });
    return out;
  }, [signatureRows]);

  const signatureValues = useResolvedSignatures(rawSignatureValues);

  const segments: ContractSegment[] = useMemo(() => {
    if (!fullData?.contract || !fullData.template) return [];
    const fieldValues = generateContractFieldMappings({
      empresa: fullData.empresa,
      proprietario: fullData.proprietario,
      motorista: fullData.motorista,
      veiculo: fullData.veiculo,
      camposPreenchidos: (fullData.contract.campos_preenchidos as any) || {},
    });
    return renderContractSegments(
      fullData.template.conteudo_original || "",
      fieldValues,
      signatureValues,
    );
  }, [fullData, signatureValues]);

  useEffect(() => {
    if (!open) {
      setAgreed(false);
      setReachedEnd(false);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
      setReachedEnd(true);
    }
  };

  // If the document is short enough to not be scrollable, consider it read.
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const el = scrollRef.current;
      if (el.scrollHeight <= el.clientHeight + 4) setReachedEnd(true);
    }
  }, [isLoading, segments]);

  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const handleSign = async (dataUrl: string) => {
    if (!assinatura || !agreed) return;
    setSigning(true);
    try {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const file = new File([blob], `signature-${assinatura.id}.png`, { type: "image/png" });
      const url = await upload(file, { bucket: "signatures", folder: assinatura.contrato_id });
      await confirmar.mutateAsync({ signatureId: assinatura.id, assinaturaUrl: url });
      onOpenChange(false);
      setAgreed(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao assinar");
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90dvh] max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <span className="truncate">
              Assinar — {assinatura?.contrato?.template?.nome || "Contrato"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-b text-sm flex items-start gap-2 shrink-0">
          <FileText className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
          <p>Leia o contrato na íntegra antes de assinar. A assinatura tem validade jurídica.</p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 bg-muted/20"
          style={{ maxHeight: "calc(90dvh - 220px)" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <article
              className="max-w-[800px] mx-auto bg-card border rounded-md p-5 sm:p-8 shadow-sm whitespace-pre-wrap break-words"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "11pt", lineHeight: 1.7 }}
            >
              {segments.map((seg, i) =>
                seg.type === "image" ? (
                  <img
                    key={i}
                    src={seg.src}
                    alt={seg.alt || "Assinatura"}
                    className="inline-block align-middle my-2"
                    style={{ maxHeight: 80 }}
                  />
                ) : (
                  <span key={i}>{seg.value}</span>
                ),
              )}
              <div data-end-of-document className="h-px" />
            </article>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t bg-background shrink-0 space-y-3">
          {!reachedEnd && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToEnd}
              className="w-full gap-2"
            >
              <ArrowDown className="w-4 h-4" /> Ir para o fim do documento
            </Button>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              disabled={signing || isUploading || !reachedEnd}
            />
            <Label htmlFor="agree" className="text-sm leading-snug cursor-pointer">
              {reachedEnd ? (
                <>
                  Li, compreendi e concordo com todos os termos descritos neste contrato.
                  Confirmo que sou <strong>{assinatura?.signatario_nome}</strong>.
                </>
              ) : (
                <span className="text-muted-foreground">
                  Leia o contrato até ao fim para poder confirmar e assinar.
                </span>
              )}
            </Label>
          </div>

          {agreed && reachedEnd && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">A sua assinatura</Label>
              <SignatureCanvas onSave={handleSign} disabled={signing || isUploading} />
            </div>
          )}

          {(signing || isUploading) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> A processar assinatura...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
