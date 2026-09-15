import { useState } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import {
  formatDate,
  useGuardarMembroEquipa,
  useSaasAcesso,
  useSaasEquipa,
  type SaasAdmin,
  type SaasPapel,
} from "@/hooks/useSaas";

const papelLabel: Record<SaasPapel, string> = {
  owner: "Administrador",
  financeiro: "Financeiro",
  suporte: "Suporte",
};

const papelDescricao: Record<SaasPapel, string> = {
  owner: "Acesso total, incluindo gerir a equipa interna",
  financeiro: "Clientes, planos, faturas e pagamentos",
  suporte: "Consulta de clientes e faturas",
};

export default function SaasEquipa() {
  const { data: equipa = [], isLoading } = useSaasEquipa();
  const { isOwner } = useSaasAcesso();
  const guardar = useGuardarMembroEquipa();

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<{ id?: string; email: string; nome: string; papel: SaasPapel; ativo: boolean }>({
    email: "",
    nome: "",
    papel: "suporte",
    ativo: true,
  });

  const abrirNovo = () => {
    setForm({ email: "", nome: "", papel: "suporte", ativo: true });
    setAberto(true);
  };

  const abrirEditar = (membro: SaasAdmin) => {
    setForm({
      id: membro.id,
      email: membro.email,
      nome: membro.nome ?? "",
      papel: membro.papel,
      ativo: membro.ativo,
    });
    setAberto(true);
  };

  const submeter = async () => {
    await guardar.mutateAsync(form);
    setAberto(false);
  };

  return (
    <SaasLayout
      title="Equipa Interna"
      subtitle="Quem tem acesso a esta área de gestão"
      actions={
        isOwner ? (
          <Button onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar membro
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Níveis de acesso</CardTitle>
            <CardDescription>
              O membro tem de ter já uma conta criada na plataforma com o mesmo email.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.keys(papelLabel) as SaasPapel[]).map((papel) => (
              <div key={papel} className="rounded-lg border border-border p-4">
                <p className="font-medium">{papelLabel[papel]}</p>
                <p className="text-sm text-muted-foreground">{papelDescricao[papel]}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Desde</TableHead>
                  {isOwner && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      A carregar…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && equipa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Ainda não adicionou membros à equipa interna.
                    </TableCell>
                  </TableRow>
                )}
                {equipa.map((membro) => (
                  <TableRow key={membro.id}>
                    <TableCell>{membro.nome ?? "—"}</TableCell>
                    <TableCell>{membro.email}</TableCell>
                    <TableCell>{papelLabel[membro.papel]}</TableCell>
                    <TableCell>
                      <Badge variant={membro.ativo ? "default" : "outline"}>
                        {membro.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(membro.created_at)}</TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(membro)}>
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar membro" : "Adicionar membro"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Alterar o nível de acesso ou desativar o acesso."
                : "Indique o email da conta já existente na plataforma."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                disabled={!!form.id}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select
                value={form.papel}
                onValueChange={(v) => setForm((f) => ({ ...f, papel: v as SaasPapel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(papelLabel) as SaasPapel[]).map((papel) => (
                    <SelectItem key={papel} value={papel}>
                      {papelLabel[papel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.id && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                />
                <Label>Acesso ativo</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={guardar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
