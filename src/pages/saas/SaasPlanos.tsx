import { useState } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import {
  formatEuro,
  useEliminarPlano,
  useGuardarPlano,
  useSaasPlanos,
  type SaasPlano,
} from "@/hooks/useSaas";

const vazio = {
  id: undefined as string | undefined,
  nome: "",
  descricao: "",
  preco_mensal: "0",
  preco_anual: "",
  limite_veiculos: "",
  limite_motoristas: "",
  funcionalidades: "",
  ativo: true,
  ordem: "0",
};

export default function SaasPlanos() {
  const { data: planos = [], isLoading } = useSaasPlanos();
  const guardar = useGuardarPlano();
  const eliminar = useEliminarPlano();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(vazio);

  const abrirNovo = () => {
    setForm(vazio);
    setAberto(true);
  };

  const abrirEditar = (plano: SaasPlano) => {
    setForm({
      id: plano.id,
      nome: plano.nome,
      descricao: plano.descricao ?? "",
      preco_mensal: String(plano.preco_mensal),
      preco_anual: plano.preco_anual != null ? String(plano.preco_anual) : "",
      limite_veiculos: plano.limite_veiculos != null ? String(plano.limite_veiculos) : "",
      limite_motoristas: plano.limite_motoristas != null ? String(plano.limite_motoristas) : "",
      funcionalidades: plano.funcionalidades.join("\n"),
      ativo: plano.ativo,
      ordem: String(plano.ordem),
    });
    setAberto(true);
  };

  const submeter = async () => {
    if (!form.nome.trim()) return;
    await guardar.mutateAsync({
      id: form.id,
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      preco_mensal: Number(form.preco_mensal) || 0,
      preco_anual: form.preco_anual ? Number(form.preco_anual) : null,
      limite_veiculos: form.limite_veiculos ? Number(form.limite_veiculos) : null,
      limite_motoristas: form.limite_motoristas ? Number(form.limite_motoristas) : null,
      funcionalidades: form.funcionalidades
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      ativo: form.ativo,
      ordem: Number(form.ordem) || 0,
    });
    setAberto(false);
  };

  return (
    <SaasLayout
      title="Planos"
      subtitle="Preços e limites oferecidos às empresas clientes"
      actions={
        <Button onClick={abrirNovo}>
          <Plus className="w-4 h-4 mr-2" />
          Novo plano
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">A carregar…</p>
      ) : planos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">Ainda não criou planos.</p>
            <Button onClick={abrirNovo}>
              <Plus className="w-4 h-4 mr-2" />
              Criar o primeiro plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {planos.map((plano) => (
            <Card key={plano.id} className={plano.ativo ? "" : "opacity-60"}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{plano.nome}</CardTitle>
                  <Badge variant={plano.ativo ? "default" : "outline"}>
                    {plano.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <CardDescription>{plano.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">
                    {formatEuro(plano.preco_mensal)}
                    <span className="text-sm font-normal text-muted-foreground"> /mês</span>
                  </p>
                  {plano.preco_anual != null && (
                    <p className="text-sm text-muted-foreground">
                      {formatEuro(plano.preco_anual)} por ano
                    </p>
                  )}
                </div>
                <ul className="space-y-1 text-sm">
                  <li className="text-muted-foreground">
                    Veículos: {plano.limite_veiculos ?? "sem limite"}
                  </li>
                  <li className="text-muted-foreground">
                    Motoristas: {plano.limite_motoristas ?? "sem limite"}
                  </li>
                  {plano.funcionalidades.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(plano)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminar.mutate(plano.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço mensal (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_mensal}
                onChange={(e) => setForm((f) => ({ ...f, preco_mensal: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço anual (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_anual}
                onChange={(e) => setForm((f) => ({ ...f, preco_anual: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Limite de veículos</Label>
              <Input
                type="number"
                value={form.limite_veiculos}
                onChange={(e) => setForm((f) => ({ ...f, limite_veiculos: e.target.value }))}
                placeholder="vazio = sem limite"
              />
            </div>
            <div className="space-y-2">
              <Label>Limite de motoristas</Label>
              <Input
                type="number"
                value={form.limite_motoristas}
                onChange={(e) => setForm((f) => ({ ...f, limite_motoristas: e.target.value }))}
                placeholder="vazio = sem limite"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Funcionalidades (uma por linha)</Label>
              <Textarea
                rows={4}
                value={form.funcionalidades}
                onChange={(e) => setForm((f) => ({ ...f, funcionalidades: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label>Plano ativo</Label>
            </div>
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
