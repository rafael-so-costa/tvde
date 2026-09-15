import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VehiclesSkeleton } from "./WizardSkeleton";
import { cn } from "@/lib/utils";
import { Search, Car, Check, Fuel, Calendar } from "lucide-react";

// Using the database schema type instead of local Vehicle type
interface VehicleData {
  id: string;
  matricula?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  cor?: string;
  combustivel?: string;
  ativo?: boolean;
}

interface VehicleSelectorProps {
  vehicles: VehicleData[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function VehicleSelector({
  vehicles,
  selectedId,
  onSelect,
  isLoading,
}: VehicleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.matricula?.toLowerCase().includes(query) ||
      v.marca?.toLowerCase().includes(query) ||
      v.modelo?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <VehiclesSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search - Always visible */}
      <div className="space-y-2 pb-4 border-b sticky top-0 bg-background z-10">
        <Label htmlFor="vehicle-search" className="flex items-center gap-2">
          <Car className="w-4 h-4" />
          Veículo
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="vehicle-search"
            placeholder="Pesquisar por matrícula, marca ou modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Pesquisar veículos"
          />
        </div>
      </div>

      {/* Vehicle List - Scrollable */}
      <ScrollArea className="flex-1 min-h-0 mt-4">
        <div className="space-y-2 pr-4">
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum veículo encontrado</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedId;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => onSelect(vehicle.id)}
                  className={cn(
                    "w-full p-4 border rounded-lg text-left transition-all flex items-center gap-4",
                    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "bg-card"
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Selecionar veículo ${vehicle.marca || ''} ${vehicle.modelo || ''} - ${vehicle.matricula || ''}`}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <Car className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-lg">
                        {vehicle.matricula || "Sem matrícula"}
                      </span>
                      {vehicle.ativo && (
                        <Badge variant="outline" className="text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {vehicle.marca} {vehicle.modelo} {vehicle.ano}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {vehicle.combustivel && (
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          {vehicle.combustivel}
                        </span>
                      )}
                      {vehicle.cor && (
                        <span>{vehicle.cor}</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Sticky footer */}
      <div className="sticky bottom-0 pt-4 border-t bg-background mt-4">
        <p className="text-sm text-muted-foreground text-center">
          {filteredVehicles.length} veículo(s) disponível(is)
          {selectedId && (
            <span className="ml-2 text-primary font-medium">
              · 1 selecionado
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
