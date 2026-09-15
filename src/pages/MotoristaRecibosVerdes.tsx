import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  ReceiptText,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useMotoristaExpediente } from "@/hooks/useExpediente";
import { useTenant } from "@/contexts/TenantContext";
import {
  useRecibosVerdesMotorista,
  useCriarReciboVerde,
  obterLinkReciboVerde,
  formatarEuros,
  type ReciboVerde,
} from "@/hooks/useRecibosVerdes";
import { extractTextFromFile } from "@/utils/documentTextExtraction";
import {
  parseGreenReceiptText,
  reciboPrecisaOcr,
  validarRecibo,
  type AvisoValidacao,
  type GreenReceiptExtraction,
} from "@/utils/greenReceiptParser";

function EstadoBadge({ recibo }: { recibo: ReciboVerde }) {
  if (recibo.status === "rejeitado") {
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
  }
  if (recibo.status === "validado") {
    return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Validado</Badge>;
  }
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Em validação</Badge>;
}

export default function MotoristaRecibosVerdes() {
  const { data: motorista, isLoading: loadingMotorista } = useMotoristaExpediente();
  const { tenant } = useTenant();
  const { data: recibos = [], isLoading } = useRecibosVerdesMotorista(motorista?.id);
  const criar = useCriarReciboVerde();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [percent, setPercent] = useState(0);
  const [extracao, setExtracao] = useState<GreenReceiptExtraction | null>(null);
  const [numero, setNumero] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [nifEmitente, setNifEmitente] = useState("");
  const [nifAdquirente, setNifAdquirente] = useState("");
  const [valorBase, setValorBase] = useState("");
  const [valorIva, setValorIva] = useState("");
  const [retencao, setRetencao] = useState("");
  const [valorTotal, setValorTotal] = useState("");

  const numerosExistentes = useMemo(
    () => recibos.map((r) => r.numero_documento).filter(Boolean) as string[],
    [recibos],
  );

  const dadosAtuais = useMemo(
    () => ({
      numeroDocumento: numero.trim() || null,
      dataEmissao: dataEmissao || null,
      nifEmitente: nifEmitente.trim() || null,
      nifAdquirente: nifAdquirente.trim() || null,
      valorBase: valorBase ? Number(valorBase) : null,
      valorIva: valorIva ? Number(valorIva) : null,
      retencaoIrs: retencao ? Number(retencao) : null,
      valorTotal: valorTotal ? Number(valorTotal) : null,
    }),
    [numero, dataEmissao, nifEmitente, nifAdquirente, valorBase, valorIva, retencao, valorTotal],
  );

  const avisos: AvisoValidacao[] = useMemo(
    () =>
      file
        ? validarRecibo(dadosAtuais, {
            nifMotorista: motorista?.nif ?? null,
            nifEmpresa: tenant?.nif ?? null,
            numerosExistentes,
          })
        : [],
    [file, dadosAtuais, motorista?.nif, tenant?.nif, numerosExistentes],
  );

  const temErro = avisos.some((a) => a.gravidade === "erro");

  const limpar = () => {
    setFile(null);
    setExtracao(null);
    setNumero("");
    setDataEmissao("");
    setNifEmitente("");
    setNifAdquirente("");
    setValorBase("");
    setValorIva("");
    setRetencao("");
    setValorTotal("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (selected: File) => {
    if (selected.size > 20 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande. Máximo 20 MB.");
      return;
    }
    setFile(selected);
    setExtracao(null);
    setLendo(true);
    setPercent(0);
    setEtapa("A abrir o documento");
    try {
      const { text, origem } = await extractTextFromFile(
        selected,
        (info) => {
          setEtapa(info.etapa);
          setPercent(Math.round(info.percent));
        },
        reciboPrecisaOcr,
      );
      const parsed = parseGreenReceiptText(text, origem);
      setExtracao(parsed);
      setNumero(parsed.numeroDocumento || "");
      setDataEmissao(parsed.dataEmissao || "");
      setNifEmitente(parsed.nifEmitente || motorista?.nif || "");
      setNifAdquirente(parsed.nifAdquirente || "");
      setValorBase(parsed.valorBase !== null ? String(parsed.valorBase) : "");
      setValorIva(parsed.valorIva !== null ? String(parsed.valorIva) : "");
      setRetencao(parsed.retencaoIrs !== null ? String(parsed.retencaoIrs) : "");
      setValorTotal(parsed.valorTotal !== null ? String(parsed.valorTotal) : "");
      if (parsed.confianca === "baixa") {
        toast.warning("Não consegui ler tudo automaticamente. Confere os campos.");
      } else {
        toast.success("Dados lidos do recibo. Confirma antes de enviar.");
      }
    } catch (error) {
      toast.error("Não foi possível ler o documento: " + (error as Error).message);
    } finally {
      setLendo(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !motorista?.id || !motorista.tenant_id) return;
    if (!dataEmissao) {
      toast.error("Indica a data de emissão do recibo.");
      return;
    }
    if (temErro) {
      toast.error("Corrige os erros indicados antes de enviar.");
      return;
    }
    await criar.mutateAsync({
      motoristaId: motorista.id,
      tenantId: motorista.tenant_id,
      file,
      numeroDocumento: dadosAtuais.numeroDocumento,
      dataEmissao: dadosAtuais.dataEmissao,
      nifEmitente: dadosAtuais.nifEmitente,
      nomeEmitente: extracao?.nomeEmitente || motorista.nome_completo || null,
      nifAdquirente: dadosAtuais.nifAdquirente,
      nomeAdquirente: extracao?.nomeAdquirente || tenant?.nome_empresa || null,
      valorBase: dadosAtuais.valorBase,
      valorIva: dadosAtuais.valorIva,
      retencaoIrs: dadosAtuais.retencaoIrs,
      valorTotal: dadosAtuais.valorTotal,
      avisos,
      dadosExtraidos: {
        confianca: extracao?.confianca ?? null,
        origem: extracao?.origem ?? null,
        lido: {
          numero: extracao?.numeroDocumento ?? null,
          data: extracao?.dataEmissao ?? null,
          total: extracao?.valorTotal ?? null,
        },
        texto: (extracao?.texto ?? "").slice(0, 4000),
      },
    });
    limpar();
  };

  const abrirFicheiro = async (recibo: ReciboVerde) => {
    try {
      const url = await obterLinkReciboVerde(recibo.arquivo_path || recibo.arquivo_url);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o ficheiro: " + (error as Error).message);
    }
  };

  return (
    <AppLayout title="Recibos Verdes" subtitle="Envia os teus recibos verdes em PDF">
      <div className="max-w-3xl space-y-6">
        <div className="card-elevated p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Enviar recibo
          </h3>
          <p className="text-sm text-muted-foreground">
            Envia o PDF da fatura-recibo. Os dados são lidos no teu dispositivo e podes corrigi-los
            antes de confirmar.
          </p>

          <Input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            disabled={lendo || criar.isPending}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />

          {lendo && (
            <div className="space-y-2">
              <p className="text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> {etapa}
              </p>
              <Progress value={percent} />
            </div>
          )}

          {file && !lendo && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{file.name}</span>
                {extracao && (
                  <Badge variant="outline" className="text-xs">
                    Leitura{" "}
                    {extracao.confianca === "alta"
                      ? "fiável"
                      : extracao.confianca === "media"
                      ? "razoável"
                      : "incerta"}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="numero">Número do documento</Label>
                  <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="data">Data de emissão *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nif-emitente">NIF do emitente</Label>
                  <Input
                    id="nif-emitente"
                    value={nifEmitente}
                    onChange={(e) => setNifEmitente(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nif-adquirente">NIF do adquirente</Label>
                  <Input
                    id="nif-adquirente"
                    value={nifAdquirente}
                    onChange={(e) => setNifAdquirente(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="base">Valor base (€)</Label>
                  <Input id="base" type="number" step="0.01" value={valorBase} onChange={(e) => setValorBase(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="iva">IVA (€)</Label>
                  <Input id="iva" type="number" step="0.01" value={valorIva} onChange={(e) => setValorIva(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="retencao">Retenção de IRS (€)</Label>
                  <Input id="retencao" type="number" step="0.01" value={retencao} onChange={(e) => setRetencao(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="total">Total (€)</Label>
                  <Input id="total" type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                </div>
              </div>

              {avisos.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {avisos.map((a, i) => (
                    <li
                      key={i}
                      className={
                        a.gravidade === "erro"
                          ? "text-destructive flex items-start gap-2"
                          : "text-orange-600 flex items-start gap-2"
                      }
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {a.mensagem}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={criar.isPending || temErro}>
                  {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar e enviar
                </Button>
                <Button variant="outline" onClick={limpar} disabled={criar.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <ReceiptText className="w-4 h-4" /> Recibos enviados
          </h3>
          {loadingMotorista || isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : recibos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não enviaste nenhum recibo.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recibos.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-medium">
                      {r.numero_documento || r.arquivo_nome || "Recibo"}
                    </p>
                    <p className="text-muted-foreground">
                      {r.data_emissao ? new Date(r.data_emissao).toLocaleDateString("pt-PT") : "—"} ·{" "}
                      {formatarEuros(r.valor_total)}
                    </p>
                    {r.status === "rejeitado" && r.observacoes_empresa && (
                      <p className="text-destructive">Motivo: {r.observacoes_empresa}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <EstadoBadge recibo={r} />
                    <Button size="sm" variant="ghost" onClick={() => abrirFicheiro(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
