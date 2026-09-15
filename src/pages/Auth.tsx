import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Car, Loader2, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { UserTypeSelector, LoginUserType } from "@/components/auth/UserTypeSelector";
import { TypedLoginForm } from "@/components/auth/TypedLoginForm";
import { GestorSignupForm, GestorSignupData } from "@/components/auth/GestorSignupForm";
import { supabase } from "@/integrations/supabase/client";

type AuthView = "initial" | "login-select" | "login-form" | "signup-select" | "signup-form" | "forgot-password";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roles, activeRole, needsRoleSelection, signIn, signOut, selectRole, loading } = useAuth();
  const { toast } = useToast();

  const [authView, setAuthView] = useState<AuthView>("initial");
  const [selectedLoginType, setSelectedLoginType] = useState<LoginUserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Check if coming from password reset
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("reset") === "true") {
      setAuthView("forgot-password");
    }
  }, [location]);

  // Redirect if already logged in AND has selected a role
  useEffect(() => {
    if (user && !loading && activeRole && !needsRoleSelection) {
      // Check if user is approved
      if (profile?.aprovado === false) {
        return; // Stay on auth page to show pending message
      }
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, loading, activeRole, needsRoleSelection, navigate, location, profile]);

  const handleLogin = async (email: string, password: string) => {
    setIsSubmitting(true);
    
    const { error } = await signIn(email, password);
    
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast({
          title: "Erro de autenticação",
          description: "E-mail ou senha incorretos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleGestorSignup = async (data: GestorSignupData) => {
    setIsSubmitting(true);
    
    try {
      const response = await supabase.functions.invoke('register-gestor', {
        body: data
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        toast({
          title: "Erro no cadastro",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      setSignupSuccess(true);
      toast({
        title: "Cadastro realizado!",
        description: "Aguarde a aprovação do administrador para acessar o sistema.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: typeof roles[number]) => {
    selectRole(role);
    toast({
      title: "Perfil selecionado",
      description: `Você entrou como ${getRoleName(role)}`,
    });
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      super_admin: "Super Administrador",
      admin_empresa: "Gestor de Frota",
      motorista: "Motorista",
      proprietario: "Proprietário",
    };
    return names[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show message if user has no roles assigned
  if (user && !loading && roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Car className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Acesso Pendente</CardTitle>
            <CardDescription className="text-base mt-2">
              Olá{profile?.nome_completo ? `, ${profile.nome_completo.split(" ")[0]}` : ""}! 
              Sua conta ainda não possui um perfil atribuído.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Entre em contato com o administrador do sistema para que ele atribua um perfil à sua conta.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => signOut()}
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending approval message for gestor with unapproved account
  if (user && !loading && profile?.aprovado === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base mt-2">
              Olá{profile?.nome_completo ? `, ${profile.nome_completo.split(" ")[0]}` : ""}! 
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu cadastro foi recebido e está aguardando aprovação do administrador do sistema.
            </p>
            <p className="text-sm text-muted-foreground">
              Você receberá uma notificação quando sua conta for aprovada.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => signOut()}
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show role selection if user is logged in but needs to select a role
  if (user && needsRoleSelection && roles.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <RoleSelector
          availableRoles={roles}
          onSelectRole={handleRoleSelect}
          userName={profile?.nome_completo?.split(" ")[0]}
        />
      </div>
    );
  }

  // Show signup success message
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">Cadastro Realizado!</CardTitle>
            <CardDescription className="text-base mt-2">
              Sua conta foi criada com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Aguarde a aprovação do administrador do sistema. Você será notificado quando sua conta for ativada.
            </p>
            <Button 
              className="w-full"
              onClick={() => {
                setSignupSuccess(false);
                setAuthView("initial");
              }}
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password view
  if (authView === "forgot-password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <ForgotPasswordFlow onBack={() => setAuthView("initial")} />
      </div>
    );
  }

  // Login form after type selection
  if (authView === "login-form" && selectedLoginType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <TypedLoginForm
          userType={selectedLoginType}
          onSubmit={handleLogin}
          onBack={() => {
            setAuthView("login-select");
            setSelectedLoginType(null);
          }}
          onForgotPassword={() => setAuthView("forgot-password")}
          onCreateAccount={() => setAuthView("signup-form")}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  // Login type selection
  if (authView === "login-select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <UserTypeSelector
          mode="login"
          onSelect={(type) => {
            setSelectedLoginType(type);
            setAuthView("login-form");
          }}
          onBack={() => setAuthView("initial")}
        />
      </div>
    );
  }

  // Signup form (only for gestor)
  if (authView === "signup-form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
        <GestorSignupForm
          onSubmit={handleGestorSignup}
          onBack={() => setAuthView("initial")}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  // Initial view with login/signup choice
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg">
              <Car className="w-12 h-12 text-accent-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">TVDE Pro</CardTitle>
          <CardDescription className="text-base">
            Sistema de Gestão de Contratos TVDE
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Button 
            className="w-full h-12 text-base"
            onClick={() => setAuthView("login-select")}
          >
            Entrar na minha conta
          </Button>
          
          <Button 
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setAuthView("signup-form")}
          >
            Criar conta de empresa
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Apenas Gestores de Frota podem criar contas diretamente.
            Motoristas e Proprietários são cadastrados pela empresa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
