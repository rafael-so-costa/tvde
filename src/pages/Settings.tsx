import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Building2,
  FileText,
  Bell,
  Shield,
  CreditCard,
  Upload,
  Save,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

function MotoristaSettings() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newPassword && !newEmail) {
      toast.error("Preencha pelo menos um campo para alterar");
      return;
    }
    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    setIsSaving(true);
    try {
      const updates: any = {};
      if (newPassword) updates.password = newPassword;
      if (newEmail) updates.email = newEmail.trim().toLowerCase();
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      toast.success("Dados atualizados com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      if (newEmail) setNewEmail("");
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout title="Configuração" subtitle="Segurança da conta">
      <div className="max-w-xl">
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Credenciais de Acesso
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newEmail">Alterar Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Novo email (deixe vazio para manter)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newPass">Nova Senha</Label>
              <Input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPass">Confirmar Nova Senha</Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe os campos vazios se não quiser alterar.
            </p>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function AdminSettings() {
  return (
    <AppLayout title="Configurações" subtitle="Gerir preferências da aplicação">
      <div className="max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden md:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden md:inline">Faturação</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Informações do Perfil</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground text-2xl font-bold">
                    AD
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Alterar Foto
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG ou GIF. Máximo 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome</label>
                    <input type="text" defaultValue="Administrador" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input type="email" defaultValue="admin@tvdepro.pt" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Telefone</label>
                    <input type="tel" defaultValue="+351 912 345 678" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Cargo</label>
                    <input type="text" defaultValue="Administrador" className="input-field mt-1" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="company">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Dados da Empresa</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome da Empresa</label>
                    <input type="text" defaultValue="TVDE Pro Lda" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">NIF</label>
                    <input type="text" defaultValue="509123456" className="input-field mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Morada</label>
                    <input type="text" defaultValue="Av. da Liberdade 123, 1250-096 Lisboa" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Email Comercial</label>
                    <input type="email" defaultValue="geral@tvdepro.pt" className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Telefone</label>
                    <input type="tel" defaultValue="+351 210 123 456" className="input-field mt-1" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Templates de Contrato</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Contrato Padrão TVDE</p>
                      <p className="text-sm text-muted-foreground">Última atualização: 15/01/2024</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Editar</Button>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Novo Template
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Preferências de Notificação</h3>
              <div className="space-y-4">
                {[
                  { label: "Documentos a expirar", description: "Alertas para documentos próximos do vencimento" },
                  { label: "Contratos a terminar", description: "Notificação quando contratos estão próximos do fim" },
                  { label: "Pagamentos pendentes", description: "Lembretes de faturas por pagar" },
                  { label: "Novos motoristas", description: "Quando um novo motorista se regista" },
                  { label: "Resumo semanal", description: "Email com resumo da atividade semanal" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        Email
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        Push
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Métodos de Pagamento</h3>
              <p className="text-muted-foreground mb-4">Configure os métodos de pagamento aceites para os seus clientes.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium">Transferência Bancária</p>
                      <p className="text-sm text-muted-foreground">IBAN: PT50 0002 0123 ****</p>
                    </div>
                  </div>
                  <Badge>Ativo</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">Segurança</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Senha Atual</label>
                    <input type="password" className="input-field mt-1" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Nova Senha</label>
                    <input type="password" className="input-field mt-1" placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="btn-primary">
                    <Shield className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function Settings() {
  const { activeRole } = useAuth();
  
  if (activeRole === "motorista" || activeRole === "proprietario") {
    return <MotoristaSettings />;
  }
  
  return <AdminSettings />;
}
