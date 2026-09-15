import { DamageRecord, PartStatus } from "@/types/checklist";
import { useChecklistItems } from "@/hooks/useChecklistItems";
import { cn } from "@/lib/utils";

interface VehicleDiagramProps {
  damages: DamageRecord[];
  onPartClick: (part: string) => void;
  vehicleParts?: string[];
}

function getPartColor(damage: DamageRecord | undefined) {
  if (!damage || !damage.status) return { fill: "fill-muted", stroke: "stroke-muted-foreground/40", hover: "hover:fill-muted-foreground/10 hover:stroke-primary" };
  switch (damage.status) {
    case "ok": return { fill: "fill-green-100 dark:fill-green-900/30", stroke: "stroke-green-500", hover: "" };
    case "riscado": return { fill: "fill-orange-100 dark:fill-orange-900/30", stroke: "stroke-orange-500", hover: "" };
    case "amassado": return { fill: "fill-red-100 dark:fill-red-900/30", stroke: "stroke-red-500", hover: "" };
    case "quebrado": return { fill: "fill-red-200 dark:fill-red-900/50", stroke: "stroke-red-700", hover: "" };
  }
}

export function VehicleDiagram({ damages, onPartClick, vehicleParts: customParts }: VehicleDiagramProps) {
  const { vehicleParts: defaultParts } = useChecklistItems();
  const partNames = customParts || defaultParts.map(p => p.name);

  const partPositions: { name: string; x: number; y: number; w: number; h: number }[] = [
    { name: "Para-choque Dianteiro", x: 60, y: 10, w: 180, h: 30 },
    { name: "Farol Dianteiro Esquerdo", x: 60, y: 10, w: 40, h: 30 },
    { name: "Farol Dianteiro Direito", x: 200, y: 10, w: 40, h: 30 },
    { name: "Capô", x: 80, y: 45, w: 140, h: 60 },
    { name: "Para-brisa Dianteiro", x: 80, y: 110, w: 140, h: 25 },
    { name: "Retrovisor Esquerdo", x: 50, y: 120, w: 25, h: 20 },
    { name: "Retrovisor Direito", x: 225, y: 120, w: 25, h: 20 },
    { name: "Para-lama Dianteiro Esquerdo", x: 60, y: 45, w: 20, h: 90 },
    { name: "Para-lama Dianteiro Direito", x: 220, y: 45, w: 20, h: 90 },
    { name: "Porta Dianteira Esquerda", x: 60, y: 140, w: 20, h: 60 },
    { name: "Porta Dianteira Direita", x: 220, y: 140, w: 20, h: 60 },
    { name: "Teto", x: 80, y: 140, w: 140, h: 80 },
    { name: "Porta Traseira Esquerda", x: 60, y: 205, w: 20, h: 60 },
    { name: "Porta Traseira Direita", x: 220, y: 205, w: 20, h: 60 },
    { name: "Para-brisa Traseiro", x: 80, y: 225, w: 140, h: 25 },
    { name: "Para-lama Traseiro Esquerdo", x: 60, y: 255, w: 20, h: 60 },
    { name: "Para-lama Traseiro Direito", x: 220, y: 255, w: 20, h: 60 },
    { name: "Porta-Malas", x: 80, y: 255, w: 140, h: 50 },
    { name: "Para-choque Traseiro", x: 60, y: 310, w: 180, h: 30 },
    { name: "Lanterna Traseira Esquerda", x: 60, y: 310, w: 40, h: 30 },
    { name: "Lanterna Traseira Direita", x: 200, y: 310, w: 40, h: 30 },
    { name: "Jante Dianteira Esquerda", x: 35, y: 80, w: 22, h: 22 },
    { name: "Jante Dianteira Direita", x: 243, y: 80, w: 22, h: 22 },
    { name: "Jante Traseira Esquerda", x: 35, y: 270, w: 22, h: 22 },
    { name: "Jante Traseira Direita", x: 243, y: 270, w: 22, h: 22 },
  ];

  const visibleParts = partPositions.filter(p => partNames.includes(p.name));

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">Diagrama do Veículo (vista superior)</h4>
      <div className="relative bg-muted/30 rounded-lg p-4 border">
        <svg viewBox="0 0 300 350" className="w-full max-w-[300px] mx-auto">
          {visibleParts.map((part) => {
            const damage = damages.find(d => d.part === part.name);
            const colors = getPartColor(damage);
            const isWheel = part.name.includes("Jante");
            return (
              <g key={part.name} onClick={() => onPartClick(part.name)} className="cursor-pointer">
                {isWheel ? (
                  <circle
                    cx={part.x + part.w / 2} cy={part.y + part.h / 2} r={part.w / 2}
                    className={cn("transition-all duration-200", colors.fill, colors.stroke, colors.hover)} strokeWidth={2}
                  />
                ) : (
                  <rect x={part.x} y={part.y} width={part.w} height={part.h} rx={4}
                    className={cn("transition-all duration-200", colors.fill, colors.stroke, colors.hover)} strokeWidth={2}
                  />
                )}
                <text x={part.x + part.w / 2} y={part.y + part.h / 2} textAnchor="middle" dominantBaseline="central"
                  className="text-[6px] fill-foreground pointer-events-none">
                  {part.w > 60 ? part.name.slice(0, 15) : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border" /> Não avaliado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> OK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> Riscado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Amassado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-700" /> Quebrado</span>
      </div>
    </div>
  );
}

export function PartsList({ damages, onPartClick, vehicleParts: customParts }: VehicleDiagramProps) {
  const { vehicleParts: defaultParts } = useChecklistItems();
  const partNames = customParts || defaultParts.map(p => p.name);

  const statusLabels: Record<string, { label: string; color: string }> = {
    ok: { label: "OK", color: "text-green-600 dark:text-green-400" },
    riscado: { label: "Riscado", color: "text-orange-500" },
    amassado: { label: "Amassado", color: "text-red-500" },
    quebrado: { label: "Quebrado", color: "text-red-700 dark:text-red-400" },
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-muted-foreground">Selecionar Peça</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[350px] overflow-y-auto">
        {partNames.map((part) => {
          const damage = damages.find((d) => d.part === part);
          const status = damage?.status;
          const borderColor = status === "ok" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
            : status === "riscado" ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
            : status === "amassado" || status === "quebrado" ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
            : "bg-card";
          return (
            <button key={part} onClick={() => onPartClick(part)}
              className={cn("text-left text-xs p-2 rounded-lg border transition-all hover:border-primary", borderColor)}>
              <span className="block">{part}</span>
              {status && (
                <span className={cn("block text-[10px] font-semibold mt-0.5", statusLabels[status]?.color)}>
                  {status === "ok" ? "🟢" : status === "riscado" ? "🟠" : "🔴"} {statusLabels[status]?.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
