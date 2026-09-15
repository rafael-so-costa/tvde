import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Infinity as InfinityIcon, Globe, Lock } from "lucide-react";
import { AudienceSelector } from "./AudienceSelector";
import { BroadcastListsDialog } from "./BroadcastListsDialog";
import { useCreateCampanha, useUpdateCampanha, type Campanha, type CampanhaInput, type EscopoCampanha, type Frequencia, type PublicoTipo } from "@/hooks/useCampanhas";
import { useListasTransmissao } from "@/hooks/useListasTransmissao";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campanha?: Campanha | null;
}

const DOW = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

export function CampanhaFormDialog({ open, onOpenChange, campanha }: Props) {
  const create = useCreateCampanha();
  const update = useUpdateCampanha();
  const { data: listas = [] } = useListasTransmissao();
  const [listsOpen, setListsOpen] = useState(false);

  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [publicoTipo, setPublicoTipo] = useState<PublicoTipo>("ambos");
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(true);
  const [destinatariosIds, setDestinatariosIds] = useState<string[]>([]);
  const [listaId, setListaId] = useState<string | null>(null);
  const [frequencia, setFrequencia] = useState<Frequencia>("diario");
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [diasMes, setDiasMes] = useState<string>("");
  const [horaEnvio, setHoraEnvio] = useState("09:00");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [continuo, setContinuo] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [escopo, setEscopo] = useState<EscopoCampanha>("externo");
  const [somenteLeitura, setSomenteLeitura] = useState(false);

  useEffect(() => {
    if (campanha) {
      setNome(campanha.nome);
      setConteudo(campanha.conteudo);
      setPublicoTipo(campanha.publico_tipo);
      setFiltroAtivo(campanha.filtro_ativo);
      setDestinatariosIds(campanha.destinatarios_ids ?? []);
      setFrequencia(campanha.frequencia);
      setDiasSemana(campanha.dias_semana ?? []);
      setDiasMes((campanha.dias_mes ?? []).join(","));
      setHoraEnvio(campanha.hora_envio?.slice(0, 5) ?? "09:00");
      setDataInicio(campanha.data_inicio ?? "");
      setDataFim(campanha.data_fim ?? "");
      setContinuo(!campanha.data_fim);
      setAtivo(campanha.ativo);
      setEscopo(campanha.escopo ?? "externo");
      setSomenteLeitura(campanha.somente_leitura ?? false);
      setListaId(null);
    } else {
      setNome(""); setConteudo(""); setPublicoTipo("ambos"); setFiltroAtivo(true);
      setDestinatariosIds([]); setFrequencia("diario"); setDiasSemana([]);
      setDiasMes(""); setHoraEnvio("09:00");
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataFim(""); setContinuo(true); setAtivo(true);
      setEscopo("externo");
      setSomenteLeitura(false);
      setListaId(null);
    }
  }, [campanha, open]);

  const handleSubmit = async () => {
    if (!nome.trim() || !conteudo.trim()) return toast.error("Preencha nome e conteúdo");
    if (!dataInicio) return toast.error("Indique a data de início");
    if (!continuo && !dataFim) return toast.error("Indique a data de fim ou marque 'Enviar continuamente'");
    if (!continuo && dataFim && dataFim < dataInicio)
      return toast.error("A data de fim deve ser posterior à data de início");
    if (publicoTipo === "especificos" && destinatariosIds.length === 0)
      return toast.error("Selecione pelo menos um destinatário");
    if (publicoTipo === "lista" && !listaId)
      return toast.error("Selecione uma lista de transmissão");
    if (frequencia === "semanal" && diasSemana.length === 0)
      return toast.error("Selecione pelo menos um dia da semana");

    const diasMesArr = (frequencia === "mensal" || frequencia === "personalizado")
      ? diasMes.split(",").map((s) => parseInt(s.trim())).filter((n) => n >= 1 && n <= 31)
      : [];
    if ((frequencia === "mensal" || frequencia === "personalizado") && diasMesArr.length === 0)
      return toast.error("Indique os dias do mês (ex: 1,15)");

    // Expandir lista para destinatarios_ids para reaproveitar executar_campanha
    let publicoFinal: PublicoTipo = publicoTipo;
    let idsFinal: string[] = publicoTipo === "especificos" ? destinatariosIds : [];
    if (publicoTipo === "lista") {
      const lista = listas.find((l) => l.id === listaId);
      if (!lista || (lista.destinatarios_ids ?? []).length === 0)
        return toast.error("A lista selecionada está vazia");
      publicoFinal = "especificos";
      idsFinal = lista.destinatarios_ids;
    }

    const input: CampanhaInput = {
      nome, conteudo, publico_tipo: publicoFinal, filtro_ativo: filtroAtivo,
      destinatarios_ids: idsFinal,
      tipo_envio: "agendado", frequencia, dias_semana: frequencia === "semanal" ? diasSemana : [],
      dias_mes: diasMesArr, hora_envio: horaEnvio,
      data_inicio: dataInicio,
      data_fim: continuo ? null : (dataFim || null),
      ativo,
      escopo,
      somente_leitura: somenteLeitura,
    };

    if (campanha) await update.mutateAsync({ id: campanha.id, ...input });
    else await create.mutateAsync(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campanha ? "Editar campanha" : "Nova campanha planeada"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da campanha</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lembrete semanal" />
          </div>

          <div>
            <Label>Conteúdo da mensagem</Label>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={4} />
          </div>

          <div>
            <Label>Tipo de comunicação</Label>
            <RadioGroup
              value={escopo}
              onValueChange={(v) => {
                const e = v as EscopoCampanha;
                setEscopo(e);
                setPublicoTipo(e === "interno" ? "funcionarios" : "ambos");
                setDestinatariosIds([]);
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
              value={somenteLeitura ? "broadcast" : "normal"}
              onValueChange={(v) => setSomenteLeitura(v === "broadcast")}
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

          <AudienceSelector
            publicoTipo={publicoTipo} onPublicoTipoChange={setPublicoTipo}
            filtroAtivo={filtroAtivo} onFiltroAtivoChange={setFiltroAtivo}
            destinatariosIds={destinatariosIds} onDestinatariosChange={setDestinatariosIds}
            escopo={escopo}
            listaId={listaId}
            onListaChange={setListaId}
            onManageLists={() => setListsOpen(true)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequência</Label>
              <Select value={frequencia} onValueChange={(v) => setFrequencia(v as Frequencia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única vez</SelectItem>
                  <SelectItem value="diario">Diariamente</SelectItem>
                  <SelectItem value="semanal">Semanalmente</SelectItem>
                  <SelectItem value="mensal">Mensalmente</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hora de envio</Label>
              <Input type="time" value={horaEnvio} onChange={(e) => setHoraEnvio(e.target.value)} />
            </div>
          </div>

          {frequencia === "semanal" && (
            <div>
              <Label>Dias da semana</Label>
              <ToggleGroup
                type="multiple"
                value={diasSemana.map(String)}
                onValueChange={(v) => setDiasSemana(v.map(Number))}
                className="justify-start flex-wrap mt-2"
              >
                {DOW.map((d) => (
                  <ToggleGroupItem key={d.v} value={String(d.v)} className="text-xs">{d.l}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {(frequencia === "mensal" || frequencia === "personalizado") && (
            <div>
              <Label>Dias do mês (separados por vírgula)</Label>
              <Input value={diasMes} onChange={(e) => setDiasMes(e.target.value)} placeholder="Ex: 1, 15" />
            </div>
          )}

          <div className="space-y-3 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data início *</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label className={continuo ? "text-muted-foreground" : ""}>Data fim</Label>
                <Input
                  type="date" value={dataFim} disabled={continuo}
                  min={dataInicio || undefined}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={continuo} onCheckedChange={(v) => { setContinuo(!!v); if (v) setDataFim(""); }} />
              <InfinityIcon className="w-4 h-4" />
              Enviar continuamente (sem data de fim)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {campanha ? "Guardar" : "Criar campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <BroadcastListsDialog open={listsOpen} onOpenChange={setListsOpen} />
    </Dialog>
  );
}
