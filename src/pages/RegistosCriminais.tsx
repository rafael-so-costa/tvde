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
import { toast } from "sonner";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  FileWarning,
} from "lucide-react";
import {
  useRegistosCriminaisTenant,
  useMotoristasAtivos,
  useValidarRegistoCriminal,
  obterLinkRegistoCriminal,
  diasParaVencer,
  type RegistoCriminalComMotorista,
} from "@/hooks/useRegistoCriminal";

type Filtro = "todos" | "pendentes" | "validos" | "a_expirar" | "vencidos" | "sem_documento";

const filtros: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Pendentes de validação" },
  { key: "validos", label: "Válidos" },
  { key: "a_expirar", label: "A expirar (30 dias)" },
  { key: "vencidos", label: "Vencidos" },
  { key: "sem_documento", label: "Sem documento" },
];

function EstadoBadge({ registo }: { registo: RegistoCriminalComMotorista }) {
  if (registo.status === "rejeitado") {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
  }
  if (registo.status === "pendente_validacao") {
    return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Em validação</Badge>;
  }
  const dias = diasParaVencer(registo.data_validade);
  if (dias !== null && dias < 0) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Vencido</Badge>;
  }
  if (dias !== null && dias <= 30) {
    return (
      <Badge variant="outline" className="gap-1 border-orange-300 text-orange-600">
        <AlertTriangle className="w-3 h-3" /> {dias} dias
      </Badge>
    );
  }
  return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Válido</Badge>;
}

export default function RegistosCriminais() {
  const { data: registos = [], isLoading } = useRegistosCriminaisTenant();
  const { data: motoristas = [] } = useMotoristasAtivos();
  const validar = useValidarRegistoCriminal();

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<RegistoCriminalComMotorista | null>(null);
  const [codigo, setCodigo] = useState("");
  const [validade, setValidade] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const semDocumento = useMemo(() => {
    const comRegisto = new Set(registos.map((r) => r.motorista_id));
    return motoristas.filter((m) => !comRegisto.has(m.id));
  }, [registos, motoristas]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return registos.filter((r) => {
      const nome = r.motorista?.nome_completo?.toLowerCase() || "";
      if (termo && !nome.includes(termo) && !(r.codigo_consulta || "").toLowerCase().includes(termo)) {
        return false;
      }
      const dias = diasParaVencer(r.data_validade);
      switch (filtro) {
        case "pendentes":
          return r.status === "pendente_validacao";
        case "validos":
          return r.status === "validado" && dias !== null && dias > 30;
        case "a_expirar":
          return r.status === "validado" && dias !== null && dias >= 0 && dias <= 30;
        case "vencidos":
          return dias !== null && dias < 0;
        case "sem_documento":
          return false;
        default:
          return true;
      }
    });
  }, [registos, filtro, busca]);

  const abrirFicheiro = async (registo: RegistoCriminalComMotorista) => {
    try {
      const url = await obterLinkRegistoCriminal(registo.arquivo_path || registo.arquivo_url);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o ficheiro: " + (error as Error).message);
    }
  };

  const abrirDetalhe = (registo: RegistoCriminalComMotorista) => {
    setSelecionado(registo);
    setCodigo(registo.codigo_consulta || "");
    setValidade(registo.data_validade || "");
    setObservacoes(registo.observacoes_empresa || "");
  };

  const submeter = async (status: "validado" | "rejeitado") => {
    if (!selecionado) return;
    if (status === "validado" && !validade) {
      toast.error("Indica a data de validade antes de validar.");
      return;
    }
    if (status === "rejeitado" && !observacoes.trim()) {
      toast.error("Indica o motivo da rejeição.");
      return;
    }
    await validar.mutateAsync({
      id: selecionado.id,
      status,
      observacoes: observacoes.trim() || null,
      codigoConsulta: codigo.trim() || null,
      dataValidade: validade || null,
    });
    setSelecionado(null);
  };

  const pendentes = registos.filter((r) => r.status === "pendente_validacao").length;
  const vencidos = registos.filter((r) => {
    const d = diasParaVencer(r.data_validade);
    return d !== null && d < 0;
  }).length;

  return (
    <AppLayout title="Registos Criminais" subtitle="Gestão dos certificados de registo criminal dos motoristas">
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Documentos</p>
            <p className="text-2xl font-semibold">{registos.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Pendentes de validação</p>
            <p className="text-2xl font-semibold">{pendentes}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className="text-2xl font-semibold text-destructive">{vencidos}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground">Motoristas sem documento</p>
            <p className="text-2xl font-semibold">{semDocumento.length}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar motorista ou código"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {filtro === "sem_documento" ? (
          <div className="card-elevated p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <FileWarning className="w-4 h-4" /> Motoristas sem registo criminal
            </h3>
            {semDocumento.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os motoristas têm documento enviado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {semDocumento.map((m) => (
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
                  <TableHead>Código de consulta</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      A carregar…
                    </TableCell>
                  </TableRow>
                ) : listaFiltrada.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  listaFiltrada.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.motorista?.nome_completo || "—"}
                      </TableCell>
                      <TableCell>{r.codigo_consulta || "—"}</TableCell>
                      <TableCell>
                        {r.data_emissao ? new Date(r.data_emissao).toLocaleDateString("pt-PT") : "—"}
                      </TableCell>
                      <TableCell>
                        {r.data_validade ? new Date(r.data_validade).toLocaleDateString("pt-PT") : "—"}
                      </TableCell>
                      <TableCell><EstadoBadge registo={r} /></TableCell>
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
              <ShieldCheck className="w-4 h-4" /> Validar registo criminal
            </DialogTitle>
            <DialogDescription>
              {selecionado?.motorista?.nome_completo} · enviado a{" "}
              {selecionado ? new Date(selecionado.created_at).toLocaleDateString("pt-PT") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => selecionado && abrirFicheiro(selecionado)}>
              <Eye className="w-4 h-4 mr-2" /> Abrir documento enviado
            </Button>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="codigo-validacao">Código de consulta</Label>
                <Input
                  id="codigo-validacao"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.trim())}
                />
              </div>
              <div>
                <Label htmlFor="validade-validacao">Válido até</Label>
                <Input
                  id="validade-validacao"
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações / motivo de rejeição</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: documento ilegível"
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
