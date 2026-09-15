import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureCanvas } from "./SignatureCanvas";
import { useContratoSignatures } from "@/hooks/useContratos";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import {
  Mail,
  KeyRound,
  CheckCircle2,
  Clock,
  Shield,
  Send,
  Loader2,
} from "lucide-react";

interface SignatureFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  signatarioNome: string;
  signatarioEmail: string;
  signatarioTipo: "motorista" | "proprietario" | "empresa";
  signatarioId?: string;
  onComplete?: () => void;
}

export function SignatureFlowDialog({
  open,
  onOpenChange,
  contratoId,
  signatarioNome,
  signatarioEmail,
  signatarioTipo,
  signatarioId,
  onComplete,
}: SignatureFlowDialogProps) {
  const [step, setStep] = useState<"send" | "verify" | "sign" | "complete">("send");
  const [otp, setOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createSignatureRequest, confirmSignature } = useContratoSignatures(contratoId);
  const { upload, isUploading } = useFileUpload();

  useEffect(() => {
    if (open) {
      setStep("send");
      setOtp("");
      setEnteredOtp("");
      setSignatureId(null);
    }
  }, [open]);

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    try {
      const result = await createSignatureRequest.mutateAsync({
        signatario_tipo: signatarioTipo,
        signatario_id: signatarioId,
        signatario_nome: signatarioNome,
        signatario_email: signatarioEmail,
      });

      setSignatureId(result.id);
      setOtp(result.otp);
      setStep("verify");
      
      // In production, this would send an email with the OTP
      toast.info(`Código de verificação: ${result.otp}`, {
        description: "Em produção, este código seria enviado por e-mail.",
        duration: 10000,
      });
    } catch (error) {
      console.error("Error sending request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === otp) {
      setStep("sign");
    } else {
      toast.error("Código inválido. Tente novamente.");
    }
  };

  const handleSignatureComplete = async (signatureDataUrl: string) => {
    if (!signatureId) return;

    setIsSubmitting(true);
    try {
      // Convert base64 to file and upload
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `signature-${signatureId}.png`, {
        type: "image/png",
      });

      const url = await upload(file, {
        bucket: "signatures",
        folder: contratoId,
      });

      await confirmSignature.mutateAsync({
        signatureId,
        otp: enteredOtp,
        assinaturaUrl: url,
      });

      setStep("complete");
      setTimeout(() => {
        onComplete?.();
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Error completing signature:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Assinatura Digital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            {["send", "verify", "sign", "complete"].map((s, i) => (
              <div
                key={s}
                className="flex items-center"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : ["send", "verify", "sign", "complete"].indexOf(step) > i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      ["send", "verify", "sign", "complete"].indexOf(step) > i
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Send Request */}
          {step === "send" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">Signatário</p>
                <p className="font-medium">{signatarioNome}</p>
                <p className="text-sm text-muted-foreground">{signatarioEmail}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Um código de verificação será enviado para o e-mail do signatário
                para confirmar sua identidade antes da assinatura.
              </p>

              <Button
                onClick={handleSendRequest}
                disabled={isSubmitting}
                className="w-full btn-primary"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Solicitação
              </Button>
            </div>
          )}

          {/* Step 2: Verify OTP */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm">
                  Código enviado para <strong>{signatarioEmail}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Código de Verificação</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>O código expira em 30 minutos</span>
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={enteredOtp.length !== 6}
                className="w-full btn-primary"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Verificar Código
              </Button>
            </div>
          )}

          {/* Step 3: Sign */}
          {step === "sign" && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">
                  Identidade verificada com sucesso
                </span>
              </div>

              <div className="space-y-2">
                <Label>Sua Assinatura</Label>
                <SignatureCanvas
                  onSave={handleSignatureComplete}
                  disabled={isSubmitting || isUploading}
                />
              </div>

              {(isSubmitting || isUploading) && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando assinatura...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Assinatura Concluída!</h3>
                <p className="text-sm text-muted-foreground">
                  O documento foi assinado digitalmente com sucesso.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
