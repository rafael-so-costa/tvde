import { FileText, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContratos } from "@/hooks/useContratos";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const statusStyles: Record<string, string> = {
  assinado: "badge-success",
  enviado: "badge-warning",
  rascunho: "badge-success",
  cancelado: "bg-muted text-muted-foreground",
  expirado: "badge-destructive",
  renovado: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<string, string> = {
  assinado: "Ativo",
  enviado: "Pendente",
  rascunho: "Ativo",
  cancelado: "Cancelado",
  expirado: "Expirado",
  renovado: "Renovado",
};

interface RecentContractsProps {
  hideCard?: boolean;
}

export function RecentContracts({ hideCard = false }: RecentContractsProps) {
  const navigate = useNavigate();
  const { contratos, isLoading } = useContratos();
  
  // Get only the 5 most recent contracts
  const recentContracts = contratos.slice(0, 5);
  
  const getOwnerName = (contract: any) => {
    if (!contract.proprietario) return "-";
    return contract.proprietario.tipo === "empresa" 
      ? contract.proprietario.nome_empresa 
      : contract.proprietario.nome_completo || "-";
  };
  
  const content = (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Contratos Recentes</h3>
        <Button variant="outline" size="sm" onClick={() => navigate("/contracts")}>
          Ver Todos
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : recentContracts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhum contrato cadastrado</p>
          <p className="text-sm">Crie seu primeiro contrato para vê-lo aqui.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Contrato
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Proprietário
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Motorista
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Veículo
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {recentContracts.map((contract, index) => (
                <tr
                  key={contract.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{contract.template?.nome || "Contrato"}</span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: pt })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">
                    {getOwnerName(contract)}
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">
                    {contract.motorista?.nome_completo || "-"}
                  </td>
                  <td className="py-4 px-4">
                    {contract.veiculo?.matricula ? (
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {contract.veiculo.matricula}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn("text-xs px-2 py-1 rounded-full", statusStyles[contract.status] || statusStyles.rascunho)}>
                      {statusLabels[contract.status] || contract.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (hideCard) {
    return content;
  }

  return (
    <div className="card-elevated p-6">
      {content}
    </div>
  );
}