import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "pendente" | "ativo" | "incompleto" | "inativo";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  ativo: { label: "Ativo", variant: "default" },
  incompleto: { label: "Incompleto", variant: "outline" },
  inativo: { label: "Inativo", variant: "destructive" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pendente;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "ativo" && "bg-green-500/10 text-green-500 hover:bg-green-500/20",
        status === "pendente" && "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
        status === "incompleto" && "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
        status === "inativo" && "bg-red-500/10 text-red-500 hover:bg-red-500/20",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
