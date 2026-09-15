import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import {
  ReceiptText,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import {
  useRecibosVerdesTenant,
  useValidarReciboVerde,
  obterLinkReciboVerde,
  formatarEuros,
  MESES,
  type ReciboVerdeComMotorista,
} from "@/hooks/useRecibosVerdes";
import { useMotoristasAtivos } from "@/hooks/useRegistoCriminal";

type Filtro = "todos" | "pendentes" | "validados" | "rejeitados" | "sem_recibo";

const filtros: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Pendentes" },
  { key: "validados", label: "Validados" },
  { key: "rejeitados", label: "Rejeitados" },
  { key: "sem_recibo", label: "Sem recibo no mês" },
];

function EstadoBadge({ status }: { status: string }) {
  if (status === "rejeitado") {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
  }
  if (status === "validado") {
    return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Validado</Badge>;
  }
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
}

export default function GestaoRecibosVerdes() {
  const { data: recibos = [], isLoading } = useRecibosVerdesTenant();
  const { data: motoristas = [] } = useMotoristasAtivos();
  const validar = useValidarReciboVerde();

  const agora = new Date();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState(String(agora.getFullYear()));
  const [mes, setMes] = useState("todos");
  const [selecionado, setSelecionado] = useState<ReciboVerdeComMotorista | null>(null);
  const [numero, setNumero] = useState("");
  const [total, setTotal] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const anos = useMemo(() => {
    const set = new Set<string>([String(agora.getFullYear())]);
    recibos.forEach((r) => r.ano && set.add(String(r.ano)));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [recibos, agora]);

  const noPeriodo = useMemo(
    () =>
      recibos.filter((r) => {
        if (ano !== "todos" && String(r.ano) !== ano) return false;
        if (mes !== "todos" && String(r.mes) !== mes) return false;
        return true;
      }),
    [recibos, ano, mes],
  );

  const semRecibo = useMemo(() => {
    const comRecibo = new Set(noPeriodo.map((r) => r.motorista_id));
    return motoristas.filter((m) => !comRecibo.has(m.id));
  }, [noPeriodo, motoristas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return noPeriodo.filter((r) => {
      const nome = r.motorista?.nome_completo?.toLowerCase() || "";
      if (termo && !nome.includes(termo) && !(r.numero_documento || "").toLowerCase().includes(termo)) {
        return false;
      }
      switch (filtro) {
        case "pendentes":
          return r.status === "pendente_validacao";
        case "validados":
          return r.status === "validado";
        case "rejeitados":
          return r.status === "rejeitado";
        case "sem_recibo":
          return false;
        default:
          return true;
      }
    });
  }, [noPeriodo, filtro, busca]);

  const totalPeriodo = noPeriodo
    .filter((r) => r.status !== "rejeitado")
    .reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
  const pendentes = noPeriodo.filter((r) => r.status === "pendente_validacao").length;
  const comAvisos = noPeriodo.filter((r) => (r.avisos_validacao || []).length > 0).length;

  const abrirFicheiro = async (recibo: ReciboVerdeComMotorista) => {
    try {
      const url = await obterLinkReciboVerde(recibo.arquivo_path || recibo.arquivo_url);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o ficheiro: " + (error as Error).message);
    }
  };

  const abrirDetalhe = (recibo: ReciboVerdeComMotorista) => {
    setSelecionado(recibo);
    setNumero(recibo.numero_documento || "");
    setTotal(recibo.valor_total !== null ? String(recibo.valor_total) : "");
    setObservacoes(recibo.observacoes_empresa || "");
  };

  const submeter = async (status: "validado" | "rejeitado") => {
    if (!selecionado) return;
    if (status === "rejeitado" && !observacoes.trim()) {
      toast.error("Indica o motivo da rejeição.");
      return;
    }
    await validar.mutateAsync({
      id: selecionado.id,
      status,
      observacoes: observacoes.trim() || null,
      numeroDocumento: numero.trim() || null,
      valorTotal: total ? Number(total) : null,
    });
    setSelecionado(null);
  };

  return (
    <AppLayout title="Recibos Verdes" subtitle="Gestão dos recibos verdes enviados pelos motoristas">
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Recibos no período</p>
            <p className="text-2xl font-semibold">{noPeriodo.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-semibold">{pendentes}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Total (sem rejeitados)</p>
            <p className="text-2xl font-semibold">{formatarEuros(totalPeriodo)}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Com avisos de validação</p>
            <p className="text-2xl font-semibold text-orange-600">{comAvisos}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="card-elevated p-4 flex flex-wrap items-end gap-4">
          <div>
            <Label>Ano</Label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {anos.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MESES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {filtros.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filtro === f.key ? "default" : "outline"}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar motorista ou número"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {filtro === "sem_recibo" ? (
          <div className="card-elevated p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <FileWarning className="w-4 h-4" /> Motoristas sem recibo no período
            </h3>
            {semRecibo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os motoristas enviaram recibo.</p>
            ) : (
              <ul className="divide-y divide-border">
                {semRecibo.map((m) => (
                  <li key={m.id} className="py-3 text-sm flex items-center justify-between">
                    <span className="font-medium">{m.nome_completo}</span>
                    <Badge variant="destructive">Em falta</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Retenção</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      A carregar…
                    </TableCell>
                  </TableRow>
                ) : lista.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum recibo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  lista.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.motorista?.nome_completo || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {r.numero_documento || "—"}
                          {(r.avisos_validacao || []).length > 0 && (
                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.data_emissao ? new Date(r.data_emissao).toLocaleDateString("pt-PT") : "—"}
                      </TableCell>
                      <TableCell>{formatarEuros(r.valor_base)}</TableCell>
                      <TableCell>{formatarEuros(r.retencao_irs)}</TableCell>
                      <TableCell>{formatarEuros(r.valor_total)}</TableCell>
                      <TableCell><EstadoBadge status={r.status} /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => abrirFicheiro(r)} title="Ver documento">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => abrirDetalhe(r)}>
                          Analisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!selecionado} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4" /> Validar recibo verde
            </DialogTitle>
            <DialogDescription>
              {selecionado?.motorista?.nome_completo} · enviado a{" "}
              {selecionado ? new Date(selecionado.created_at).toLocaleDateString("pt-PT") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => selecionado && abrirFicheiro(selecionado)}>
              <Eye className="w-4 h-4 mr-2" /> Abrir recibo enviado
            </Button>

            {selecionado && (selecionado.avisos_validacao || []).length > 0 && (
              <ul className="space-y-1 text-sm text-orange-600">
                {selecionado.avisos_validacao.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {a.mensagem}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <Label htmlFor="numero-validacao">Número do documento</Label>
                <Input
                  id="numero-validacao"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="total-validacao">Total (€)</Label>
                <Input
                  id="total-validacao"
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>NIF do emitente: {selecionado?.nif_emitente || "—"}</p>
              <p>NIF do adquirente: {selecionado?.nif_adquirente || "—"}</p>
              <p>
                Base {formatarEuros(selecionado?.valor_base)} · IVA {formatarEuros(selecionado?.valor_iva)} ·
                Retenção {formatarEuros(selecionado?.retencao_irs)}
              </p>
            </div>

            <div>
              <Label htmlFor="obs-recibo">Observações / motivo de rejeição</Label>
              <Textarea
                id="obs-recibo"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: valores não correspondem ao contrato"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => submeter("rejeitado")} disabled={validar.isPending}>
              Rejeitar
            </Button>
            <Button onClick={() => submeter("validado")} disabled={validar.isPending}>
              Validar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
