import { useMemo, useState } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatEuro,
  useRegistarPagamento,
  useSaasClientes,
  useSaasFaturas,
  useSaasPagamentos,
} from "@/hooks/useSaas";

const metodoLabel: Record<string, string> = {
  transferencia: "Transferência",
  mbway: "MB Way",
  multibanco: "Multibanco",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  stripe: "Stripe",
  paddle: "Paddle",
  outro: "Outro",
};

const hoje = () => new Date().toISOString().slice(0, 10);

export default function SaasPagamentos() {
  const { data: pagamentos = [], isLoading } = useSaasPagamentos();
  const { data: faturas = [] } = useSaasFaturas();
  const { data: clientes = [] } = useSaasClientes();
  const registar = useRegistarPagamento();

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    fatura_id: "",
    valor: "0",
    data_pagamento: hoje(),
    metodo: "transferencia",
    referencia: "",
    notas: "",
  });

  const faturasDoCliente = useMemo(
    () =>
      faturas.filter(
        (f) => f.tenant_id === form.tenant_id && f.estado !== "anulada" && f.estado !== "paga"
      ),
    [faturas, form.tenant_id]
  );

  const submeter = async () => {
    if (!form.tenant_id) {
      toast.error("Escolha o cliente");
      return;
    }
    if (!Number(form.valor)) {
      toast.error("Indique o valor recebido");
      return;
    }
    await registar.mutateAsync({
      tenant_id: form.tenant_id,
      fatura_id: form.fatura_id || null,
      valor: Number(form.valor),
      data_pagamento: form.data_pagamento,
      metodo: form.metodo,
      referencia: form.referencia,
      notas: form.notas,
    });
    setAberto(false);
    setForm({
      tenant_id: "",
      fatura_id: "",
      valor: "0",
      data_pagamento: hoje(),
      metodo: "transferencia",
      referencia: "",
      notas: "",
    });
  };

  const nomeCliente = (tenantId: string) =>
    clientes.find((c) => c.id === tenantId)?.nome_empresa ?? "—";
  const numeroFatura = (faturaId: string | null) =>
    faturaId ? faturas.find((f) => f.id === faturaId)?.numero ?? "—" : "Sem fatura";

  const totalMes = pagamentos
    .filter((p) => p.estado === "confirmado" && p.data_pagamento.startsWith(hoje().slice(0, 7)))
    .reduce((a, p) => a + Number(p.valor), 0);

  return (
    <SaasLayout
      title="Pagamentos"
      subtitle="Recebimentos das empresas clientes"
      actions={
        <Button onClick={() => setAberto(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registar pagamento
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{formatEuro(totalMes)}</p>
              <p className="text-sm text-muted-foreground">Recebido este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Cobrança automática
              </CardTitle>
              <CardDescription>
                Neste momento os pagamentos são registados manualmente. Quando quiser cobrar
                automaticamente por cartão, é possível ligar um meio de pagamento e os recebimentos
                passam a entrar aqui sozinhos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      A carregar…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && pagamentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Ainda não há pagamentos registados.
                    </TableCell>
                  </TableRow>
                )}
                {pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.data_pagamento)}</TableCell>
                    <TableCell>{nomeCliente(p.tenant_id)}</TableCell>
                    <TableCell>{numeroFatura(p.fatura_id)}</TableCell>
                    <TableCell>{metodoLabel[p.metodo] ?? p.metodo}</TableCell>
                    <TableCell className="text-muted-foreground">{p.referencia ?? "—"}</TableCell>
                    <TableCell>{formatEuro(Number(p.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={p.estado === "confirmado" ? "default" : "outline"}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registar pagamento</DialogTitle>
            <DialogDescription>
              Ao cobrir o total da fatura, esta passa automaticamente a paga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={form.tenant_id}
                onValueChange={(v) => setForm((f) => ({ ...f, tenant_id: v, fatura_id: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher empresa" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fatura (opcional)</Label>
              <Select
                value={form.fatura_id}
                onValueChange={(v) => {
                  const fatura = faturasDoCliente.find((f) => f.id === v);
                  setForm((f) => ({
                    ...f,
                    fatura_id: v,
                    valor: fatura ? String(Number(fatura.total).toFixed(2)) : f.valor,
                  }));
                }}
                disabled={!form.tenant_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem fatura associada" />
                </SelectTrigger>
                <SelectContent>
                  {faturasDoCliente.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.numero} — {formatEuro(Number(f.total))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={form.metodo} onValueChange={(v) => setForm((f) => ({ ...f, metodo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metodoLabel).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referência</Label>
              <Input
                value={form.referencia}
                onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={registar.isPending}>
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
