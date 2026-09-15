import { ALL_MENUS, MenuKey, PermissionLevel } from "@/hooks/usePermissions";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  value: Record<MenuKey, PermissionLevel>;
  onChange: (value: Record<MenuKey, PermissionLevel>) => void;
}

export function EmployeePermissionsSection({ value, onChange }: Props) {
  const update = (menu: MenuKey, nivel: PermissionLevel) => {
    onChange({ ...value, [menu]: nivel });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Permissões por Menu</h3>
        <p className="text-xs text-muted-foreground">
          Defina o nível de acesso do funcionário a cada módulo do sistema.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
          <span>Menu</span>
          <span className="w-20 text-center">Nenhum</span>
          <span className="w-20 text-center">Visualizar</span>
          <span className="w-20 text-center">Configurar</span>
        </div>
        <div className="divide-y">
          {ALL_MENUS.map((menu) => (
            <div
              key={menu.key}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 items-center text-sm"
            >
              <Label htmlFor={`perm-${menu.key}`} className="font-normal">{menu.label}</Label>
              <RadioGroup
                value={value[menu.key] ?? "nenhum"}
                onValueChange={(v) => update(menu.key, v as PermissionLevel)}
                className="contents"
              >
                <div className="w-20 flex justify-center">
                  <RadioGroupItem value="nenhum" id={`${menu.key}-nenhum`} />
                </div>
                <div className="w-20 flex justify-center">
                  <RadioGroupItem value="visualizar" id={`${menu.key}-visualizar`} />
                </div>
                <div className="w-20 flex justify-center">
                  <RadioGroupItem value="configurar" id={`${menu.key}-configurar`} />
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
