import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useCallback } from "react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { TemplateEditorToolbar } from "./TemplateEditorToolbar";
import { TemplateFieldsSidebar } from "./TemplateFieldsSidebar";
import { DynamicProfileFields } from "./DynamicProfileFields";
import {
  Tabs as SidebarTabs,
  TabsList as SidebarTabsList,
  TabsTrigger as SidebarTabsTrigger,
  TabsContent as SidebarTabsContent,
} from "@/components/ui/tabs";
import { Sparkles, List, PanelRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Save,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContractTemplate, ContractField } from "@/types/contract";
import { detectFields } from "@/hooks/useTemplatesContrato";
import { getFieldMeta } from "@/utils/contractFieldCategories";
import { Pencil, Trash2 } from "lucide-react";

interface TemplateEditorProps {
  template: ContractTemplate | null;
  onSave: (template: Partial<ContractTemplate>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function TemplateEditor({
  template,
  onSave,
  onClose,
  isLoading,
}: TemplateEditorProps) {
  const [templateName, setTemplateName] = useState(template?.nome || "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [detectedFields, setDetectedFields] = useState<ContractField[]>(
    template?.campos_detectados || []
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "Comece a escrever seu template de contrato...",
      }),
    ],
    content: template?.conteudo_original || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const fields = detectFields(html);
      setDetectedFields(fields);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-6",
      },
    },
  });

  const hasChanges =
    editor?.getHTML() !== template?.conteudo_original ||
    templateName !== template?.nome;

  const { confirmNavigation, markSaved } = useUnsavedChanges(hasChanges);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasChanges, editor?.getHTML()]);

  const handleAutoSave = useCallback(async () => {
    if (!editor || !template?.id) return;

    try {
      await onSave({
        id: template.id,
        nome: templateName,
        conteudo_original: editor.getHTML(),
        campos_detectados: detectedFields,
      });
      setLastSaved(new Date());
      markSaved();
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [editor, template, templateName, detectedFields, onSave, markSaved]);

  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      await onSave({
        id: template?.id,
        nome: templateName,
        conteudo_original: editor.getHTML(),
        campos_detectados: detectedFields,
      });
      setLastSaved(new Date());
      markSaved();
      toast.success("Template guardado com sucesso");
    } catch (error) {
      toast.error("Erro ao guardar template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      confirmNavigation(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };

  const insertField = (fieldName: string) => {
    if (!editor) return;
    const meta = getFieldMeta(fieldName);

    editor
      .chain()
      .focus()
      .insertContent(
        `<span class="template-field" data-field="${fieldName}" data-category="${meta.category}" title="${meta.tooltip}" contenteditable="false">{{${fieldName}}}</span>&nbsp;`
      )
      .run();
  };

  // Click-to-act popover for inserted fields
  const [fieldMenu, setFieldMenu] = useState<{
    x: number;
    y: number;
    fieldName: string;
    el: HTMLElement;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        ".template-field"
      ) as HTMLElement | null;
      if (!target) {
        setFieldMenu(null);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const rect = target.getBoundingClientRect();
      setFieldMenu({
        x: rect.left,
        y: rect.bottom + 4,
        fieldName: target.getAttribute("data-field") || "",
        el: target,
      });
    };

    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-field-menu]")) return;
      if (t.closest?.(".template-field")) return;
      setFieldMenu(null);
    };

    dom.addEventListener("click", onClick);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      dom.removeEventListener("click", onClick);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [editor]);

  const handleRemoveField = () => {
    if (!fieldMenu || !editor) return;
    // Find position of the DOM node in the editor and delete it
    const pos = editor.view.posAtDOM(fieldMenu.el, 0);
    if (pos >= 0) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: pos, to: pos + fieldMenu.el.textContent!.length })
        .deleteSelection()
        .run();
    }
    setFieldMenu(null);
  };

  const handleEditField = () => {
    if (!fieldMenu || !editor) return;
    const next = window.prompt(
      "Novo nome do campo dinâmico (sem chavetas):",
      fieldMenu.fieldName
    );
    if (!next) {
      setFieldMenu(null);
      return;
    }
    const normalized = next
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!normalized) return;
    const meta = getFieldMeta(normalized);
    fieldMenu.el.setAttribute("data-field", normalized);
    fieldMenu.el.setAttribute("data-category", meta.category);
    fieldMenu.el.setAttribute("title", meta.tooltip);
    fieldMenu.el.textContent = `{{${normalized}}}`;
    // Trigger editor update
    const html = (editor.view.dom as HTMLElement).innerHTML;
    editor.commands.setContent(html, { emitUpdate: false });
    setFieldMenu(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nome do template"
            className="max-w-xs font-semibold"
            aria-label="Nome do template"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-save indicator */}
          {lastSaved && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Guardado às {lastSaved.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {hasChanges && (
            <span className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Alterações não guardadas</span>
            </span>
          )}

          {/* Mobile fields drawer trigger */}
          {!showPreview && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  <PanelRight className="w-4 h-4" />
                  <span className="hidden xs:inline">Campos</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] sm:w-96 p-0 flex flex-col">
                <SheetHeader className="p-4 border-b shrink-0">
                  <SheetTitle>Campos do Template</SheetTitle>
                </SheetHeader>
                <SidebarTabs defaultValue="dinamicos" className="flex-1 flex flex-col min-h-0">
                  <SidebarTabsList className="grid grid-cols-2 mx-2 mt-2 shrink-0">
                    <SidebarTabsTrigger value="dinamicos" className="gap-1 text-xs">
                      <Sparkles className="w-3 h-3" /> Campos Dinâmicos
                    </SidebarTabsTrigger>
                    <SidebarTabsTrigger value="catalogo" className="gap-1 text-xs">
                      <List className="w-3 h-3" /> Catálogo
                    </SidebarTabsTrigger>
                  </SidebarTabsList>
                  <SidebarTabsContent value="dinamicos" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                    <DynamicProfileFields detectedFields={detectedFields} onInsertField={insertField} />
                  </SidebarTabsContent>
                  <SidebarTabsContent value="catalogo" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                    <TemplateFieldsSidebar detectedFields={detectedFields} onInsertField={insertField} />
                  </SidebarTabsContent>
                </SidebarTabs>
              </SheetContent>
            </Sheet>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showPreview ? "Editar" : "Pré-visualizar"}
            </span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Guardar</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {!showPreview && editor && (
        <TemplateEditorToolbar editor={editor} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ScrollArea className="h-full">
            {showPreview ? (
              <div
                className="prose prose-sm max-w-none p-6"
                dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
              />
            ) : (
              <EditorContent
                editor={editor}
                className={cn("template-editor-content min-h-full")}
              />
            )}
            {fieldMenu && (
              <div
                data-field-menu
                style={{
                  position: "fixed",
                  left: fieldMenu.x,
                  top: fieldMenu.y,
                  zIndex: 60,
                }}
                className="rounded-md border bg-popover text-popover-foreground shadow-md p-1 flex flex-col min-w-[180px]"
              >
                <div className="px-2 py-1 text-[11px] text-muted-foreground border-b mb-1">
                  {getFieldMeta(fieldMenu.fieldName).tooltip}
                </div>
                <button
                  type="button"
                  onClick={handleEditField}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground text-left"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar vínculo
                </button>
                <button
                  type="button"
                  onClick={handleRemoveField}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-destructive hover:text-destructive-foreground text-left text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover campo
                </button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Fields Sidebar with Tabs */}
        {!showPreview && (
          <div className="w-72 border-l bg-muted/20 shrink-0 hidden md:flex flex-col">
            <SidebarTabs defaultValue="dinamicos" className="flex-1 flex flex-col min-h-0">
              <SidebarTabsList className="grid grid-cols-2 mx-2 mt-2 shrink-0">
                <SidebarTabsTrigger value="dinamicos" className="gap-1 text-xs">
                  <Sparkles className="w-3 h-3" />
                  Campos Dinâmicos
                </SidebarTabsTrigger>
                <SidebarTabsTrigger value="catalogo" className="gap-1 text-xs">
                  <List className="w-3 h-3" />
                  Catálogo
                </SidebarTabsTrigger>
              </SidebarTabsList>
              <SidebarTabsContent value="dinamicos" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                <DynamicProfileFields
                  detectedFields={detectedFields}
                  onInsertField={insertField}
                />
              </SidebarTabsContent>
              <SidebarTabsContent value="catalogo" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                <TemplateFieldsSidebar
                  detectedFields={detectedFields}
                  onInsertField={insertField}
                />
              </SidebarTabsContent>
            </SidebarTabs>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-sm shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {detectedFields.length} campo(s) detectado(s)
          </span>
        </div>
        {hasChanges ? (
          <span className="text-yellow-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Alterações pendentes
          </span>
        ) : (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Todas as alterações guardadas
          </span>
        )}
      </div>
    </div>
  );
}
