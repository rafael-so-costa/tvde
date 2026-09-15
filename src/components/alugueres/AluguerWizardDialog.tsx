import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useMotoristas } from "@/hooks/useMotoristas";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useProprietarios } from "@/hooks/useProprietarios";
import { useContratos } from "@/hooks/useContratos";
import { useChecklistHistory } from "@/hooks/useChecklistHistory";
import { useAlugueres } from "@/hooks/useAlugueres";
import { usePerfisTemplate } from "@/hooks/usePerfisTemplate";
import { useTemplatesContrato } from "@/hooks/useTemplatesContrato";
import { ContractWizardDialog } from "@/components/contracts/ContractWizardDialogNew";
import type { Aluguer, AluguerRascunhoDados } from "@/types/aluguer";
import { Car, FileText, ClipboardCheck, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAluguer?: Aluguer | null;
}

const STEPS = [
  { id: 1, label: "Aluguer", icon: <FileText className="w-4 h-4" /> },
  { id: 2, label: "Prestação", icon: <FileText className="w-4 h-4" /> },
  { id: 3, label: "Check-list", icon: <ClipboardCheck className="w-4 h-4" /> },
  { id: 4, label: "Resumo", icon: <CheckCircle2 className="w-4 h-4" /> },
];

export function AluguerWizardDialog({ open, onOpenChange, initialAluguer }: Props) {
  const navigate = useNavigate();
  const { data: motoristas = [] } = useMotoristas();
  const { data: veiculos = [] } = useVeiculos();
  const { data: proprietarios = [] } = useProprietarios();
  const { contratos } = useContratos();
  const { records } = useChecklistHistory();
  const { createRascunho, updateAluguer, ativarAluguer } = useAlugueres();
  const { perfis } = usePerfisTemplate();

  const perfilAluguer = perfis.find((p) =>
    p.nome.toLowerCase().includes("aluguer") && p.nome.toLowerCase().includes("ve")
  );
  const { templates: templatesAluguer = [], isLoading: templatesAlugLoading } =
    useTemplatesContrato(perfilAluguer?.id || null);

  const perfilPrestacao = perfis.find((p) => p.nome.toLowerCase().includes("presta"));
  const { templates: templatesPrestacao = [], isLoading: templatesPrestLoading } =
    useTemplatesContrato(perfilPrestacao?.id || null);

  const [aluguerId, setAluguerId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [contractWizardOpen, setContractWizardOpen] = useState(false);
  const [contractWizardTemplates, setContractWizardTemplates] = useState<any[]>([]);
  const [contractWizardTipo, setContractWizardTipo] = useState<"aluguer" | "prestacao_servico">("aluguer");
  const [autoFlowStarted, setAutoFlowStarted] = useState(false);

  const [data, setData] = useState<AluguerRascunhoDados>({});

  // Reset on open
  useEffect(() => {
    if (open && initialAluguer) {
      setAluguerId(initialAluguer.id);
      setStep(initialAluguer.rascunho_passo || 1);
      setData(initialAluguer.rascunho_dados || {});
      setDirty(false);
      setAutoFlowStarted(true); // continuar rascunho — não auto-arrancar
    } else if (open && !initialAluguer) {
      setAluguerId(null);
      setStep(1);
      setData({});
      setDirty(false);
      setAutoFlowStarted(false);
    }
  }, [open, initialAluguer]);

  // Auto-iniciar fluxo do contrato de aluguer assim que houver template disponível
  useEffect(() => {
    if (!open || initialAluguer || autoFlowStarted) return;
    if (templatesAlugLoading) return;
    if (templatesAluguer.length === 0) return;
    setAutoFlowStarted(true);
    setContractWizardTipo("aluguer");
    setContractWizardTemplates(templatesAluguer);
    setContractWizardOpen(true);
  }, [open, initialAluguer, autoFlowStarted, templatesAlugLoading, templatesAluguer]);

  const set = (patch: Partial<AluguerRascunhoDados>) => {
    setData((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const checklistsEntrega = records.filter((r) => r.type === "entrega");

  const handleAttemptClose = () => {
    if (dirty || aluguerId) {
      setConfirmCloseOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const persistRascunho = async (override?: Partial<AluguerRascunhoDados>): Promise<string | null> => {
    const payload: AluguerRascunhoDados = { ...data, ...(override || {}) };
    try {
      if (aluguerId) {
        await updateAluguer.mutateAsync({
          id: aluguerId,
          patch: {
            rascunho_passo: step,
            rascunho_dados: payload,
            motorista_id: payload.motorista_id ?? null,
            veiculo_id: payload.veiculo_id ?? null,
            proprietario_id: payload.proprietario_id ?? null,
            contrato_aluguer_id: payload.contrato_aluguer_id ?? null,
            contrato_prestacao_id: payload.contrato_prestacao_id ?? null,
            checklist_entrega_id: payload.checklist_entrega_id ?? null,
            data_inicio: payload.data_inicio ?? null,
            data_fim: payload.data_fim ?? null,
            observacoes: payload.observacoes ?? null,
          },
        });
        return aluguerId;
      } else {
        const created = await createRascunho.mutateAsync(payload);
        setAluguerId(created.id);
        return created.id;
      }
    } catch (e: any) {
      toast.error("Erro ao guardar rascunho: " + (e.message || ""));
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const id = await persistRascunho();
    if (id) {
      toast.success("Rascunho guardado");
      onOpenChange(false);
      setConfirmCloseOpen(false);
    }
  };

  const handleDiscard = () => {
    onOpenChange(false);
    setConfirmCloseOpen(false);
  };

  // Quando o utilizador fecha o ContractWizard sem completar
  const handleContractWizardClose = (o: boolean) => {
    setContractWizardOpen(o);
    if (!o) {
      // Se ainda estamos no passo 1 e o utilizador cancelou sem criar contrato, fechar tudo
      if (step === 1 && !data.contrato_aluguer_id && !aluguerId) {
        onOpenChange(false);
      }
    }
  };

  const startPrestacaoFlow = () => {
    if (templatesPrestLoading) {
      toast.info("A carregar templates de prestação…");
      return;
    }
    if (templatesPrestacao.length === 0) {
      toast.error('Nenhum template encontrado no perfil "Prestação de Serviço".');
      return;
    }
    setContractWizardTipo("prestacao_servico");
    setContractWizardTemplates(templatesPrestacao);
    setContractWizardOpen(true);
  };

  const goToChecklistFlow = () => {
    setStep(3);
  };

  const canActivate =
    !!data.motorista_id && !!data.veiculo_id && !!data.contrato_aluguer_id && !!data.contrato_prestacao_id;

  const handleActivate = async () => {
    if (!canActivate) {
      toast.error("Motorista, veículo, contrato de aluguer e contrato de prestação são obrigatórios");
      return;
    }
    let id = aluguerId;
    if (!id) {
      const created = await createRascunho.mutateAsync(data);
      id = created.id;
    }
    if (!id) return;
    try {
      await ativarAluguer.mutateAsync({
        id,
        patch: {
          motorista_id: data.motorista_id ?? null,
          veiculo_id: data.veiculo_id ?? null,
          proprietario_id: data.proprietario_id ?? null,
          contrato_aluguer_id: data.contrato_aluguer_id ?? null,
          contrato_prestacao_id: data.contrato_prestacao_id ?? null,
          checklist_entrega_id: data.checklist_entrega_id ?? null,
          data_inicio: data.data_inicio ?? null,
          data_fim: data.data_fim ?? null,
          observacoes: data.observacoes ?? null,
        } as any,
      });
      onOpenChange(false);
    } catch {
      // toast tratado no hook
    }
  };

  // Lookups para resumo
  const motoristaNome = motoristas.find((m) => m.id === data.motorista_id)?.nome_completo;
  const veiculo = veiculos.find((v) => v.id === data.veiculo_id);
  const proprietario = proprietarios.find((p) => p.id === data.proprietario_id);
  const contratoAluguer = contratos.find((c) => c.id === data.contrato_aluguer_id);
  const contratoPrestacao = contratos.find((c) => c.id === data.contrato_prestacao_id);
  const checklistEntrega = records.find((r) => r.id === data.checklist_entrega_id);

  // Derivar entidades do contrato de aluguer recém-criado
  useMemo(() => {
    if (contratoAluguer) {
      const patch: Partial<AluguerRascunhoDados> = {};
      if (!data.motorista_id && contratoAluguer.motorista_id) patch.motorista_id = contratoAluguer.motorista_id;
      if (!data.veiculo_id && contratoAluguer.veiculo_id) patch.veiculo_id = contratoAluguer.veiculo_id;
      if (!data.proprietario_id && contratoAluguer.proprietario_id) patch.proprietario_id = contratoAluguer.proprietario_id;
      if (!data.data_inicio && contratoAluguer.data_inicio) patch.data_inicio = contratoAluguer.data_inicio;
      if (!data.data_fim && contratoAluguer.data_fim) patch.data_fim = contratoAluguer.data_fim;
      if (Object.keys(patch).length) setData((d) => ({ ...d, ...patch }));
    }
  }, [contratoAluguer]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleAttemptClose(); else onOpenChange(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {initialAluguer ? "Continuar Aluguer" : "Novo Aluguer de Carro"}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center justify-between gap-2 my-4">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  "flex flex-col items-center gap-1 flex-1",
                  step === s.id ? "text-primary" : step > s.id ? "text-success" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold",
                    step === s.id ? "border-primary bg-primary/10" :
                    step > s.id ? "border-success bg-success/10" : "border-muted"
                  )}>
                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("h-px flex-1 mx-1", step > s.id ? "bg-success" : "bg-border")} />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4 min-h-[280px]">
            {/* Passo 1 — placeholder enquanto o ContractWizard está aberto */}
            {step === 1 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center space-y-3">
                  {!data.contrato_aluguer_id ? (
                    <>
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        A iniciar fluxo de criação do <strong>Contrato de Aluguer de Veículos</strong>…
                      </p>
                      {!templatesAlugLoading && templatesAluguer.length === 0 && (
                        <div className="text-sm text-destructive">
                          Nenhum template encontrado no perfil "Aluguer de Veículos".{" "}
                          <button className="underline" onClick={() => navigate("/templates")}>
                            Criar template
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 mx-auto text-success" />
                      <p className="text-sm font-medium">Contrato de aluguer criado.</p>
                      <p className="text-xs text-muted-foreground">A avançar para o contrato de prestação…</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Passo 2 — Prestação (auto-arrancada via wizard embebido) */}
            {step === 2 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center space-y-3">
                  {!data.contrato_prestacao_id ? (
                    <>
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        A iniciar fluxo de <strong>Contrato de Prestação de Serviço</strong>…
                      </p>
                      {!templatesPrestLoading && templatesPrestacao.length === 0 && (
                        <div className="text-sm text-destructive">
                          Nenhum template encontrado no perfil "Prestação de Serviço".{" "}
                          <button className="underline" onClick={() => navigate("/templates")}>
                            Criar template
                          </button>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={startPrestacaoFlow}>
                        Reabrir fluxo
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 mx-auto text-success" />
                      <p className="text-sm font-medium">Contrato de prestação criado.</p>
                      <Button size="sm" onClick={goToChecklistFlow}>
                        Avançar para Check-list <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Passo 3 — Check-list */}
            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />Check-list de Entrega
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Crie o check-list no módulo dedicado (abre numa nova aba) e selecione-o aqui.
                  </p>
                </div>
                <Select
                  value={data.checklist_entrega_id || ""}
                  onValueChange={(v) => set({ checklist_entrega_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar check-list de entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    {checklistsEntrega.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum check-list disponível</div>
                    )}
                    {checklistsEntrega.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.plate} — {r.driverName} ({r.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/checklist", "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir Check-list em nova aba
                </Button>

                <div className="pt-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={data.observacoes || ""}
                    onChange={(e) => set({ observacoes: e.target.value })}
                    placeholder="Notas adicionais sobre o aluguer"
                  />
                </div>
              </div>
            )}

            {/* Passo 4 — Resumo */}
            {step === 4 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />Resumo Final
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <SummaryRow label="Motorista" value={motoristaNome || "—"} ok={!!data.motorista_id} />
                  <SummaryRow
                    label="Veículo"
                    value={veiculo ? `${veiculo.matricula} — ${veiculo.marca} ${veiculo.modelo}` : "—"}
                    ok={!!data.veiculo_id}
                  />
                  <SummaryRow
                    label="Proprietário"
                    value={
                      proprietario
                        ? proprietario.tipo === "empresa"
                          ? proprietario.nome_empresa!
                          : proprietario.nome_completo!
                        : "—"
                    }
                    ok={!!data.proprietario_id}
                    optional
                  />
                  <SummaryRow
                    label="Contrato Aluguer"
                    value={contratoAluguer?.template?.nome || (data.contrato_aluguer_id ? "Definido" : "—")}
                    ok={!!data.contrato_aluguer_id}
                  />
                  <SummaryRow
                    label="Contrato Prestação"
                    value={contratoPrestacao?.template?.nome || (data.contrato_prestacao_id ? "Definido" : "—")}
                    ok={!!data.contrato_prestacao_id}
                  />
                  <SummaryRow
                    label="Check-list de Entrega"
                    value={checklistEntrega ? `${checklistEntrega.plate} — ${checklistEntrega.date}` : "—"}
                    ok={!!data.checklist_entrega_id}
                    optional
                  />
                  <SummaryRow
                    label="Período"
                    value={`${data.data_inicio || "—"} → ${data.data_fim || "—"}`}
                    ok={!!data.data_inicio}
                    optional
                  />
                </div>
                {!canActivate && (
                  <div className="text-sm text-destructive">
                    Motorista, Veículo, Contrato de Aluguer e Contrato de Prestação são obrigatórios para ativar.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex !justify-between gap-2 pt-4">
            <Button variant="ghost" onClick={handleAttemptClose}>Cancelar</Button>
            <div className="flex gap-2">
              {step > 1 && step < 4 && (
                <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
              )}
              {step === 3 && (
                <Button
                  onClick={async () => {
                    await persistRascunho();
                    setStep(4);
                  }}
                >
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 4 && (
                <Button
                  onClick={handleActivate}
                  disabled={!canActivate || ativarAluguer.isPending}
                  className="gap-2"
                >
                  {ativarAluguer.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4" /> Ativar Aluguer
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do aluguer</AlertDialogTitle>
            <AlertDialogDescription>Deseja guardar como rascunho ou apagar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Continuar a editar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscard}>Apagar alterações</Button>
            <AlertDialogAction onClick={handleSaveDraft}>Guardar rascunho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wizard de criação de contrato embebido (aluguer / prestação) */}
      <ContractWizardDialog
        open={contractWizardOpen}
        onOpenChange={handleContractWizardClose}
        templates={contractWizardTemplates}
        templatesLoading={false}
        skipNavigateOnSuccess
        forcedTipo={contractWizardTipo}
        onSuccess={async (novoContrato) => {
          if (!novoContrato?.id) return;

          if (contractWizardTipo === "aluguer") {
            // Vincular contrato + entidades vindas do contrato
            const patch: Partial<AluguerRascunhoDados> = {
              contrato_aluguer_id: novoContrato.id,
              motorista_id: novoContrato.motorista_id ?? data.motorista_id ?? null,
              veiculo_id: novoContrato.veiculo_id ?? data.veiculo_id ?? null,
              proprietario_id: novoContrato.proprietario_id ?? data.proprietario_id ?? null,
              data_inicio: novoContrato.data_inicio ?? data.data_inicio ?? null,
              data_fim: novoContrato.data_fim ?? data.data_fim ?? null,
            };
            setData((d) => ({ ...d, ...patch }));
            setDirty(true);
            await persistRascunho(patch);
            toast.success("Contrato de aluguer criado. A iniciar prestação de serviço…");
            setStep(2);
            // Auto-arrancar fluxo da prestação
            setTimeout(() => startPrestacaoFlow(), 300);
          } else {
            const patch: Partial<AluguerRascunhoDados> = { contrato_prestacao_id: novoContrato.id };
            setData((d) => ({ ...d, ...patch }));
            setDirty(true);
            await persistRascunho(patch);
            toast.success("Contrato de prestação criado. A avançar para o check-list…");
            setStep(3);
          }
        }}
      />
    </>
  );
}

function SummaryRow({ label, value, ok, optional }: { label: string; value: string; ok: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {ok ? (
          <Badge variant="secondary" className="text-xs bg-success/10 text-success">OK</Badge>
        ) : optional ? (
          <Badge variant="outline" className="text-xs">Opcional</Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
        )}
      </div>
    </div>
  );
}
