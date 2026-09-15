import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  User,
  Building2,
  Car,
  Briefcase,
  Users,
  FileText,
  Plus,
  Search,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNATURE_FIELDS } from "@/utils/contractSignatures";
import {
  PROFILE_FIELDS_SCHEMA,
  type ProfileFieldDef,
  type ProfileKey,
  type ProfileSchemaDef,
} from "@/utils/profileFieldsSchema";
import type { ContractField } from "@/types/contract";

interface DynamicProfileFieldsProps {
  detectedFields: ContractField[];
  onInsertField: (placeholder: string) => void;
}

const ICONS: Record<ProfileSchemaDef["iconName"], React.ReactNode> = {
  User: <User className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Car: <Car className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
};

function normalizeCustomName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function DynamicProfileFields({
  detectedFields,
  onInsertField,
}: DynamicProfileFieldsProps) {
  const profiles = PROFILE_FIELDS_SCHEMA;
  const [activeProfile, setActiveProfile] = useState<ProfileKey>(
    profiles[0]?.key ?? "motorista"
  );
  const [search, setSearch] = useState("");
  const [customFieldName, setCustomFieldName] = useState("");

  const isDetected = (placeholder: string) =>
    detectedFields.some((f) => f.name.toUpperCase() === placeholder.toUpperCase());

  const renderFieldList = (fields: ProfileFieldDef[]) => {
    const filtered = fields.filter(
      (f) =>
        !search ||
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.placeholder.toLowerCase().includes(search.toLowerCase())
    );

    if (filtered.length === 0) {
      return (
        <p className="text-xs text-muted-foreground italic px-2 py-4 text-center">
          Nenhum campo encontrado
        </p>
      );
    }

    return filtered.map((field) => {
      const detected = isDetected(field.placeholder);
      return (
        <button
          key={field.placeholder}
          type="button"
          onClick={() => onInsertField(field.placeholder)}
          className={cn(
            "w-full text-left px-2 py-2 text-xs rounded transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
            "flex items-center gap-2 border border-transparent",
            detected && "bg-primary/10 border-primary/20"
          )}
          title={`Inserir {{${field.placeholder}}}`}
        >
          <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{field.label}</div>
            <code className="text-[10px] text-muted-foreground font-mono truncate block">
              {`{{${field.placeholder}}}`}
            </code>
          </div>
          {detected && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
              Em uso
            </Badge>
          )}
        </button>
      );
    });
  };

  const handleAddCustomField = () => {
    const normalized = normalizeCustomName(customFieldName);
    if (!normalized) return;
    onInsertField(normalized);
    setCustomFieldName("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold text-sm mb-2">Campos Dinâmicos por Perfil</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Lista gerada automaticamente a partir do schema real de cada perfil.
          Clique num campo para inseri-lo no contrato.
        </p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar campos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <Tabs
        value={activeProfile}
        onValueChange={(v) => setActiveProfile(v as ProfileKey)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList
          className="mx-2 mt-2 h-auto p-1 shrink-0 grid"
          style={{ gridTemplateColumns: `repeat(${profiles.length + 1}, minmax(0, 1fr))` }}
        >
          {profiles.map((p) => (
            <TabsTrigger
              key={p.key}
              value={p.key}
              className="flex-col gap-1 py-2 px-1 h-auto text-[10px]"
              title={p.label}
            >
              {ICONS[p.iconName]}
              <span className="hidden xl:inline">{p.label}</span>
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="assinaturas"
            className="flex-col gap-1 py-2 px-1 h-auto text-[10px]"
            title="Assinaturas"
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden xl:inline">Assinaturas</span>
          </TabsTrigger>
        </TabsList>

        {profiles.map((p) => (
          <TabsContent
            key={p.key}
            value={p.key}
            className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden"
          >
            <div className="px-3 pb-2">
              <p className="text-[11px] text-muted-foreground">{p.description}</p>
            </div>
            <ScrollArea className="h-full">
              <div className="px-2 pb-4 space-y-1">
                {renderFieldList(p.fields)}

                {p.key === "contrato" && (
                  <div className="p-2 border rounded-md bg-muted/30 space-y-2 mt-2">
                    <p className="text-[11px] font-semibold">Campo personalizado</p>
                    <div className="flex gap-1">
                      <Input
                        value={customFieldName}
                        onChange={(e) => setCustomFieldName(e.target.value)}
                        placeholder="Ex: Multa por atraso"
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomField();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleAddCustomField}
                        disabled={!customFieldName.trim()}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    {customFieldName.trim() && (
                      <code className="text-[10px] text-muted-foreground font-mono block">
                        {`{{${normalizeCustomName(customFieldName)}}}`}
                      </code>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}

        <TabsContent
          value="assinaturas"
          className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden"
        >
          <div className="px-3 pb-2">
            <p className="text-[11px] text-muted-foreground">
              Insira campos de assinatura no contrato. Durante a criação,
              o sistema abrirá uma área de assinatura para cada um.
            </p>
          </div>
          <ScrollArea className="h-full">
            <div className="px-2 pb-4 space-y-1">
              {renderFieldList(
                SIGNATURE_FIELDS.map((s) => ({
                  label: s.label,
                  placeholder: s.placeholder,
                }))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
