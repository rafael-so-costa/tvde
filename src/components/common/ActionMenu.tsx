import { MoreHorizontal, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
  isActive?: boolean;
  showView?: boolean;
  showEdit?: boolean;
  showToggle?: boolean;
  showDelete?: boolean;
}

export function ActionMenu({
  onView,
  onEdit,
  onToggleActive,
  onDelete,
  isActive = true,
  showView = true,
  showEdit = true,
  showToggle = true,
  showDelete = true,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {showView && onView && (
          <DropdownMenuItem onClick={onView} className="gap-2">
            <Eye className="h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
        )}
        
        {showEdit && onEdit && (
          <DropdownMenuItem onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        
        {(showView || showEdit) && (showToggle || showDelete) && (
          <DropdownMenuSeparator />
        )}
        
        {showToggle && onToggleActive && (
          <DropdownMenuItem onClick={onToggleActive} className="gap-2">
            <Power className="h-4 w-4" />
            {isActive ? "Inativar" : "Ativar"}
          </DropdownMenuItem>
        )}
        
        {showDelete && onDelete && (
          <DropdownMenuItem 
            onClick={onDelete} 
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
