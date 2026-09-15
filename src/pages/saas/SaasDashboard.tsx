import { useMemo } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  TrendingUp,
  Euro,
  AlertTriangle,
  UserPlus,
  Clock,
  CircleSlash,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatEuro,
  useSaasClientes,
  useSaasFaturas,
  useSaasMetricas,
  useSaasPagamentos,
} from "@/hooks/useSaas";

export default function SaasDashboard() {
  const { data: metricas, isLoading } = useSaasMetricas();
  const { data: pagamentos = [] } = useSaasPagamentos();
  const { data: faturas = [] } = useSaasFaturas();
  const { data: clientes = [] } = useSaasClientes();

  const receitaPorMes = useMemo(() => {
    const meses: { chave: string; label: string; recebido: number; faturado: number }[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-PT", { month: "short" }),
        recebido: 0,
        faturado: 0,
      });
    }
    pagamentos
      .filter((p) => p.estado === "confirmado")
      .forEach((p) => {
        const mes = meses.find((m) => p.data_pagamento?.startsWith(m.chave));
        if (mes) mes.recebido += Number(p.valor);
      });
    faturas
      .filter((f) => f.estado !== "rascunho" && f.estado !== "anulada")
      .forEach((f) => {
        const mes = meses.find((m) => f.data_emissao?.startsWith(m.chave));
        if (mes) mes.faturado += Number(f.total);
      });
    return meses;
  }, [pagamentos, faturas]);

  const topClientes = useMemo(
    () => [...clientes].sort((a, b) => b.total_pago - a.total_pago).slice(0, 5),
    [clientes]
  );

  const cards = [
    { icon: Euro, label: "Receita recorrente mensal (MRR)", valor: formatEuro(metricas?.mrr ?? 0) },
    { icon: TrendingUp, label: "Receita anual estimada (ARR)", valor: formatEuro(metricas?.arr ?? 0) },
    { icon: Building2, label: "Clientes com subscrição ativa", valor: String(metricas?.clientes_ativos ?? 0) },
    { icon: UserPlus, label: "Novos clientes este mês", valor: String(metricas?.novos_mes ?? 0) },
    { icon: Euro, label: "Recebido este mês", valor: formatEuro(metricas?.receita_mes ?? 0) },
    { icon: AlertTriangle, label: "Em dívida", valor: formatEuro(metricas?.em_divida ?? 0) },
    { icon: Clock, label: "Em período de teste", valor: String(metricas?.subscricoes_trial ?? 0) },
    { icon: CircleSlash, label: "Suspensas / canceladas", valor: `${metricas?.subscricoes_suspensas ?? 0} / ${metricas?.subscricoes_canceladas ?? 0}` },
  ];

  return (
    <SaasLayout title="Visão Geral" subtitle="Métricas do negócio e cobranças">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <card.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? "—" : card.valor}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Faturado vs. recebido</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => formatEuro(Number(v))} />
                  <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maiores clientes</CardTitle>
              <CardDescription>Por valor já pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topClientes.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda não há pagamentos registados.</p>
              )}
              {topClientes.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cliente.nome_empresa}</p>
                    <p className="text-xs text-muted-foreground">
                      {cliente.plano_nome ?? "Sem plano"}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatEuro(cliente.total_pago)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {(metricas?.faturas_vencidas ?? 0) > 0 && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm">
                {metricas?.faturas_vencidas} fatura(s) com o prazo de pagamento ultrapassado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SaasLayout>
  );
}
