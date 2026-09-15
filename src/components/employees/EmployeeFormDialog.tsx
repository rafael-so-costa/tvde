import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ALL_MENUS, MenuKey, PermissionLevel } from "@/hooks/usePermissions";
import { Funcionario, useFuncionarioPermissoes, useFuncionarios, useSaveFuncionario, useUpdateFuncionarioProfile } from "@/hooks/useFuncionarios";
import { EmployeePermissionsSection } from "./EmployeePermissionsSection";
import { AusenciasTab } from "./AusenciasTab";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionario?: Funcionario | null;
}

const TIPO_OPTIONS = [
  { value: "gerente_geral", label: "Gerente Geral" },
  { value: "gestor_frota", label: "Gestor de Frota" },
  { value: "administrativo_financas", label: "Administrativo/Finanças" },
];

function emptyPerms(): Record<MenuKey, PermissionLevel> {
  return ALL_MENUS.reduce((acc, m) => ({ ...acc, [m.key]: "nenhum" as PermissionLevel }), {} as Record<MenuKey, PermissionLevel>);
}

export function EmployeeFormDialog({ open, onOpenChange, funcionario }: Props) {
  const isEdit = !!funcionario;
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("gestor_frota");
  const [perms, setPerms] = useState<Record<MenuKey, PermissionLevel>>(emptyPerms());

  // Substituição
  const [subAtiva, setSubAtiva] = useState(false);
  const [substitutoId, setSubstitutoId] = useState<string>("");
  const [subInicio, setSubInicio] = useState<string>("");
  const [subFim, setSubFim] = useState<string>("");

  const { data: existingPerms } = useFuncionarioPermissoes(funcionario?.id ?? null);
  const { data: allFuncionarios = [] } = useFuncionarios();
  const save = useSaveFuncionario();
  const updateProfile = useUpdateFuncionarioProfile();

  useEffect(() => {
    if (open) {
      setNome(funcionario?.nome ?? "");
      setEmail(funcionario?.email ?? "");
      setPassword("");
      setTipo(funcionario?.tipo ?? "gestor_frota");
      setSubAtiva(funcionario?.substituicao_ativa ?? false);
      setSubstitutoId(funcionario?.substituto_id ?? "");
      setSubInicio(funcionario?.substituicao_inicio ?? "");
      setSubFim(funcionario?.substituicao_fim ?? "");
      if (!funcionario) setPerms(emptyPerms());
    }
  }, [open, funcionario]);

  useEffect(() => {
    if (existingPerms) {
      const map = emptyPerms();
      existingPerms.forEach((p) => { map[p.menu_key as MenuKey] = p.nivel; });
      setPerms(map);
    }
  }, [existingPerms]);

  const handleSave = async () => {
    if (!nome || !email) return;
    if (!isEdit && !password) return;
    await save.mutateAsync({
      funcionario_id: funcionario?.id,
      nome, email, password: password || undefined, tipo,
      permissoes: ALL_MENUS.map((m) => ({ menu_key: m.key, nivel: perms[m.key] })),
    });

    // Substituição (apenas em edição — funcionário tem id)
    if (isEdit && funcionario) {
      await updateProfile.mutateAsync({
        id: funcionario.id,
        updates: {
          substituicao_ativa: subAtiva,
          substituto_id: subAtiva ? (substitutoId || null) : null,
          substituicao_inicio: subAtiva && subInicio ? subInicio : null,
          substituicao_fim: subAtiva && subFim ? subFim : null,
        } as Partial<Funcionario>,
      });
    }

    onOpenChange(false);
  };

  const possiveisSubstitutos = allFuncionarios.filter(
    (f) => f.id !== funcionario?.id && f.ativo,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            {isEdit && <TabsTrigger value="ausencias">Ausências</TabsTrigger>}
          </TabsList>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isEdit ? "Nova senha (opcional)" : "Senha *"}</Label>
              <Input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
              />
              <p className="text-xs text-muted-foreground">
                O funcionário fará login pela opção "Gestor de Frota".
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="pt-4">
            <EmployeePermissionsSection value={perms} onChange={setPerms} />
          </TabsContent>

          {isEdit && funcionario && (
            <TabsContent value="ausencias">
              <AusenciasTab funcionarioId={funcionario.id} todosFuncionarios={allFuncionarios} />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || updateProfile.isPending}>
            {(save.isPending || updateProfile.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
