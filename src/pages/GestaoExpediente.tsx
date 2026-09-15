import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Search, Trophy, CalendarDays, Users } from "lucide-react";
import {
  useEstatisticasExpediente,
  useRegistosExpedienteTenant,
  somarSegundosPorDia,
  formatarDuracao,
} from "@/hooks/useExpediente";

function hojeLisboa() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

type FiltroEstado = "todos" | "em_servico" | "fora";

export default function GestaoExpediente() {
  const [dataInicio, setDataInicio] = useState(diasAtras(29));
  const [dataFim, setDataFim] = useState(hojeLisboa());
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");

  const { data: estatisticas = [], isLoading } = useEstatisticasExpediente(dataInicio, dataFim);
  const { data: registos = [] } = useRegistosExpedienteTenant(dataInicio, dataFim);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return estatisticas.filter((e) => {
      if (termo && !e.nome_completo.toLowerCase().includes(termo)) return false;
      if (estado === "em_servico") return e.em_servico;
      if (estado === "fora") return !e.em_servico;
      return true;
    });
  }, [estatisticas, busca, estado]);

  const totalSegundos = estatisticas.reduce((acc, e) => acc + Number(e.segundos_trabalhados || 0), 0);
  const emServicoAgora = estatisticas.filter((e) => e.em_servico).length;
  const comHoras = estatisticas.filter((e) => Number(e.segundos_trabalhados) > 0);
  const maisHoras = comHoras[0];
  const maisDias = [...estatisticas].sort((a, b) => b.dias_online - a.dias_online)[0];

  const porDia = useMemo(() => {
    const mapa = somarSegundosPorDia(registos);
    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([dia, segundos]) => ({
        dia: new Date(dia + "T00:00:00").toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
        }),
        horas: Number((segundos / 3600).toFixed(2)),
      }));
  }, [registos]);

  return (
    <AppLayout title="Expediente" subtitle="Horas de trabalho registadas pelos motoristas">
      <div className="space-y-6">
        {/* Filtros */}
        <div className="card-elevated p-4 flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="inicio">De</Label>
            <Input
              id="inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="fim">Até</Label>
            <Input
              id="fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            {(
              [
                { key: "todos", label: "Todos" },
                { key: "em_servico", label: "Em serviço" },
                { key: "fora", label: "Fora de serviço" },
              ] as { key: FiltroEstado; label: string }[]
            ).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={estado === f.key ? "default" : "outline"}
                onClick={() => setEstado(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar motorista"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Total de horas
            </p>
            <p className="text-2xl font-semibold">{formatarDuracao(totalSegundos)}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Em serviço agora
            </p>
            <p className="text-2xl font-semibold">{emServicoAgora}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Mais tempo online
            </p>
            <p className="text-lg font-semibold truncate">{maisHoras?.nome_completo || "—"}</p>
            <p className="text-sm text-muted-foreground">
              {maisHoras ? formatarDuracao(Number(maisHoras.segundos_trabalhados)) : ""}
            </p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Mais dias online
            </p>
            <p className="text-lg font-semibold truncate">{maisDias?.nome_completo || "—"}</p>
            <p className="text-sm text-muted-foreground">
              {maisDias ? `${maisDias.dias_online} dias` : ""}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">Horas por dia</h3>
          {porDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos no período escolhido.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    formatter={(v: number) => [`${v} h`, "Horas"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motorista</TableHead>
                <TableHead>Dias online</TableHead>
                <TableHead>Total de horas</TableHead>
                <TableHead>Média diária</TableHead>
                <TableHead>Último registo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    A carregar…
                  </TableCell>
                </TableRow>
              ) : lista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum motorista encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                lista.map((e) => {
                  const segundos = Number(e.segundos_trabalhados || 0);
                  const media = e.dias_online > 0 ? segundos / e.dias_online : 0;
                  return (
                    <TableRow key={e.motorista_id}>
                      <TableCell className="font-medium">{e.nome_completo}</TableCell>
                      <TableCell>{e.dias_online}</TableCell>
                      <TableCell>{formatarDuracao(segundos)}</TableCell>
                      <TableCell>{formatarDuracao(media)}</TableCell>
                      <TableCell>
                        {e.ultimo_registo
                          ? new Date(e.ultimo_registo).toLocaleString("pt-PT")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {e.em_servico ? (
                          <Badge>Em serviço</Badge>
                        ) : (
                          <Badge variant="outline">Fora de serviço</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
