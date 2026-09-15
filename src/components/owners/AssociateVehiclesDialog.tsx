import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Car, Loader2, Search } from "lucide-react";

interface AssociateVehiclesDialogProps {
  ownerId: string;
  ownerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssociateVehiclesDialog({
  ownerId,
  ownerName,
  open,
  onOpenChange,
}: AssociateVehiclesDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles-for-association"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select(
          "id, matricula, marca, modelo, foto_principal_url, ativo, proprietario_id, proprietario:proprietarios(id, nome_completo, nome_empresa, tipo)"
        )
        .order("matricula", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const associate = useMutation({
    mutationFn: async (vehicleIds: string[]) => {
      const { error } = await supabase
        .from("veiculos")
        .update({ proprietario_id: ownerId })
        .in("id", vehicleIds);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles-for-association"] });
      queryClient.invalidateQueries({ queryKey: ["owner-vehicles", ownerId] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success(
        ids.length === 1
          ? "Veículo associado com sucesso"
          : `${ids.length} veículos associados com sucesso`
      );
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error("Erro ao associar: " + e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.matricula?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.modelo?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const toggle = (id: string, alreadyAssociated: boolean) => {
    if (alreadyAssociated) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) {
      toast.info("Selecione pelo menos um veículo");
      return;
    }
    associate.mutate(Array.from(selected));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Associar veículos a {ownerName}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por matrícula, marca ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg divide-y">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum veículo encontrado</p>
            </div>
          ) : (
            filtered.map((v) => {
              const associatedToThis = v.proprietario_id === ownerId;
              const associatedToOther =
                !!v.proprietario_id && v.proprietario_id !== ownerId;
              const isChecked = selected.has(v.id) || associatedToThis;
              const otherOwnerName = v.proprietario
                ? v.proprietario.tipo === "empresa"
                  ? v.proprietario.nome_empresa
                  : v.proprietario.nome_completo
                : null;

              return (
                <label
                  key={v.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                    associatedToThis ? "bg-muted/30" : ""
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={associatedToThis}
                    onCheckedChange={() => toggle(v.id, associatedToThis)}
                  />
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {v.foto_principal_url ? (
                      <img
                        src={v.foto_principal_url}
                        alt={v.matricula}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold">{v.matricula}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {v.marca} {v.modelo}
                    </p>
                  </div>
                  {associatedToThis && (
                    <Badge variant="default">Já associado</Badge>
                  )}
                  {associatedToOther && (
                    <Badge variant="secondary" title={otherOwnerName ?? ""}>
                      Outro proprietário
                    </Badge>
                  )}
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0 || associate.isPending}
          >
            {associate.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Associar {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
