import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Send, Pencil, Trash2, Play, Calendar, Infinity as InfinityIcon, Globe, Lock, ListChecks } from "lucide-react";
import { AudienceSelector } from "./AudienceSelector";
import { CampanhaFormDialog } from "./CampanhaFormDialog";
import { BroadcastListsDialog } from "./BroadcastListsDialog";
import {
  useCampanhas, useCreateCampanha, useDeleteCampanha,
  useExecutarCampanha, useUpdateCampanha, type Campanha, type PublicoTipo,
} from "@/hooks/useCampanhas";
import { useListasTransmissao } from "@/hooks/useListasTransmissao";
import { toast } from "sonner";

const FREQ_LABEL: Record<string, string> = {
  unica: "Única", diario: "Diária", semanal: "Semanal", mensal: "Mensal", personalizado: "Personalizada",
};

const fmtDate = (s?: string | null) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-PT") : null;

function calcProximoEnvio(c: Campanha): Date | null {
  if (!c.ativo) return null;
  const [hh, mm] = (c.hora_envio || "09:00").split(":").map(Number);
  const today = new Date(); today.setSeconds(0, 0);
  const fim = c.data_fim ? new Date(c.data_fim + "T23:59:59") : null;
  const inicio = c.data_inicio ? new Date(c.data_inicio + "T00:00:00") : null;

  for (let i = 0; i < 366; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i); d.setHours(hh, mm, 0, 0);
    if (inicio && d < inicio) continue;
    if (fim && d > fim) return null;
    if (i === 0 && d < new Date()) continue;
    let ok = false;
    switch (c.frequencia) {
      case "unica": ok = !c.ultima_execucao_at; break;
      case "diario": ok = true; break;
      case "semanal": ok = (c.dias_semana ?? []).includes(d.getDay()); break;
      case "mensal":
      case "personalizado": ok = (c.dias_mes ?? []).includes(d.getDate()); break;
    }
    if (ok) return d;
  }
  return null;
}

