import { useMemo, useState } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Download, Search, ExternalLink, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatEuro,
  useAtualizarFatura,
  useCriarFatura,
  useSaasClientes,
  useSaasConfigFaturacao,
  useSaasFaturas,
} from "@/hooks/useSaas";
import { exportarFaturaPdf } from "@/utils/saasInvoicePdf";

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paga: "default",
  emitida: "secondary",
  vencida: "destructive",
  rascunho: "outline",
  anulada: "outline",
};

const estadoLabel: Record<string, string> = {
  paga: "Paga",
  emitida: "Emitida",
  vencida: "Vencida",
  rascunho: "Rascunho",
  anulada: "Anulada",
};

const hoje = () => new Date().toISOString().slice(0, 10);

export default function SaasFaturas() {
  const { data: faturas = [], isLoading } = useSaasFaturas();
  const { data: clientes = [] } = useSaasClientes();
  const { data: config } = useSaasConfigFaturacao();
  const criar = useCriarFatura();
  const atualizar = useAtualizarFatura();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    descricao: "",
    subtotal: "0",
    taxa_iva: "23",
    data_emissao: hoje(),
    data_vencimento: hoje(),
    periodo_inicio: "",
    periodo_fim: "",
    provedor: "",
    referencia_externa: "",
    url_fatura_provedor: "",
    notas: "",
  });

  const abrirNova = () => {
    const prazo = config?.prazo_pagamento_dias ?? 8;
    const venc = new Date();
    venc.setDate(venc.getDate() + prazo);
    setForm({
      tenant_id: "",
      descricao: "",
      subtotal: "0",
      taxa_iva: String(config?.taxa_iva ?? 23),
      data_emissao: hoje(),
      data_vencimento: venc.toISOString().slice(0, 10),
      periodo_inicio: "",
      periodo_fim: "",
      provedor: "",
      referencia_externa: "",
      url_fatura_provedor: "",
      notas: "",
    });
    setAberto(true);
  };

  const escolherCliente = (tenantId: string) => {
    const cliente = clientes.find((c) => c.id === tenantId);
    const sub = cliente?.subscricao;
    const valor = sub ? Number(sub.preco) * (1 - Number(sub.desconto_percent) / 100) : 0;
    setForm((f) => ({
      ...f,
      tenant_id: tenantId,
      subtotal: valor ? String(valor.toFixed(2)) : f.subtotal,
      descricao:
        cliente && sub
          ? `Subscrição ${cliente.plano_nome ?? "da plataforma"} — ${sub.ciclo === "anual" ? "anuidade" : "mensalidade"}`
          : f.descricao,
    }));
  };

  const submeter = async (emitir: boolean) => {
    if (!form.tenant_id) {
      toast.error("Escolha o cliente");
      return;
    }
    const cliente = clientes.find((c) => c.id === form.tenant_id);
    await criar.mutateAsync({
      tenant_id: form.tenant_id,
      subscricao_id: cliente?.subscricao?.id ?? null,
      descricao: form.descricao,
      subtotal: Number(form.subtotal) || 0,
      taxa_iva: Number(form.taxa_iva) || 0,
      data_emissao: form.data_emissao,
      data_vencimento: form.data_vencimento,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fim: form.periodo_fim || null,
      provedor: form.provedor || null,
      referencia_externa: form.referencia_externa || null,
      url_fatura_provedor: form.url_fatura_provedor || null,
      notas: form.notas || null,
      emitir,
    });
    setAberto(false);
  };

  const filtradas = useMemo(
    () =>
      faturas.filter((f) => {
        const termo = busca.trim().toLowerCase();
        const combina =
          !termo ||
          f.numero.toLowerCase().includes(termo) ||
          (f.cliente_nome ?? "").toLowerCase().includes(termo) ||
          (f.cliente_nif ?? "").includes(termo);
        const vencida =
          f.estado === "emitida" && new Date(f.data_vencimento) < new Date(hoje());
        const estado = vencida ? "vencida" : f.estado;
        return combina && (filtro === "todos" || estado === filtro);
      }),
    [faturas, busca, filtro]
  );

  const totais = useMemo(() => {
    const emitidas = faturas.filter((f) => f.estado !== "rascunho" && f.estado !== "anulada");
    return {
      total: emitidas.reduce((a, f) => a + Number(f.total), 0),
      pago: emitidas.filter((f) => f.estado === "paga").reduce((a, f) => a + Number(f.total), 0),
      aberto: emitidas.filter((f) => f.estado !== "paga").reduce((a, f) => a + Number(f.total), 0),
    };
  }, [faturas]);

  return (
    <SaasLayout
      title="Faturas"
      subtitle="Faturação das subscrições das empresas clientes"
      actions={
        <Button onClick={abrirNova}>
          <Plus className="w-4 h-4 mr-2" />
          Nova fatura
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total faturado", valor: totais.total },
            { label: "Já recebido", valor: totais.pago },
            { label: "Por receber", valor: totais.aberto },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{formatEuro(c.valor)}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar por número, cliente ou NIF"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="rascunho">Rascunhos</SelectItem>
              <SelectItem value="emitida">Emitidas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
              <SelectItem value="anulada">Anuladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                {!isLoading && filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sem faturas para estes filtros.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((fatura) => {
                  const vencida =
                    fatura.estado === "emitida" && new Date(fatura.data_vencimento) < new Date(hoje());
                  const estado = vencida ? "vencida" : fatura.estado;
                  return (
                    <TableRow key={fatura.id}>
                      <TableCell className="font-medium">{fatura.numero}</TableCell>
                      <TableCell>
                        <p>{fatura.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground">{fatura.descricao}</p>
                      </TableCell>
                      <TableCell>{formatDate(fatura.data_emissao)}</TableCell>
                      <TableCell>{formatDate(fatura.data_vencimento)}</TableCell>
                      <TableCell>{formatEuro(Number(fatura.total))}</TableCell>
                      <TableCell>
                        <Badge variant={estadoVariant[estado]}>{estadoLabel[estado]}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Descarregar PDF"
                          onClick={() => exportarFaturaPdf(fatura, config ?? null)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {fatura.url_fatura_provedor && (
                          <Button variant="ghost" size="icon" asChild title="Fatura do provedor">
                            <a href={fatura.url_fatura_provedor} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {fatura.estado === "rascunho" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Emitir"
                            onClick={() => atualizar.mutate({ id: fatura.id, estado: "emitida" })}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {fatura.estado !== "anulada" && fatura.estado !== "paga" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Anular"
                            onClick={() => atualizar.mutate({ id: fatura.id, estado: "anulada" })}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova fatura</DialogTitle>
            <DialogDescription>
              O número é atribuído automaticamente segundo a numeração configurada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Cliente</Label>
              <Select value={form.tenant_id} onValueChange={escolherCliente}>
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

            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor sem IVA (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.subtotal}
                onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxa_iva}
                onChange={(e) => setForm((f) => ({ ...f, taxa_iva: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de emissão</Label>
              <Input
                type="date"
                value={form.data_emissao}
                onChange={(e) => setForm((f) => ({ ...f, data_emissao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Período de — início</Label>
              <Input
                type="date"
                value={form.periodo_inicio}
                onChange={(e) => setForm((f) => ({ ...f, periodo_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Período até — fim</Label>
              <Input
                type="date"
                value={form.periodo_fim}
                onChange={(e) => setForm((f) => ({ ...f, periodo_fim: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Provedor de pagamento</Label>
              <Input
                value={form.provedor}
                onChange={(e) => setForm((f) => ({ ...f, provedor: e.target.value }))}
                placeholder="Ex.: Stripe, Paddle, transferência"
              />
            </div>
            <div className="space-y-2">
              <Label>Referência do provedor</Label>
              <Input
                value={form.referencia_externa}
                onChange={(e) => setForm((f) => ({ ...f, referencia_externa: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Link da fatura do provedor</Label>
              <Input
                value={form.url_fatura_provedor}
                onChange={(e) => setForm((f) => ({ ...f, url_fatura_provedor: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas na fatura</Label>
              <Textarea
                rows={3}
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>

            <p className="sm:col-span-2 text-sm text-muted-foreground">
              Total com IVA:{" "}
              <strong>
                {formatEuro(
                  (Number(form.subtotal) || 0) * (1 + (Number(form.taxa_iva) || 0) / 100)
                )}
              </strong>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => submeter(false)} disabled={criar.isPending}>
              Guardar rascunho
            </Button>
            <Button onClick={() => submeter(true)} disabled={criar.isPending}>
              Emitir fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
