import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, Play, Square } from "lucide-react";
import { useRegistarExpediente, type RegistoExpediente } from "@/hooks/useExpediente";

const NIF_KEY = "tvde_pro_expediente_nif";

export default function RegistoExpedientePublico() {
  const [params] = useSearchParams();
  const tenantId = params.get("tenant");
  const registar = useRegistarExpediente();

  const [nif, setNif] = useState("");
  const [ultimo, setUltimo] = useState<RegistoExpediente | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem(NIF_KEY);
    if (guardado) setNif(guardado);
  }, []);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const limpo = nif.replace(/\D/g, "");
    if (limpo.length !== 9) {
      setErro("Introduz os 9 dígitos do teu NIF.");
      return;
    }
    try {
      const registo = await registar.mutateAsync({ nif: limpo, tenantId, origem: "publico" });
      localStorage.setItem(NIF_KEY, limpo);
      setUltimo(registo);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md card-elevated p-6 space-y-6">
        <header className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-bold">Registo de Expediente</h1>
          <p className="text-sm text-muted-foreground">
            Introduz o teu NIF para marcar o início ou o fim do trabalho.
          </p>
        </header>

        <form onSubmit={submeter} className="space-y-4">
          <div>
            <Label htmlFor="nif">NIF</Label>
            <Input
              id="nif"
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="000000000"
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={registar.isPending}>
            {registar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registar
          </Button>
        </form>

        {ultimo && (
          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Registo guardado
            </p>
            <p className="flex items-center gap-2">
              <Badge variant={ultimo.tipo === "entrada" ? "default" : "secondary"} className="gap-1">
                {ultimo.tipo === "entrada" ? <Play className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                {ultimo.tipo === "entrada" ? "Início de expediente" : "Fim de expediente"}
              </Badge>
            </p>
            <p className="text-muted-foreground">
              {new Date(ultimo.data_hora).toLocaleString("pt-PT")}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
