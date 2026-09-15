import { useEffect, useState } from "react";
import { SaasLayout } from "@/components/saas/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useGuardarConfigFaturacao, useSaasConfigFaturacao } from "@/hooks/useSaas";

export default function SaasConfiguracoes() {
  const { data: config, isLoading } = useSaasConfigFaturacao();
  const guardar = useGuardarConfigFaturacao();

  const [form, setForm] = useState({
    id: undefined as string | undefined,
    emitente_nome: "",
    emitente_nif: "",
    emitente_endereco: "",
    emitente_email: "",
    emitente_telefone: "",
    iban: "",
    prefixo_numero: "FAT",
    proximo_numero: "1",
    taxa_iva: "23",
    prazo_pagamento_dias: "8",
    rodape: "",
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      id: config.id,
      emitente_nome: config.emitente_nome ?? "",
      emitente_nif: config.emitente_nif ?? "",
      emitente_endereco: config.emitente_endereco ?? "",
      emitente_email: config.emitente_email ?? "",
      emitente_telefone: config.emitente_telefone ?? "",
      iban: config.iban ?? "",
      prefixo_numero: config.prefixo_numero ?? "FAT",
      proximo_numero: String(config.proximo_numero ?? 1),
      taxa_iva: String(config.taxa_iva ?? 23),
      prazo_pagamento_dias: String(config.prazo_pagamento_dias ?? 8),
      rodape: config.rodape ?? "",
    });
  }, [config]);

  const submeter = () =>
    guardar.mutate({
      id: form.id,
      emitente_nome: form.emitente_nome,
      emitente_nif: form.emitente_nif,
      emitente_endereco: form.emitente_endereco,
      emitente_email: form.emitente_email,
      emitente_telefone: form.emitente_telefone,
      iban: form.iban,
      prefixo_numero: form.prefixo_numero,
      proximo_numero: Number(form.proximo_numero) || 1,
      taxa_iva: Number(form.taxa_iva) || 0,
      prazo_pagamento_dias: Number(form.prazo_pagamento_dias) || 0,
      rodape: form.rodape,
    });

  return (
    <SaasLayout title="Configurações" subtitle="Dados de faturação e meios de pagamento">
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Dados do emitente</CardTitle>
            <CardDescription>Aparecem nas faturas em PDF enviadas aos clientes.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome / designação social</Label>
              <Input
                value={form.emitente_nome}
                onChange={(e) => setForm((f) => ({ ...f, emitente_nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>NIF</Label>
              <Input
                value={form.emitente_nif}
                onChange={(e) => setForm((f) => ({ ...f, emitente_nif: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.emitente_telefone}
                onChange={(e) => setForm((f) => ({ ...f, emitente_telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={form.emitente_endereco}
                onChange={(e) => setForm((f) => ({ ...f, emitente_endereco: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.emitente_email}
                onChange={(e) => setForm((f) => ({ ...f, emitente_email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Numeração e impostos</CardTitle>
            <CardDescription>
              O número seguinte é atribuído automaticamente a cada fatura emitida.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prefixo</Label>
              <Input
                value={form.prefixo_numero}
                onChange={(e) => setForm((f) => ({ ...f, prefixo_numero: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Número seguinte</Label>
              <Input
                type="number"
                value={form.proximo_numero}
                onChange={(e) => setForm((f) => ({ ...f, proximo_numero: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>IVA por omissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxa_iva}
                onChange={(e) => setForm((f) => ({ ...f, taxa_iva: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo de pagamento (dias)</Label>
              <Input
                type="number"
                value={form.prazo_pagamento_dias}
                onChange={(e) => setForm((f) => ({ ...f, prazo_pagamento_dias: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Rodapé da fatura</Label>
              <Textarea
                rows={2}
                value={form.rodape}
                onChange={(e) => setForm((f) => ({ ...f, rodape: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Meios de pagamento automáticos
            </CardTitle>
            <CardDescription>
              Por agora os recebimentos são registados manualmente. Quando quiser cobrar por cartão
              automaticamente, diga-me e ligo um meio de pagamento: cada fatura passa a ter um link de
              pagamento e os recebimentos entram nesta área sem trabalho manual. Cada fatura já guarda
              a referência e o link da fatura do provedor.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex justify-end">
          <Button onClick={submeter} disabled={guardar.isPending || isLoading}>
            Guardar configurações
          </Button>
        </div>
      </div>
    </SaasLayout>
  );
}
