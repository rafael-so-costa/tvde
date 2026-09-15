import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ContractField } from "@/types/contract";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  User,
  Building2,
  Briefcase,
  Users,
  Car,
  FileText,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PROFILE_FIELDS_SCHEMA,
  type ProfileSchemaDef,
} from "@/utils/profileFieldsSchema";

interface TemplateFieldsSidebarProps {
  detectedFields: ContractField[];
  onInsertField: (fieldName: string) => void;
}

const ICONS: Record<ProfileSchemaDef["iconName"], JSX.Element> = {
  User: <User className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Car: <Car className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
};

// Catalogue derived from the single source of truth (profileFieldsSchema).
// Any new profile field automatically appears here.
const fieldCategories = PROFILE_FIELDS_SCHEMA.map((p) => ({
  id: p.key,
  label: p.label,
  icon: ICONS[p.iconName],
  fields: p.fields.map((f) => f.placeholder),
}));

export function TemplateFieldsSidebar({
  detectedFields,
  onInsertField,
}: TemplateFieldsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "motorista",
  ]);
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isFieldDetected = (fieldName: string) => {
    return detectedFields.some((f) => f.name === fieldName);
  };

  const filteredCategories = fieldCategories
    .map((cat) => ({
      ...cat,
      fields: cat.fields.filter((f) =>
        f.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.fields.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Campos Dinâmicos</h3>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar campos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
            aria-label="Pesquisar campos dinâmicos"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map((category) => (
            <Collapsible
              key={category.id}
              open={expandedCategories.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 px-2"
                >
                  {expandedCategories.includes(category.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {category.icon}
                  <span className="text-sm">{category.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {category.fields.length}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-0.5">
                {category.fields.map((fieldName) => {
                  const isDetected = isFieldDetected(fieldName);
                  return (
                    <button
                      key={fieldName}
                      onClick={() => onInsertField(fieldName)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-xs rounded transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                        "flex items-center gap-2",
                        isDetected && "bg-primary/10"
                      )}
                      title={`Inserir {{${fieldName}}}`}
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      <code className="font-mono truncate">{fieldName}</code>
                      {isDetected && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] px-1 py-0"
                        >
                          Em uso
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* Detected Fields Summary */}
      <div className="p-3 border-t shrink-0">
        <p className="text-xs text-muted-foreground mb-2">
          Campos no documento:
        </p>
        <div className="flex flex-wrap gap-1">
          {detectedFields.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Nenhum campo detectado
            </p>
          ) : (
            detectedFields.slice(0, 5).map((field) => (
              <Badge
                key={field.id}
                variant="secondary"
                className="text-xs font-mono"
              >
                {field.name}
              </Badge>
            ))
          )}
          {detectedFields.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{detectedFields.length - 5}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile: Collapsible overlay
  if (isMobile) {
    if (!isOpen) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-2"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Campos
        </Button>
      );
    }

    return (
      <div className="fixed inset-y-0 right-0 w-64 bg-background border-l shadow-lg z-50">
        {sidebarContent}
      </div>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <div className="w-64 border-l bg-muted/20 shrink-0">{sidebarContent}</div>
  );
}
