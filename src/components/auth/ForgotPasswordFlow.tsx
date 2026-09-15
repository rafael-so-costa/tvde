import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type Step = "email-input" | "email-sent" | "new-password" | "success";

interface ForgotPasswordFlowProps {
  onBack: () => void;
}

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export function ForgotPasswordFlow({ onBack }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<Step>("email-input");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleEmailRecovery = async () => {
    setErrors({});
    
    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ email: err.errors[0].message });
        return;
      }
    }

    setIsSubmitting(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o e-mail de recuperação. Tente novamente.",
        variant: "destructive",
      });
    } else {
      setStep("email-sent");
    }
  };

  const handleNewPassword = async () => {
    setErrors({});
    
    try {
      passwordSchema.parse({ password: newPassword, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[String(error.path[0])] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a senha. Tente novamente.",
        variant: "destructive",
      });
    } else {
      setStep("success");
    }
  };

  const renderEmailInput = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground text-center">
        Digite seu e-mail cadastrado para receber o link de recuperação:
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="recovery-email">E-mail</Label>
        <Input
          id="recovery-email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) {
              handleEmailRecovery();
            }
          }}
          disabled={isSubmitting}
          className="h-12"
          autoComplete="email"
          autoFocus
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <Button 
        className="w-full h-12 btn-accent" 
        onClick={handleEmailRecovery}
        disabled={isSubmitting || !email.trim()}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar link de recuperação"
        )}
      </Button>
    </div>
  );

  const renderEmailSent = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
        <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h3 className="font-semibold text-lg">Verifique seu e-mail</h3>
        <p className="text-muted-foreground mt-2">
          Enviamos um link de recuperação para{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p>Não recebeu o e-mail? Verifique sua pasta de spam ou lixo eletrônico.</p>
      </div>

      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => {
            setEmail("");
            setStep("email-input");
          }}
        >
          Tentar outro e-mail
        </Button>
        <Button variant="ghost" className="w-full" onClick={onBack}>
          Voltar ao login
        </Button>
      </div>
    </div>
  );

  const renderNewPassword = () => (
    <div className="space-y-4">
      <p className="text-muted-foreground text-center">
        Crie sua nova senha:
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isSubmitting}
          className="h-12"
          autoFocus
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
        <Input
          id="confirm-new-password"
          type="password"
          placeholder="••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) {
              handleNewPassword();
            }
          }}
          disabled={isSubmitting}
          className="h-12"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <Button 
        className="w-full h-12 btn-accent" 
        onClick={handleNewPassword}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Salvando...
          </>
        ) : (
          "Salvar nova senha"
        )}
      </Button>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h3 className="font-semibold text-lg">Senha alterada!</h3>
        <p className="text-muted-foreground mt-2">
          Sua senha foi alterada com sucesso. Agora você pode fazer login.
        </p>
      </div>

      <Button className="w-full h-12 btn-accent" onClick={onBack}>
        Ir para o login
      </Button>
    </div>
  );

  const getTitle = () => {
    switch (step) {
      case "email-input": return "Recuperar senha";
      case "email-sent": return "E-mail enviado";
      case "new-password": return "Nova senha";
      case "success": return "Sucesso";
      default: return "Recuperar senha";
    }
  };

  const canGoBack = step === "email-input";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl flex-1 pr-10">{getTitle()}</CardTitle>
        </div>
        {step === "email-input" && (
          <CardDescription>
            Enviaremos um link para redefinir sua senha
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {step === "email-input" && renderEmailInput()}
        {step === "email-sent" && renderEmailSent()}
        {step === "new-password" && renderNewPassword()}
        {step === "success" && renderSuccess()}
      </CardContent>
    </Card>
  );
}
