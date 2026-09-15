import { DamageRecord, PartStatus } from "@/types/checklist";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DamagePanelProps {
  selectedPart: string | null;
  damages: DamageRecord[];
  onToggleDamage: (part: string, type: "amassado" | "riscado" | "quebrado") => void;
  onSetPartStatus: (part: string, status: PartStatus) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: PartStatus; label: string; color: string; bgColor: string; icon: "ok" | "warn" | "error" }[] = [
  { value: "ok", label: "OK", color: "text-green-600 dark:text-green-400", bgColor: "border-green-500 bg-green-50 dark:bg-green-950/30", icon: "ok" },
  { value: "riscado", label: "Riscado", color: "text-orange-500 dark:text-orange-400", bgColor: "border-orange-500 bg-orange-50 dark:bg-orange-950/30", icon: "warn" },
  { value: "amassado", label: "Amassado", color: "text-red-500 dark:text-red-400", bgColor: "border-red-500 bg-red-50 dark:bg-red-950/30", icon: "error" },
  { value: "quebrado", label: "Quebrado", color: "text-red-700 dark:text-red-400", bgColor: "border-red-700 bg-red-50 dark:bg-red-950/30", icon: "error" },
];

export function DamagePanel({ selectedPart, damages, onToggleDamage, onSetPartStatus, onClose }: DamagePanelProps) {
  if (!selectedPart) return null;

  const damage = damages.find((d) => d.part === selectedPart);
  const currentStatus = damage?.status || null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{selectedPart}</CardTitle>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label className="text-xs text-muted-foreground">Selecione o estado:</Label>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetPartStatus(selectedPart, opt.value)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium",
                  isSelected ? opt.bgColor : "border-border bg-card hover:border-muted-foreground/30"
                )}
              >
                {opt.icon === "ok" ? (
                  <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </span>
                ) : opt.icon === "warn" ? (
                  <span className="w-4 h-4 rounded-full bg-orange-500" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-red-600" />
                )}
                <span className={isSelected ? opt.color : "text-foreground"}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
