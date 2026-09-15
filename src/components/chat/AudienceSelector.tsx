import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, ListChecks } from "lucide-react";
import { useAudienciaUsers } from "@/hooks/useCampanhas";
import { useListasTransmissao } from "@/hooks/useListasTransmissao";
import type { PublicoTipo, EscopoCampanha } from "@/hooks/useCampanhas";

interface Props {
  publicoTipo: PublicoTipo;
  onPublicoTipoChange: (v: PublicoTipo) => void;
  filtroAtivo: boolean | null;
  onFiltroAtivoChange: (v: boolean | null) => void;
  destinatariosIds: string[];
  onDestinatariosChange: (ids: string[]) => void;
  /** Se "interno", restringe a opções aplicáveis (funcionários/específicos). */
  escopo?: EscopoCampanha;
  /** Lista de transmissão selecionada (quando publicoTipo === "lista"). */
  listaId?: string | null;
  onListaChange?: (id: string | null) => void;
  /** Abrir gestor de listas. */
  onManageLists?: () => void;
}

export function AudienceSelector({
  publicoTipo, onPublicoTipoChange,
  filtroAtivo, onFiltroAtivoChange,
  destinatariosIds, onDestinatariosChange,
  escopo = "externo",
  listaId, onListaChange, onManageLists,
}: Props) {
  const { data: users = [] } = useAudienciaUsers();
  const { data: listas = [] } = useListasTransmissao();

  const options = useMemo(() => {
    if (escopo === "interno") {
      return [
        { v: "funcionarios", l: "Todos os funcionários" },
        { v: "especificos", l: "Específicos" },
      ] as const;
    }
    return [
      { v: "motoristas", l: "Motoristas" },
      { v: "proprietarios", l: "Proprietários" },
      { v: "funcionarios", l: "Funcionários" },
      { v: "ambos", l: "Motoristas + Proprietários" },
      { v: "todos", l: "Todos (M+P+F)" },
      { v: "lista", l: "Lista de transmissão" },
      { v: "especificos", l: "Específicos" },
    ] as const;
  }, [escopo]);

  // Restrict the "específicos" picker list to the relevant pool
  const pickerUsers = useMemo(() => {
    if (escopo === "interno") return users.filter((u) => u.tipo === "funcionario");
    return users;
  }, [users, escopo]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (publicoTipo === "motoristas" && u.tipo !== "motorista") return false;
      if (publicoTipo === "proprietarios" && u.tipo !== "proprietario") return false;
      if (publicoTipo === "funcionarios" && u.tipo !== "funcionario") return false;
      if (publicoTipo === "ambos" && u.tipo === "funcionario") return false;
      if (filtroAtivo !== null && u.ativo !== filtroAtivo) return false;
      return true;
    });
  }, [users, publicoTipo, filtroAtivo]);

  const selectedLista = useMemo(
    () => (listaId ? listas.find((l) => l.id === listaId) : null),
    [listaId, listas]
  );

  const count =
    publicoTipo === "especificos"
      ? destinatariosIds.length
      : publicoTipo === "lista"
        ? (selectedLista?.destinatarios_ids?.length ?? 0)
        : filtered.length;

  const toggle = (id: string) => {
    onDestinatariosChange(
      destinatariosIds.includes(id)
        ? destinatariosIds.filter((x) => x !== id)
        : [...destinatariosIds, id]
    );
  };

  const tipoBadge = (t: "motorista" | "proprietario" | "funcionario") =>
    t === "motorista" ? "M" : t === "proprietario" ? "P" : "F";

  return (
    <div className="space-y-3">
      <div>
        <Label>Público alvo</Label>
        <RadioGroup
          value={publicoTipo}
          onValueChange={(v) => onPublicoTipoChange(v as PublicoTipo)}
          className="grid grid-cols-2 gap-2 mt-2"
        >
          {options.map((o) => (
            <label key={o.v} className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value={o.v} />
              <span className="text-sm">{o.l}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {publicoTipo !== "especificos" && publicoTipo !== "lista" && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm">Apenas utilizadores ativos</Label>
            <p className="text-xs text-muted-foreground">Desativa para incluir todos</p>
          </div>
          <Switch
            checked={filtroAtivo === true}
            onCheckedChange={(v) => onFiltroAtivoChange(v ? true : null)}
          />
        </div>
      )}

      {publicoTipo === "lista" && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-1">
              <ListChecks className="w-4 h-4" /> Lista de transmissão
            </Label>
            {onManageLists && (
              <Button type="button" size="sm" variant="outline" onClick={onManageLists}>
                <Settings2 className="w-3 h-3 mr-1" /> Gerir listas
              </Button>
            )}
          </div>
          {listas.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Ainda não existem listas. Clique em "Gerir listas" para criar.
            </p>
          ) : (
            <Select
              value={listaId ?? ""}
              onValueChange={(v) => onListaChange?.(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                {listas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome} ({l.destinatarios_ids?.length ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {publicoTipo === "especificos" && (
        <div>
          <Label>Selecionar destinatários</Label>
          <ScrollArea className="h-48 border rounded-md mt-2 p-2">
            {pickerUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">Sem utilizadores disponíveis</p>
            ) : (
              <ul className="space-y-1">
                {pickerUsers.map((u) => (
                  <li key={u.user_id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={destinatariosIds.includes(u.user_id)}
                      onCheckedChange={() => toggle(u.user_id)}
                    />
                    <span className="text-sm flex-1 truncate">{u.nome}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {tipoBadge(u.tipo)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <Badge variant="secondary">{count}</Badge> destinatário(s) serão atingidos
      </div>
    </div>
  );
}
