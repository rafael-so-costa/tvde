import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Car, Users, ArrowLeft } from "lucide-react";

export type LoginUserType = "admin_empresa" | "motorista" | "proprietario";

interface UserTypeSelectorProps {
  onSelect: (type: LoginUserType) => void;
  onBack?: () => void;
  mode: "login" | "signup";
}

const userTypeConfig: Record<LoginUserType, { label: string; description: string; icon: React.ElementType; color: string }> = {
  admin_empresa: {
    label: "Gestor de Frota",
    description: "Gestores e administradores de empresas TVDE",
    icon: Building2,
    color: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/30",
  },
  motorista: {
    label: "Motorista",
    description: "Motoristas de veículos TVDE",
    icon: Car,
    color: "bg-success/10 text-success hover:bg-success/20 border-success/30",
  },
  proprietario: {
    label: "Proprietário",
    description: "Proprietários de veículos",
    icon: Users,
    color: "bg-accent/10 text-accent hover:bg-accent/20 border-accent/30",
  },
};

export function UserTypeSelector({ onSelect, onBack, mode }: UserTypeSelectorProps) {
  const typesToShow: LoginUserType[] = mode === "signup" 
    ? ["admin_empresa"] // Only admin_empresa can signup
    : ["admin_empresa", "motorista", "proprietario"]; // All can login

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        {onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}
        <CardTitle className="text-xl font-bold">
          {mode === "login" ? "Como deseja entrar?" : "Criar Conta"}
        </CardTitle>
        <CardDescription className="text-base">
          {mode === "login" 
            ? "Selecione o tipo de conta para fazer login:"
            : "Crie sua conta como Gestor de Frota:"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {typesToShow.map((type) => {
          const config = userTypeConfig[type];
          const Icon = config.icon;
          
          return (
            <Button
              key={type}
              variant="outline"
              className={`w-full h-auto py-4 px-4 justify-start gap-4 transition-all ${config.color} border-2`}
              onClick={() => onSelect(type)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">{config.label}</p>
                <p className="text-sm text-muted-foreground font-normal">{config.description}</p>
              </div>
            </Button>
          );
        })}
        
        {mode === "signup" && (
          <p className="text-sm text-muted-foreground text-center mt-4 pt-4 border-t">
            <strong>Nota:</strong> O cadastro de Motoristas e Proprietários é feito pelo Gestor de Frota após a aprovação do cadastro.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