export function MassMessagingTab() {
  const { data: campanhas = [], isLoading } = useCampanhas();
  const create = useCreateCampanha();
  const executar = useExecutarCampanha();
  const update = useUpdateCampanha();
  const del = useDeleteCampanha();
  const { data: listas = [] } = useListasTransmissao();

  // Manual
  const [manualConteudo, setManualConteudo] = useState("");
  const [manualPublico, setManualPublico] = useState<PublicoTipo>("ambos");
  const [manualFiltro, setManualFiltro] = useState<boolean | null>(true);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [manualListaId, setManualListaId] = useState<string | null>(null);
  const [manualTipoMsg, setManualTipoMsg] = useState<"normal" | "broadcast">("normal");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campanha | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listsOpen, setListsOpen] = useState(false);

  const [manualEscopo, setManualEscopo] = useState<"externo" | "interno">("externo");
  const [filtroEscopo, setFiltroEscopo] = useState<"todos" | "externo" | "interno">("todos");

  const handleEnviarAgora = async () => {
    if (!manualConteudo.trim()) return toast.error("Escreva uma mensagem");
    if (manualPublico === "especificos" && manualIds.length === 0)
      return toast.error("Selecione destinatários");
    if (manualPublico === "lista" && !manualListaId)
      return toast.error("Selecione uma lista de transmissão");

    // Expandir lista para destinatarios_ids para que executar_campanha funcione
    let publicoFinal: PublicoTipo = manualPublico;
    let idsFinal = manualPublico === "especificos" ? manualIds : [];
    if (manualPublico === "lista") {
      const lista = listas.find((l) => l.id === manualListaId);
      if (!lista || (lista.destinatarios_ids ?? []).length === 0)
        return toast.error("A lista selecionada está vazia");
      publicoFinal = "especificos";
      idsFinal = lista.destinatarios_ids;
    }

    const camp = (await create.mutateAsync({
      nome: `Envio manual ${new Date().toLocaleString("pt-PT")}`,
      conteudo: manualConteudo,
      publico_tipo: publicoFinal,
      filtro_ativo: manualFiltro,
      destinatarios_ids: idsFinal,
      tipo_envio: "imediato", frequencia: "unica",
      dias_semana: [], dias_mes: [], hora_envio: "09:00",
      data_inicio: null, data_fim: null, ativo: true,
      escopo: manualEscopo,
      somente_leitura: manualTipoMsg === "broadcast",
    })) as unknown as { id: string } | null;
    if (camp?.id) await executar.mutateAsync(camp.id);
    setManualConteudo(""); setManualIds([]); setManualListaId(null);
  };

  return (
    <div>
      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual"><Send className="w-4 h-4 mr-1" />Envio Manual</TabsTrigger>
          <TabsTrigger value="planeadas"><Calendar className="w-4 h-4 mr-1" />Mensagens Planeadas</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Enviar mensagem agora</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de comunicação</Label>
                <RadioGroup
                  value={manualEscopo}
                  onValueChange={(v) => {
                    const e = v as "externo" | "interno";
                    setManualEscopo(e);
                    setManualPublico(e === "interno" ? "funcionarios" : "ambos");
                    setManualIds([]);
                  }}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="externo" />
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">Externa (clientes)</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="interno" />
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">Interna (equipa)</span>
                  </label>
                </RadioGroup>
              </div>
              <div>
                <Label>Tipo de mensagem</Label>
                <RadioGroup
                  value={manualTipoMsg}
                  onValueChange={(v) => setManualTipoMsg(v as "normal" | "broadcast")}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="normal" />
                    <span className="text-sm">Conversa normal (permite resposta)</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="broadcast" />
                    <span className="text-sm">Aviso / Broadcast (sem resposta)</span>
                  </label>
                </RadioGroup>
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={manualConteudo} onChange={(e) => setManualConteudo(e.target.value)}
                  rows={4} placeholder="Escreva a mensagem a enviar..."
                />
              </div>
              <AudienceSelector
                publicoTipo={manualPublico} onPublicoTipoChange={setManualPublico}
                filtroAtivo={manualFiltro} onFiltroAtivoChange={setManualFiltro}
                destinatariosIds={manualIds} onDestinatariosChange={setManualIds}
                escopo={manualEscopo}
                listaId={manualListaId}
                onListaChange={setManualListaId}
                onManageLists={() => setListsOpen(true)}
              />
              <Button
                onClick={handleEnviarAgora}
                disabled={create.isPending || executar.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {create.isPending || executar.isPending ? "A enviar..." : "Enviar agora"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planeadas" className="mt-4 space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Campanhas executadas automaticamente conforme a frequência definida.
            </p>
            <div className="flex items-center gap-2">
              <RadioGroup
                value={filtroEscopo}
                onValueChange={(v) => setFiltroEscopo(v as "todos" | "externo" | "interno")}
                className="flex gap-1"
              >
                <label className="flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer text-xs hover:bg-muted/50">
                  <RadioGroupItem value="todos" /> Todos
                </label>
                <label className="flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer text-xs hover:bg-muted/50">
                  <RadioGroupItem value="externo" /> <Globe className="w-3 h-3" /> Externo
                </label>
                <label className="flex items-center gap-1 border rounded-md px-2 py-1 cursor-pointer text-xs hover:bg-muted/50">
                  <RadioGroupItem value="interno" /> <Lock className="w-3 h-3" /> Interno
                </label>
              </RadioGroup>
              <Button variant="outline" onClick={() => setListsOpen(true)}>
                <ListChecks className="w-4 h-4 mr-1" /> Listas
              </Button>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nova campanha
              </Button>
            </div>
          </div>

          {(() => {
            const planeadas = campanhas.filter((c) =>
              c.tipo_envio === "agendado" &&
              (filtroEscopo === "todos" || (c.escopo ?? "externo") === filtroEscopo)
            );
            if (isLoading) return <p className="text-center text-sm text-muted-foreground py-8">A carregar…</p>;
            if (planeadas.length === 0) return (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Sem campanhas planeadas.
                </CardContent>
              </Card>
            );
            return (
            <div className="space-y-2">
              {planeadas.map((c) => {
                const continuo = !c.data_fim;
                const prox = calcProximoEnvio(c);
                return (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{c.nome}</h4>
                          <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">
                            {c.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{FREQ_LABEL[c.frequencia]}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{c.hora_envio?.slice(0, 5)}</Badge>
                          {continuo && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <InfinityIcon className="w-3 h-3" /> Contínuo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.conteudo}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Público: {c.publico_tipo}</span>
                          <span>Enviadas: {c.total_enviado}</span>
                          {fmtDate(c.data_inicio) && <span>Início: {fmtDate(c.data_inicio)}</span>}
                          <span>Fim: {continuo ? "♾️" : fmtDate(c.data_fim)}</span>
                          {prox && <span className="text-primary">Próximo: {prox.toLocaleString("pt-PT")}</span>}
                          {c.ultima_execucao_at && (
                            <span>Última: {new Date(c.ultima_execucao_at).toLocaleString("pt-PT")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Switch
                          checked={c.ativo}
                          onCheckedChange={(v) => update.mutate({ id: c.id, ativo: v })}
                        />
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => executar.mutate(c.id)} title="Executar agora">
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletingId(c.id)} title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );})}
            </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      <CampanhaFormDialog open={formOpen} onOpenChange={setFormOpen} campanha={editing} />
      <BroadcastListsDialog open={listsOpen} onOpenChange={setListsOpen} />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a campanha e o histórico de envios. Não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingId) del.mutate(deletingId); setDeletingId(null); }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
