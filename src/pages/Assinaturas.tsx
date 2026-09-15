import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PenLine, CheckCircle2, Clock, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useMinhasAssinaturas, type AssinaturaPendente } from "@/hooks/useMinhasAssinaturas";
import { SignContractDialog } from "@/components/signatures/SignContractDialog";

function SignatureCard({
  assinatura,
  onSign,
}: {
  assinatura: AssinaturaPendente;
  onSign: () => void;
}) {
  const isPending = !assinatura.verificado;
  const contractName = assinatura.contrato?.template?.nome || `Contrato ${assinatura.contrato?.tipo || ""}`;

  return (
    <Card className="p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{contractName}</h3>
            <p className="text-xs text-muted-foreground">
              Solicitado em{" "}
              {assinatura.solicitado_em
                ? format(new Date(assinatura.solicitado_em), "dd/MM/yyyy HH:mm", { locale: pt })
                : format(new Date(assinatura.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
            </p>
          </div>
        </div>
        {isPending ? (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        ) : (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Assinado
          </Badge>
        )}
      </div>

      <div className="text-sm space-y-1 text-muted-foreground mb-4">
        <p>
          Para: <span className="text-foreground font-medium">{assinatura.signatario_nome}</span>{" "}
          <span className="text-xs">({assinatura.signatario_tipo})</span>
        </p>
        {assinatura.assinado_em && (
          <p className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Assinado em{" "}
            {format(new Date(assinatura.assinado_em), "dd/MM/yyyy HH:mm", { locale: pt })}
          </p>
        )}
      </div>

      {isPending ? (
        <Button onClick={onSign} className="w-full btn-accent">
          <PenLine className="w-4 h-4 mr-2" /> Ver e Assinar
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Assinatura concluída
        </Button>
      )}
    </Card>
  );
}

export default function Assinaturas() {
  const [tab, setTab] = useState("pendentes");
  const [selected, setSelected] = useState<AssinaturaPendente | null>(null);
  const { data: assinaturas = [], isLoading } = useMinhasAssinaturas();

  const pendentes = assinaturas.filter((a) => !a.verificado);
  const concluidas = assinaturas.filter((a) => a.verificado);

  const list = tab === "pendentes" ? pendentes : concluidas;

  return (
    <AppLayout
      title="Assinaturas"
      subtitle="Contratos que aguardam a sua assinatura digital"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas ({concluidas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16">
              <PenLine className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">
                {tab === "pendentes"
                  ? "Sem assinaturas pendentes"
                  : "Sem assinaturas concluídas"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tab === "pendentes"
                  ? "Quando um contrato for enviado para si, aparecerá aqui."
                  : "Os contratos que assinar serão arquivados aqui."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {list.map((a) => (
                <SignatureCard
                  key={a.id}
                  assinatura={a}
                  onSign={() => setSelected(a)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SignContractDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        assinatura={selected}
      />
    </AppLayout>
  );
}
