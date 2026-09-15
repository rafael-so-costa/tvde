import { useRef, useState } from "react";
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
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  useMotoristaAtual,
  useRegistosCriminaisMotorista,
  useCriarRegistoCriminal,
  obterLinkRegistoCriminal,
  diasParaVencer,
  type RegistoCriminal,
} from "@/hooks/useRegistoCriminal";
import { extractTextFromFile } from "@/utils/documentTextExtraction";
import { parseCriminalRecordText, type CriminalRecordExtraction } from "@/utils/criminalRecordParser";

function StatusBadge({ registo }: { registo: RegistoCriminal }) {
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
        <AlertTriangle className="w-3 h-3" /> Vence em {dias} dias
      </Badge>
    );
  }
  return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Válido</Badge>;
}

export default function MotoristaRegistoCriminal() {
  const { data: motorista, isLoading: loadingMotorista } = useMotoristaAtual();
  const { data: registos = [], isLoading: loadingRegistos } = useRegistosCriminaisMotorista(motorista?.id);
  const criar = useCriarRegistoCriminal();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [percent, setPercent] = useState(0);
  const [extracao, setExtracao] = useState<CriminalRecordExtraction | null>(null);
  const [codigo, setCodigo] = useState("");
  const [validade, setValidade] = useState("");
  const [emissao, setEmissao] = useState("");

  const atual = registos[0];

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
      const { text, origem } = await extractTextFromFile(selected, (info) => {
        setEtapa(info.etapa);
        setPercent(Math.round(info.percent));
      });
      const parsed = parseCriminalRecordText(text, origem);
      setExtracao(parsed);
      setCodigo(parsed.codigoConsulta || "");
      setValidade(parsed.dataValidade || "");
      setEmissao(parsed.dataEmissao || "");
      if (!parsed.codigoConsulta && !parsed.dataValidade) {
        toast.warning("Não consegui ler os dados automaticamente. Preenche manualmente.");
      } else {
        toast.success("Dados lidos do documento. Confirma antes de enviar.");
      }
    } catch (error) {
      toast.error("Não foi possível ler o documento: " + (error as Error).message);
    } finally {
      setLendo(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !motorista?.id || !motorista.tenant_id) return;
    if (!validade) {
      toast.error("Indica a data de validade do registo.");
      return;
    }
    await criar.mutateAsync({
      motoristaId: motorista.id,
      tenantId: motorista.tenant_id,
      file,
      codigoConsulta: codigo.trim() || null,
      dataValidade: validade,
      dataEmissao: emissao || null,
      nomeTitular: extracao?.nomeTitular || null,
      dadosExtraidos: {
        confianca: extracao?.confianca ?? null,
        origem: extracao?.origem ?? null,
        codigo_lido: extracao?.codigoConsulta ?? null,
        validade_lida: extracao?.dataValidade ?? null,
        emissao_lida: extracao?.dataEmissao ?? null,
        texto: (extracao?.texto ?? "").slice(0, 4000),
      },
    });
    setFile(null);
    setExtracao(null);
    setCodigo("");
    setValidade("");
    setEmissao("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const abrirFicheiro = async (registo: RegistoCriminal) => {
    try {
      const url = await obterLinkRegistoCriminal(registo.arquivo_path || registo.arquivo_url);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error("Não foi possível abrir o ficheiro: " + (error as Error).message);
    }
  };

  return (
    <AppLayout title="Registo Criminal" subtitle="Envia o teu certificado de registo criminal">
      <div className="max-w-3xl space-y-6">
        {/* Estado atual */}
        <div className="card-elevated p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Situação atual
              </h3>
              {loadingMotorista || loadingRegistos ? (
                <p className="text-sm text-muted-foreground mt-2">A carregar…</p>
              ) : atual ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    Código de consulta:{" "}
                    <span className="font-medium">{atual.codigo_consulta || "—"}</span>
                  </p>
                  <p>
                    Validade:{" "}
                    <span className="font-medium">
                      {atual.data_validade
                        ? new Date(atual.data_validade).toLocaleDateString("pt-PT")
                        : "—"}
                    </span>
                  </p>
                  {atual.status === "rejeitado" && atual.observacoes_empresa && (
                    <p className="text-destructive">Motivo: {atual.observacoes_empresa}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Ainda não enviaste nenhum registo criminal.
                </p>
              )}
            </div>
            {atual && <StatusBadge registo={atual} />}
          </div>
        </div>

        {/* Envio */}
        <div className="card-elevated p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Enviar novo documento
          </h3>
          <p className="text-sm text-muted-foreground">
            Aceita PDF ou foto. Os dados são lidos no teu dispositivo — o documento só é guardado
            quando confirmares.
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
                    Leitura {extracao.confianca === "alta" ? "fiável" : extracao.confianca === "media" ? "razoável" : "incerta"}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="codigo">Código de consulta</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.trim())}
                    placeholder="Ex.: A1B2C3D4E5"
                  />
                </div>
                <div>
                  <Label htmlFor="validade">Válido até *</Label>
                  <Input
                    id="validade"
                    type="date"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emissao">Data de emissão</Label>
                  <Input
                    id="emissao"
                    type="date"
                    value={emissao}
                    onChange={(e) => setEmissao(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={criar.isPending}>
                  {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar e enviar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setExtracao(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={criar.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Histórico */}
        {registos.length > 0 && (
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Envios anteriores</h3>
            <ul className="divide-y divide-border">
              {registos.map((registo) => (
                <li key={registo.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-medium">
                      {registo.arquivo_nome || "Documento"}
                    </p>
                    <p className="text-muted-foreground">
                      Enviado a {new Date(registo.created_at).toLocaleDateString("pt-PT")} ·
                      {" "}Validade:{" "}
                      {registo.data_validade
                        ? new Date(registo.data_validade).toLocaleDateString("pt-PT")
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge registo={registo} />
                    <Button size="sm" variant="ghost" onClick={() => abrirFicheiro(registo)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
