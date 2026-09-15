import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Loader2, Mail, Lock, User, Phone, MapPin, FileText } from "lucide-react";
import { z } from "zod";
import { checkEmailExists } from "@/hooks/useUniqueValidation";

interface GestorSignupFormProps {
  onSubmit: (data: GestorSignupData) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export interface GestorSignupData {
  // User data
  email: string;
  password: string;
  nome_completo: string;
  telefone: string;
  
  // Company data
  nome_empresa: string;
  nif: string;
  endereco: string;
}

const signupSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().min(9, "Telefone inválido"),
  nome_empresa: z.string().min(2, "Nome da empresa é obrigatório"),
  nif: z.string().min(9, "NIF deve ter 9 dígitos").max(9, "NIF deve ter 9 dígitos"),
  endereco: z.string().min(5, "Endereço é obrigatório"),
});

export function GestorSignupForm({ onSubmit, onBack, isSubmitting }: GestorSignupFormProps) {
  const [step, setStep] = useState(1);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formData, setFormData] = useState<GestorSignupData>({
    email: "",
    password: "",
    nome_completo: "",
    telefone: "",
    nome_empresa: "",
    nif: "",
    endereco: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof GestorSignupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep1 = () => {
    const result = signupSchema.pick({ 
      email: true, 
      password: true, 
      nome_completo: true, 
      telefone: true 
    }).safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const result = signupSchema.pick({ 
      nome_empresa: true, 
      nif: true, 
      endereco: true 
    }).safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep1()) {
      // Check for duplicate email
      setIsCheckingEmail(true);
      try {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          setErrors(prev => ({ ...prev, email: "Este e-mail já está sendo usado por outra conta" }));
          setIsCheckingEmail(false);
          return;
        }
        setStep(2);
      } catch (error) {
        console.error("Error checking email:", error);
        setStep(2); // Continue anyway if check fails
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      await onSubmit(formData);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4"
          onClick={step === 1 ? onBack : () => setStep(1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex justify-center mb-4 mt-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <CardTitle className="text-xl font-bold">Criar Conta - Gestor de Frota</CardTitle>
        <CardDescription className="text-base">
          Passo {step} de 2: {step === 1 ? "Dados pessoais" : "Dados da empresa"}
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex gap-2 justify-center mt-4">
          <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome_completo"
                    type="text"
                    placeholder="Seu nome completo"
                    className="pl-10"
                    value={formData.nome_completo}
                    onChange={(e) => updateField("nome_completo", e.target.value)}
                  />
                </div>
                {errors.nome_completo && <p className="text-sm text-destructive">{errors.nome_completo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="912 345 678"
                    className="pl-10"
                    value={formData.telefone}
                    onChange={(e) => updateField("telefone", e.target.value)}
                  />
                </div>
                {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button type="button" className="w-full" onClick={handleNext} disabled={isCheckingEmail}>
                {isCheckingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome_empresa"
                    type="text"
                    placeholder="Nome da sua empresa"
                    className="pl-10"
                    value={formData.nome_empresa}
                    onChange={(e) => updateField("nome_empresa", e.target.value)}
                  />
                </div>
                {errors.nome_empresa && <p className="text-sm text-destructive">{errors.nome_empresa}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif">NIF da Empresa</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nif"
                    type="text"
                    placeholder="123456789"
                    className="pl-10"
                    maxLength={9}
                    value={formData.nif}
                    onChange={(e) => updateField("nif", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                {errors.nif && <p className="text-sm text-destructive">{errors.nif}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endereco"
                    type="text"
                    placeholder="Rua, número, cidade"
                    className="pl-10"
                    value={formData.endereco}
                    onChange={(e) => updateField("endereco", e.target.value)}
                  />
                </div>
                {errors.endereco && <p className="text-sm text-destructive">{errors.endereco}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Após o cadastro, sua conta ficará pendente de aprovação pelo administrador do sistema.
              </p>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
