import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Play, Square, Loader2, PencilLine } from "lucide-react";
import {
  useMotoristaExpediente,
  useRegistosExpediente,
  useRegistarExpediente,
  useCorrigirRegistoExpediente,
  somarSegundosPorDia,
  formatarDuracao,
  estadoAtual,
  type RegistoExpediente,
} from "@/hooks/useExpediente";

function horaLocal(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function paraInputLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MotoristaExpediente() {
  const { data: motorista, isLoading: loadingMotorista } = useMotoristaExpediente();
  const { data: registos = [], isLoading } = useRegistosExpediente(motorista?.id);
  const registar = useRegistarExpediente();
  const corrigir = useCorrigirRegistoExpediente();

  const [emCorrecao, setEmCorrecao] = useState<RegistoExpediente | null>(null);
  const [novaHora, setNovaHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const estado = useMemo(() => estadoAtual(registos), [registos]);
  const segundosPorDia = useMemo(() => somarSegundosPorDia(registos), [registos]);

  const dias = useMemo(() => {
    const mapa = new Map<string, RegistoExpediente[]>();
    registos.forEach((r) => {
      const lista = mapa.get(r.data_local) || [];
      lista.push(r);
      mapa.set(r.data_local, lista);
    });
    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dia, lista]) => ({
        dia,
        registos: [...lista].sort(
          (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
        ),
        segundos: segundosPorDia.get(dia) || 0,
      }));
  }, [registos, segundosPorDia]);

  const marcar = async () => {
    if (!motorista?.nif) {
      toast.error("O teu perfil não tem NIF preenchido. Fala com a empresa.");
      return;
    }
    await registar.mutateAsync({
      nif: motorista.nif,
      tenantId: motorista.tenant_id,
      origem: "app",
    });
  };

  const abrirCorrecao = (registo: RegistoExpediente) => {
    setEmCorrecao(registo);
    setNovaHora(paraInputLocal(registo.data_hora));
    setMotivo(registo.observacoes_correcao || "");
  };

  const guardarCorrecao = async () => {
    if (!emCorrecao || !novaHora) return;
    await corrigir.mutateAsync({
      id: emCorrecao.id,
      dataHora: new Date(novaHora).toISOString(),
      observacoes: motivo.trim() || null,
    });
    setEmCorrecao(null);
  };

  return (
    <AppLayout title="Registo de Expediente" subtitle="Marca o início e o fim do teu dia de trabalho">
      <div className="max-w-3xl space-y-6">
        <div className="card-elevated p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Situação atual
              </h3>
              {loadingMotorista || isLoading ? (
                <p className="text-sm text-muted-foreground mt-2">A carregar…</p>
              ) : estado.emServico ? (
                <p className="text-sm mt-2">
                  <Badge className="mr-2">Em serviço</Badge>
                  desde as {estado.desde ? horaLocal(estado.desde) : "—"}
                </p>
              ) : (
                <p className="text-sm mt-2">
                  <Badge variant="outline" className="mr-2">Fora de serviço</Badge>
                  {estado.registosHoje > 0 ? "Já registaste horas hoje." : "Ainda não registaste hoje."}
                </p>
              )}
              {motorista?.nif && (
                <p className="text-xs text-muted-foreground mt-2">NIF usado no registo: {motorista.nif}</p>
              )}
            </div>

            <Button size="lg" onClick={marcar} disabled={registar.isPending || !motorista}>
              {registar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : estado.emServico ? (
                <Square className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {estado.emServico ? "Terminar expediente" : "Iniciar expediente"}
            </Button>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Histórico e correções</h3>
          {dias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos nos últimos 45 dias.</p>
          ) : (
            <ul className="space-y-4">
              {dias.map(({ dia, registos: doDia, segundos }) => (
                <li key={dia} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">
                      {new Date(dia + "T00:00:00").toLocaleDateString("pt-PT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                    <Badge variant="outline">{formatarDuracao(segundos)}</Badge>
                  </div>
                  <ul className="space-y-2">
                    {doDia.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant={r.tipo === "entrada" ? "default" : "secondary"}>
                            {r.tipo === "entrada" ? "Início" : "Fim"}
                          </Badge>
                          {horaLocal(r.data_hora)}
                          {r.corrigido && (
                            <span className="text-xs text-muted-foreground">(corrigido)</span>
                          )}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => abrirCorrecao(r)}>
                          <PencilLine className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!emCorrecao} onOpenChange={(open) => !open && setEmCorrecao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Corrigir hora</DialogTitle>
            <DialogDescription>
              {emCorrecao?.tipo === "entrada" ? "Início" : "Fim"} de expediente registado a{" "}
              {emCorrecao ? new Date(emCorrecao.data_hora).toLocaleString("pt-PT") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nova-hora">Nova data e hora</Label>
              <Input
                id="nova-hora"
                type="datetime-local"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="motivo">Motivo da correção</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: esqueci-me de marcar a saída"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmCorrecao(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarCorrecao} disabled={corrigir.isPending || !novaHora}>
              {corrigir.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
