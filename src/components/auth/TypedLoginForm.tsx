import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Building2, Car, Users } from "lucide-react";
import { LoginUserType } from "./UserTypeSelector";

interface TypedLoginFormProps {
  userType: LoginUserType;
  onSubmit: (email: string, password: string) => Promise<void>;
  onBack: () => void;
  onForgotPassword: () => void;
  onCreateAccount?: () => void;
  isSubmitting: boolean;
}

const userTypeConfig: Record<LoginUserType, { label: string; icon: React.ElementType; color: string }> = {
  admin_empresa: {
    label: "Gestor de Frota",
    icon: Building2,
    color: "text-primary",
  },
  motorista: {
    label: "Motorista",
    icon: Car,
    color: "text-success",
  },
  proprietario: {
    label: "Proprietário",
    icon: Users,
    color: "text-accent",
  },
};

export function TypedLoginForm({ userType, onSubmit, onBack, onForgotPassword, onCreateAccount, isSubmitting }: TypedLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const config = userTypeConfig[userType];
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-xl bg-muted flex items-center justify-center ${config.color}`}>
            <Icon className="w-8 h-8" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold">Entrar como {config.label}</CardTitle>
        <CardDescription>
          Insira suas credenciais para acessar
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
          <Button
            type="button"
            variant="link"
            className="w-full text-sm"
            onClick={onForgotPassword}
          >
            Esqueci minha senha
          </Button>
          
          {userType === "admin_empresa" && onCreateAccount && (
            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Ainda não tem uma conta?
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCreateAccount}
              >
                Criar conta de empresa
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
