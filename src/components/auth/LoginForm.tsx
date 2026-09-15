import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Campo obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

interface LoginFormProps {
  onSubmit: (identifier: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  isSubmitting: boolean;
}

export function LoginForm({ onSubmit, onForgotPassword, isSubmitting }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse({ identifier, password });
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

    await onSubmit(identifier, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">E-mail ou usuário</Label>
        <Input
          id="identifier"
          type="text"
          placeholder="seu@email.com ou usuário"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={isSubmitting}
          className="h-12"
        />
        {errors.identifier && (
          <p className="text-sm text-destructive">{errors.identifier}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="h-12 pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="link"
          className="px-0 text-primary hover:text-primary/80"
          onClick={onForgotPassword}
        >
          Esqueci minha senha
        </Button>
      </div>

      <Button type="submit" className="w-full h-12 btn-accent text-base font-medium" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
