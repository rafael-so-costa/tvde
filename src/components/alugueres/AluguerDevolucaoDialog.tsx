import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useChecklistHistory } from "@/hooks/useChecklistHistory";
import { useContratos } from "@/hooks/useContratos";
import { useAlugueres } from "@/hooks/useAlugueres";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad } from "@/components/checklist/SignaturePad";
import {
  ClipboardCheck, FileText, AlertTriangle, Receipt, PenLine,
  ChevronLeft, ChevronRight, Plus, Trash2, Loader2, ExternalLink,
  CheckCircle2, Download, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Aluguer } from "@/types/aluguer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluguer: Aluguer | null;
}

type DevolucaoTipo = "no_prazo" | "atraso";
interface MultaExtra { id: string; nome: string; valor: number }

const STEPS = [
  { id: 1, label: "Check-list de Recolha", icon: ClipboardCheck },
  { id: 2, label: "Contrato Prestação", icon: FileText },
  { id: 3, label: "Opções de Devolução", icon: AlertTriangle },
  { id: 4, label: "Resumo Final", icon: Receipt },
  { id: 5, label: "Assinaturas", icon: PenLine },
];

export function AluguerDevolucaoDialog({ open, onOpenChange, aluguer }: Props) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { records } = useChecklistHistory();
  const { contratos } = useContratos();
  const { finalizarDevolucao } = useAlugueres();

  const [step, setStep] = useState(1);
  const [checklistDevolucaoId, setChecklistDevolucaoId] = useState<string | null>(null);
  const [contratoPrestacaoId, setContratoPrestacaoId] = useState<string | null>(null);
  const [devolucaoTipo, setDevolucaoTipo] = useState<DevolucaoTipo>("no_prazo");
  const [diasAtraso, setDiasAtraso] = useState(0);
  const [valorDia, setValorDia] = useState(0);
  const [multasExtras, setMultasExtras] = useState<MultaExtra[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [declaracaoAceite, setDeclaracaoAceite] = useState(false);
  const [assinaturaMotorista, setAssinaturaMotorista] = useState<string | null>(null);
  const [assinaturaEmpresa, setAssinaturaEmpresa] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && aluguer) {
      setStep(1);
      setChecklistDevolucaoId(null);
      setContratoPrestacaoId(aluguer.contrato_prestacao_id ?? null);
      setDevolucaoTipo("no_prazo");
      setDiasAtraso(0);
      setValorDia(0);
      setMultasExtras([]);
      setObservacoes("");
      setDeclaracaoAceite(false);
      setAssinaturaMotorista(null);
      setAssinaturaEmpresa(null);
      setPdfUrl(null);
      setDone(false);
    }
  }, [open, aluguer]);

  // Filtra recolhas deste veículo/motorista
  const recolhasDisponiveis = useMemo(() => {
    if (!aluguer) return [];
    return (records || []).filter((r) =>
      r.type === "recolha" &&
      (r.vehicleId === aluguer.veiculo_id || r.driverId === aluguer.motorista_id)
    );
  }, [records, aluguer]);

  const recolhaSelecionada = useMemo(
    () => recolhasDisponiveis.find((r) => r.id === checklistDevolucaoId),
    [recolhasDisponiveis, checklistDevolucaoId]
  );

  // Contratos de prestação deste motorista/proprietário
  const prestacoesDisponiveis = useMemo(() => {
    if (!aluguer) return [];
    return (contratos || []).filter((c: any) =>
      c.tipo === "prestacao_servicos" &&
      (c.motorista_id === aluguer.motorista_id || c.proprietario_id === aluguer.proprietario_id)
    );
  }, [contratos, aluguer]);

  const contratoPrestacaoSel = useMemo(
    () => (contratos || []).find((c: any) => c.id === contratoPrestacaoId),
    [contratos, contratoPrestacaoId]
  );

  const penalizacoesChecklist = Number(recolhaSelecionada?.totalPenalty || 0);
  const multaAtraso = devolucaoTipo === "atraso" ? diasAtraso * valorDia : 0;
  const totalMultasExtras = multasExtras.reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const totalPagar = multaAtraso + totalMultasExtras + penalizacoesChecklist;

  const ownerName = aluguer?.proprietario?.tipo === "empresa"
    ? aluguer?.proprietario?.nome_empresa
    : aluguer?.proprietario?.nome_completo;

  const canNext = () => {
    if (step === 1) return !!checklistDevolucaoId;
    if (step === 2) return !!contratoPrestacaoId;
    if (step === 3) return devolucaoTipo === "no_prazo" || (diasAtraso > 0 && valorDia > 0);
    if (step === 4) return declaracaoAceite;
    if (step === 5) return !!assinaturaMotorista && !!assinaturaEmpresa;
    return false;
  };

  const addMulta = () =>
    setMultasExtras((m) => [...m, { id: crypto.randomUUID(), nome: "", valor: 0 }]);
  const updateMulta = (id: string, patch: Partial<MultaExtra>) =>
    setMultasExtras((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeMulta = (id: string) =>
    setMultasExtras((m) => m.filter((x) => x.id !== id));

  const uploadDataUrl = async (dataUrl: string, path: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from("signatures").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("signatures").getPublicUrl(path);
    return data.publicUrl;
  };

  const generatePdf = async (
    sigMotoristaUrl: string,
    sigEmpresaUrl: string
  ): Promise<{ blob: Blob; dataUrl: string }> => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    let y = 15;
    const left = 15;
    const lineH = 6;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TERMO DE DEVOLUÇÃO DE VEÍCULO", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}`, left, y);
    y += lineH;
    doc.text(`Aluguer ID: ${aluguer?.id}`, left, y);
    y += lineH + 2;

    const section = (title: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, left, y);
      y += lineH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    };

    section("1. PARTES");
    doc.text(`Motorista: ${aluguer?.motorista?.nome_completo || "—"}`, left, y); y += lineH;
    doc.text(`Proprietário: ${ownerName || "—"}`, left, y); y += lineH;
    doc.text(`Veículo: ${aluguer?.veiculo?.matricula || "—"} ${aluguer?.veiculo?.marca || ""} ${aluguer?.veiculo?.modelo || ""}`, left, y);
    y += lineH + 2;

    section("2. CONTRATOS ENCERRADOS");
    if (aluguer?.contrato_aluguer_id) { doc.text(`• Contrato de Aluguer: ${aluguer.contrato_aluguer_id.slice(0, 8)}`, left, y); y += lineH; }
    if (contratoPrestacaoId) { doc.text(`• Contrato de Prestação: ${contratoPrestacaoId.slice(0, 8)}`, left, y); y += lineH; }
    y += 2;

    section("3. DEVOLUÇÃO");
    if (devolucaoTipo === "no_prazo") {
      doc.text("Tipo: Entrega cumprindo aviso prévio (sem multa por atraso)", left, y); y += lineH;
    } else {
      doc.text(`Tipo: Entrega com atraso de ${diasAtraso} dia(s)`, left, y); y += lineH;
      doc.text(`Valor por dia: € ${valorDia.toFixed(2)} → Multa atraso: € ${multaAtraso.toFixed(2)}`, left, y); y += lineH;
    }
    y += 2;

    section("4. PENALIZAÇÕES DO CHECK-LIST");
    doc.text(`Total: € ${penalizacoesChecklist.toFixed(2)}`, left, y); y += lineH + 2;

    if (multasExtras.length) {
      section("5. MULTAS ADICIONAIS");
      multasExtras.forEach((m) => {
        doc.text(`• ${m.nome}: € ${Number(m.valor).toFixed(2)}`, left, y); y += lineH;
      });
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL A PAGAR: € ${totalPagar.toFixed(2)}`, left, y);
    y += lineH + 4;

    if (observacoes) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("Observações:", left, y); y += lineH;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(observacoes, 180);
      doc.text(lines, left, y); y += lines.length * lineH + 2;
    }

    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    const decl = doc.splitTextToSize(
      "Declaro que concordo com os valores acima descriminados e confirmo a devolução do veículo nas condições registadas no check-list de recolha.",
      180
    );
    doc.text(decl, left, y); y += decl.length * lineH + 6;

    // Assinaturas
    try {
      doc.addImage(sigMotoristaUrl, "PNG", left, y, 70, 25);
      doc.addImage(sigEmpresaUrl, "PNG", 115, y, 70, 25);
    } catch { /* ignore */ }
    y += 28;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Motorista", left + 25, y);
    doc.text("Empresa / Proprietário", 115 + 15, y);

    const blob = doc.output("blob");
    const dataUrl = doc.output("datauristring");
    return { blob, dataUrl };
  };

  const handleFinalizar = async () => {
    if (!aluguer || !tenant) return;
    setSubmitting(true);
    try {
      const ts = Date.now();
      const sigMotoristaUrl = assinaturaMotorista
        ? await uploadDataUrl(assinaturaMotorista, `${tenant.id}/devolucao/${aluguer.id}/motorista-${ts}.png`)
        : null;
      const sigEmpresaUrl = assinaturaEmpresa
        ? await uploadDataUrl(assinaturaEmpresa, `${tenant.id}/devolucao/${aluguer.id}/empresa-${ts}.png`)
        : null;

      let pdfPublicUrl: string | null = null;
      if (sigMotoristaUrl && sigEmpresaUrl) {
        const { blob } = await generatePdf(sigMotoristaUrl, sigEmpresaUrl);
        const path = `${tenant.id}/devolucao/${aluguer.id}/termo-${ts}.pdf`;
        const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, {
          contentType: "application/pdf",
          upsert: true,
        });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
        pdfPublicUrl = signed?.signedUrl ?? null;
      }

      await finalizarDevolucao.mutateAsync({
        aluguer_id: aluguer.id,
        checklist_devolucao_id: checklistDevolucaoId,
        contrato_prestacao_id: contratoPrestacaoId,
        devolucao_tipo: devolucaoTipo,
        dias_atraso: diasAtraso,
        valor_dia: valorDia,
        multa_atraso: multaAtraso,
        multas_adicionais: multasExtras.map(({ nome, valor }) => ({ nome, valor: Number(valor) || 0 })),
        penalizacoes_checklist: penalizacoesChecklist,
        total_pagar: totalPagar,
        assinatura_motorista_url: sigMotoristaUrl,
        assinatura_empresa_url: sigEmpresaUrl,
        pdf_url: pdfPublicUrl,
        observacoes: observacoes || null,
      });

      setPdfUrl(pdfPublicUrl);
      setDone(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao finalizar devolução");
    } finally {
      setSubmitting(false);
    }
  };

  if (!aluguer) return null;

  const StepIcon = STEPS[step - 1].icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" />
            Devolução de Veículo · {aluguer.veiculo?.matricula}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 py-3 border-b">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                    step === s.id ? "bg-primary text-primary-foreground" :
                    step > s.id ? "bg-success text-success-foreground" :
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.id ? "✓" : s.id}
                </div>
                <span className={cn("text-xs whitespace-nowrap", step === s.id ? "font-semibold" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          {done ? (
            <div className="text-center py-10 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
              <h3 className="text-2xl font-bold">Devolução concluída!</h3>
              <p className="text-muted-foreground">
                O veículo foi marcado como disponível, o motorista foi removido e os contratos foram encerrados.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                {pdfUrl && (
                  <>
                    <Button variant="outline" asChild>
                      <a href={pdfUrl} target="_blank" rel="noreferrer" className="gap-2">
                        <Download className="w-4 h-4" /> Descarregar PDF
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => window.open(pdfUrl!, "_blank")?.print()}>
                      <Printer className="w-4 h-4 mr-2" /> Imprimir
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Passo 1 - Check-list */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selecione o check-list de recolha já realizado, ou crie um novo no módulo de Check-list.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/checklist")} className="gap-2">
                    <ExternalLink className="w-4 h-4" /> Abrir módulo de Check-list
                  </Button>
                  {recolhasDisponiveis.length === 0 ? (
                    <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum check-list de recolha disponível para este veículo/motorista.
                    </CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {recolhasDisponiveis.map((r: any) => (
                        <Card
                          key={r.id}
                          className={cn("cursor-pointer transition", checklistDevolucaoId === r.id && "ring-2 ring-primary")}
                          onClick={() => setChecklistDevolucaoId(r.id)}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">#{r.id.slice(0, 8)} · {r.plate}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.date ? format(new Date(r.date), "dd/MM/yyyy", { locale: pt }) : "—"}
                                {" · "}{r.driverName || "Sem motorista"}
                              </p>
                            </div>
                            {Number(r.totalPenalty) > 0 && (
                              <Badge variant="destructive">€ {Number(r.totalPenalty).toFixed(2)}</Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Passo 2 - Prestação */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selecione o contrato de Prestação de Serviço associado a este aluguer (obrigatório).
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/contracts")} className="gap-2">
                    <ExternalLink className="w-4 h-4" /> Criar novo contrato de prestação
                  </Button>
                  {prestacoesDisponiveis.length === 0 ? (
                    <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum contrato de prestação encontrado para este motorista/proprietário.
                    </CardContent></Card>
                  ) : (
                    <Select value={contratoPrestacaoId ?? ""} onValueChange={setContratoPrestacaoId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
                      <SelectContent>
                        {prestacoesDisponiveis.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            #{c.id.slice(0, 8)} · {c.status} · {c.data_inicio ? format(new Date(c.data_inicio), "dd/MM/yyyy") : "—"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Passo 3 - Opções */}
              {step === 3 && (
                <div className="space-y-4">
                  <RadioGroup value={devolucaoTipo} onValueChange={(v) => setDevolucaoTipo(v as DevolucaoTipo)}>
                    <Card className={cn("cursor-pointer", devolucaoTipo === "no_prazo" && "ring-2 ring-primary")}
                      onClick={() => setDevolucaoTipo("no_prazo")}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <RadioGroupItem value="no_prazo" id="r1" className="mt-1" />
                        <Label htmlFor="r1" className="cursor-pointer flex-1">
                          <p className="font-medium">Entreguei o veículo cumprindo o aviso prévio</p>
                          <p className="text-xs text-muted-foreground">Sem multa por atraso</p>
                        </Label>
                      </CardContent>
                    </Card>
                    <Card className={cn("cursor-pointer", devolucaoTipo === "atraso" && "ring-2 ring-primary")}
                      onClick={() => setDevolucaoTipo("atraso")}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="atraso" id="r2" className="mt-1" />
                          <Label htmlFor="r2" className="cursor-pointer flex-1">
                            <p className="font-medium">Entreguei o veículo com atraso</p>
                            <p className="text-xs text-muted-foreground">Calcular multa: dias × valor por dia</p>
                          </Label>
                        </div>
                        {devolucaoTipo === "atraso" && (
                          <div className="grid grid-cols-2 gap-3 pl-7">
                            <div>
                              <Label className="text-xs">Dias de atraso</Label>
                              <Input type="number" min={0} value={diasAtraso} onChange={(e) => setDiasAtraso(Number(e.target.value))} />
                            </div>
                            <div>
                              <Label className="text-xs">Valor por dia (€)</Label>
                              <Input type="number" min={0} step="0.01" value={valorDia} onChange={(e) => setValorDia(Number(e.target.value))} />
                            </div>
                            <div className="col-span-2 text-sm">
                              Multa total: <span className="font-semibold">€ {multaAtraso.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </RadioGroup>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Multas adicionais</h4>
                    <Button size="sm" variant="outline" onClick={addMulta} className="gap-1">
                      <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                  </div>
                  {multasExtras.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma multa adicional.</p>
                  ) : (
                    <div className="space-y-2">
                      {multasExtras.map((m) => (
                        <div key={m.id} className="flex gap-2">
                          <Input placeholder="Nome da multa" value={m.nome} onChange={(e) => updateMulta(m.id, { nome: e.target.value })} />
                          <Input type="number" min={0} step="0.01" placeholder="Valor" className="w-32"
                            value={m.valor} onChange={(e) => updateMulta(m.id, { valor: Number(e.target.value) })} />
                          <Button size="icon" variant="ghost" onClick={() => removeMulta(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Observações</Label>
                    <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Passo 4 - Resumo */}
              {step === 4 && (
                <div className="space-y-3 text-sm">
                  <Card><CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold mb-1">Dados</h4>
                    <p><span className="text-muted-foreground">Motorista:</span> {aluguer.motorista?.nome_completo || "—"}</p>
                    <p><span className="text-muted-foreground">Veículo:</span> {aluguer.veiculo?.matricula} {aluguer.veiculo?.marca} {aluguer.veiculo?.modelo}</p>
                    <p><span className="text-muted-foreground">Proprietário:</span> {ownerName || "—"}</p>
                  </CardContent></Card>

                  <Card><CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold mb-1">Contratos a encerrar</h4>
                    {aluguer.contrato_aluguer_id && <p>• Contrato de Aluguer #{aluguer.contrato_aluguer_id.slice(0, 8)}</p>}
                    {contratoPrestacaoSel && <p>• Contrato de Prestação #{(contratoPrestacaoSel as any).id.slice(0, 8)}</p>}
                  </CardContent></Card>

                  <Card><CardContent className="p-4 space-y-1">
                    <h4 className="font-semibold mb-1">Check-list de Recolha</h4>
                    <p>#{recolhaSelecionada?.id.slice(0, 8)}</p>
                    {penalizacoesChecklist > 0 && (
                      <p>Penalizações: <span className="font-semibold text-destructive">€ {penalizacoesChecklist.toFixed(2)}</span></p>
                    )}
                  </CardContent></Card>

                  <Card><CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold mb-1">Custos</h4>
                    <div className="flex justify-between"><span>Multa por atraso ({diasAtraso}d)</span><span>€ {multaAtraso.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Penalizações check-list</span><span>€ {penalizacoesChecklist.toFixed(2)}</span></div>
                    {multasExtras.map((m) => (
                      <div key={m.id} className="flex justify-between"><span>{m.nome || "Multa"}</span><span>€ {Number(m.valor).toFixed(2)}</span></div>
                    ))}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total a pagar</span><span>€ {totalPagar.toFixed(2)}</span>
                    </div>
                  </CardContent></Card>

                  <Card className="bg-muted/30"><CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Checkbox id="decl" checked={declaracaoAceite} onCheckedChange={(c) => setDeclaracaoAceite(!!c)} />
                      <Label htmlFor="decl" className="cursor-pointer text-sm leading-relaxed">
                        Declaro que concordo com os valores acima.
                      </Label>
                    </div>
                  </CardContent></Card>
                </div>
              )}

              {/* Passo 5 - Assinaturas */}
              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Recolha as assinaturas para finalizar.</p>
                  <SignaturePad label="Motorista" onSignatureChange={setAssinaturaMotorista} />
                  <SignaturePad label="Empresa / Proprietário" onSignatureChange={setAssinaturaEmpresa} />
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {!done && (
          <DialogFooter className="px-6 py-4 border-t flex !justify-between">
            <Button variant="outline" disabled={step === 1 || submitting} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            {step < STEPS.length ? (
              <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button disabled={!canNext() || submitting} onClick={handleFinalizar} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Finalizar Devolução
              </Button>
            )}
          </DialogFooter>
        )}
        {done && (
          <DialogFooter className="px-6 py-4 border-t">
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
