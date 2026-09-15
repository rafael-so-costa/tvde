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
import { Search, Pencil } from "lucide-react";
import {
  formatDate,
  formatEuro,
  useGuardarSubscricao,
  useSaasClientes,
  useSaasPlanos,
  type SaasCliente,
} from "@/hooks/useSaas";

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ativa: "default",
  trial: "secondary",
  suspensa: "destructive",
  cancelada: "outline",
};

const estadoLabel: Record<string, string> = {
  ativa: "Ativa",
  trial: "Período de teste",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

export default function SaasClientes() {
  const [busca, setBusca] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [editar, setEditar] = useState<SaasCliente | null>(null);

  const { data: clientes = [], isLoading } = useSaasClientes();
  const { data: planos = [] } = useSaasPlanos();
  const guardar = useGuardarSubscricao();

  const [form, setForm] = useState({
    plano_id: "",
    ciclo: "mensal",
    estado: "trial",
    preco: "0",
    desconto_percent: "0",
    data_inicio: "",
    proxima_renovacao: "",
    dia_vencimento: "1",
    metodo_cobranca: "manual",
    referencia_externa: "",
    notas: "",
  });

  const abrirEditar = (cliente: SaasCliente) => {
    const s = cliente.subscricao;
    setForm({
      plano_id: s?.plano_id ?? "",
      ciclo: s?.ciclo ?? "mensal",
      estado: s?.estado ?? "trial",
      preco: String(s?.preco ?? 0),
      desconto_percent: String(s?.desconto_percent ?? 0),
      data_inicio: s?.data_inicio ?? new Date().toISOString().slice(0, 10),
      proxima_renovacao: s?.proxima_renovacao ?? "",
      dia_vencimento: String(s?.dia_vencimento ?? 1),
      metodo_cobranca: s?.metodo_cobranca ?? "manual",
      referencia_externa: s?.referencia_externa ?? "",
      notas: s?.notas ?? "",
    });
    setEditar(cliente);
  };

  const submeter = async () => {
    if (!editar) return;
    await guardar.mutateAsync({
      id: editar.subscricao?.id,
      tenant_id: editar.id,
      plano_id: form.plano_id || null,
      ciclo: form.ciclo as "mensal" | "anual",
      estado: form.estado as "trial" | "ativa" | "suspensa" | "cancelada",
      preco: Number(form.preco) || 0,
      desconto_percent: Number(form.desconto_percent) || 0,
      data_inicio: form.data_inicio,
      proxima_renovacao: form.proxima_renovacao || null,
      dia_vencimento: Number(form.dia_vencimento) || 1,
      metodo_cobranca: form.metodo_cobranca,
      referencia_externa: form.referencia_externa,
      notas: form.notas,
    });
    setEditar(null);
  };

  const filtrados = useMemo(
    () =>
      clientes.filter((c) => {
        const termo = busca.trim().toLowerCase();
        const combina =
          !termo ||
          c.nome_empresa.toLowerCase().includes(termo) ||
          c.nif.includes(termo) ||
          (c.email ?? "").toLowerCase().includes(termo);
        const estado = c.subscricao?.estado ?? "sem_subscricao";
        return combina && (filtroEstado === "todos" || estado === filtroEstado);
      }),
    [clientes, busca, filtroEstado]
  );

  return (
    <SaasLayout title="Clientes" subtitle="Empresas que utilizam a plataforma e respetivas subscrições">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar por nome, NIF ou email"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="trial">Período de teste</SelectItem>
              <SelectItem value="suspensa">Suspensas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
              <SelectItem value="sem_subscricao">Sem subscrição</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Próxima renovação</TableHead>
                  <TableHead>Faturado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      A carregar…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Sem clientes para estes filtros.
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((cliente) => {
                  const s = cliente.subscricao;
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <p className="font-medium">{cliente.nome_empresa}</p>
                        <p className="text-xs text-muted-foreground">
                          NIF {cliente.nif} · desde {formatDate(cliente.created_at)}
                        </p>
                      </TableCell>
                      <TableCell>{cliente.plano_nome ?? "—"}</TableCell>
                      <TableCell>
                        {s ? (
                          <Badge variant={estadoVariant[s.estado]}>{estadoLabel[s.estado]}</Badge>
                        ) : (
                          <Badge variant="outline">Sem subscrição</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s ? formatEuro(Number(s.preco) * (1 - Number(s.desconto_percent) / 100)) : "—"}
                        {s?.ciclo === "anual" && <span className="text-xs text-muted-foreground"> /ano</span>}
                      </TableCell>
                      <TableCell>{formatDate(s?.proxima_renovacao)}</TableCell>
                      <TableCell>{formatEuro(cliente.total_faturado)}</TableCell>
                      <TableCell>{formatEuro(cliente.total_pago)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(cliente)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscrição de {editar?.nome_empresa}</DialogTitle>
            <DialogDescription>Plano, preço e estado da cobrança deste cliente.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select
                value={form.plano_id}
                onValueChange={(v) => {
                  const plano = planos.find((p) => p.id === v);
                  setForm((f) => ({
                    ...f,
                    plano_id: v,
                    preco:
                      plano
                        ? String(f.ciclo === "anual" ? plano.preco_anual ?? plano.preco_mensal * 12 : plano.preco_mensal)
                        : f.preco,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher plano" />
                </SelectTrigger>
                <SelectContent>
                  {planos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ciclo</Label>
              <Select value={form.ciclo} onValueChange={(v) => setForm((f) => ({ ...f, ciclo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Período de teste</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preço ({form.ciclo === "anual" ? "por ano" : "por mês"})</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.desconto_percent}
                onChange={(e) => setForm((f) => ({ ...f, desconto_percent: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Dia de vencimento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.dia_vencimento}
                onChange={(e) => setForm((f) => ({ ...f, dia_vencimento: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima renovação</Label>
              <Input
                type="date"
                value={form.proxima_renovacao}
                onChange={(e) => setForm((f) => ({ ...f, proxima_renovacao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de cobrança</Label>
              <Select
                value={form.metodo_cobranca}
                onValueChange={(v) => setForm((f) => ({ ...f, metodo_cobranca: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Registo manual</SelectItem>
                  <SelectItem value="transferencia">Transferência bancária</SelectItem>
                  <SelectItem value="debito_direto">Débito direto</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paddle">Paddle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referência externa</Label>
              <Input
                value={form.referencia_externa}
                onChange={(e) => setForm((f) => ({ ...f, referencia_externa: e.target.value }))}
                placeholder="ID da subscrição no provedor de pagamento"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Notas internas</Label>
              <Textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditar(null)}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={guardar.isPending}>
              Guardar subscrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
