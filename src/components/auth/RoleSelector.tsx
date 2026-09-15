import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Car, Users, Shield } from "lucide-react";

type AppRole = "super_admin" | "admin_empresa" | "motorista" | "proprietario";

interface RoleSelectorProps {
  availableRoles: AppRole[];
  onSelectRole: (role: AppRole) => void;
  userName?: string;
}

const roleConfig: Record<AppRole, { label: string; description: string; icon: React.ElementType; color: string }> = {
  super_admin: {
    label: "Super Administrador",
    description: "Acesso total ao sistema",
    icon: Shield,
    color: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  },
  admin_empresa: {
    label: "Gestor de Frota",
    description: "Gerir veículos, contratos e motoristas",
    icon: Building2,
    color: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  motorista: {
    label: "Motorista",
    description: "Ver meus contratos e veículos",
    icon: Car,
    color: "bg-success/10 text-success hover:bg-success/20",
  },
  proprietario: {
    label: "Proprietário",
    description: "Gerir meus veículos e contratos",
    icon: Users,
    color: "bg-accent/10 text-accent hover:bg-accent/20",
  },
};

export function RoleSelector({ availableRoles, onSelectRole, userName }: RoleSelectorProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl font-bold">
          Bem-vindo{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription className="text-base">
          Selecione o perfil que deseja utilizar:
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {availableRoles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          
          return (
            <Button
              key={role}
              variant="outline"
              className={`w-full h-auto py-4 px-4 justify-start gap-4 transition-all ${config.color} border-2`}
              onClick={() => onSelectRole(role)}
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
      </CardContent>
    </Card>
  );
}
