import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Car, Fuel } from "lucide-react";
import { ChecklistItem, VehiclePart, CATEGORY_LABELS } from "@/types/checklist";
import { useChecklistItems } from "@/hooks/useChecklistItems";
import { useChecklistItemUsage } from "@/hooks/useChecklistItemUsage";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ConfigurationTab() {
  const { items, addItem, removeItem, archiveItem, updateItem, vehicleParts, addVehiclePart, removeVehiclePart, archiveVehiclePart, updateVehiclePart, fuelLevels, updateFuelLevel } = useChecklistItems();
  const { isItemUsed, isPartUsed } = useChecklistItemUsage();
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletePartId, setDeletePartId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "equipamento" as ChecklistItem["category"],
    replacementValue: "",
    damageValue: "",
    required: false,
  });

  // Vehicle parts state
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<VehiclePart | null>(null);
  const [partForm, setPartForm] = useState({ name: "", damageValue: "" });

  const resetForm = () => {
    setForm({ name: "", category: "equipamento", replacementValue: "", damageValue: "", required: false });
    setEditingItem(null);
  };

  const handleAdd = () => {
    if (!form.name || !form.replacementValue) {
      toast.error("Preencha nome e valor de reposição");
      return;
    }
    addItem({
      id: `custom_${Date.now()}`,
      name: form.name,
      category: form.category,
      replacementValue: Number(form.replacementValue),
      damageValue: Number(form.damageValue) || 0,
      required: form.required,
    });
    resetForm();
    setShowForm(false);
    toast.success("Item adicionado com sucesso");
  };

  const handleEditSave = () => {
    if (!editingItem || !form.name || !form.replacementValue) {
      toast.error("Preencha nome e valor de reposição");
      return;
    }
    updateItem(editingItem.id, {
      name: form.name,
      category: form.category,
      replacementValue: Number(form.replacementValue),
      damageValue: Number(form.damageValue) || 0,
      required: form.required,
    });
    resetForm();
    toast.success("Item atualizado com sucesso");
  };

  const openEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      replacementValue: String(item.replacementValue),
      damageValue: String(item.damageValue),
      required: item.required,
    });
  };

  // Vehicle parts handlers
  const resetPartForm = () => {
    setPartForm({ name: "", damageValue: "" });
    setEditingPart(null);
  };

  const handleAddPart = () => {
    if (!partForm.name || !partForm.damageValue) {
      toast.error("Preencha nome e valor de dano");
      return;
    }
    addVehiclePart({
      id: `part_${Date.now()}`,
      name: partForm.name,
      damageValue: Number(partForm.damageValue),
    });
    resetPartForm();
    setShowPartForm(false);
    toast.success("Parte adicionada com sucesso");
  };

  const handleEditPartSave = () => {
    if (!editingPart || !partForm.name || !partForm.damageValue) {
      toast.error("Preencha nome e valor de dano");
      return;
    }
    updateVehiclePart(editingPart.id, {
      name: partForm.name,
      damageValue: Number(partForm.damageValue),
    });
    resetPartForm();
    toast.success("Parte atualizada com sucesso");
  };

  const openEditPart = (part: VehiclePart) => {
    setEditingPart(part);
    setPartForm({ name: part.name, damageValue: String(part.damageValue) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Items Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">⚙️ Configuração de Itens e Valores</CardTitle>
          <CardDescription>Cadastre itens e seus valores de reposição. Estes valores serão usados automaticamente nas operações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Button variant="outline" onClick={() => { setShowForm(!showForm); resetForm(); }} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Item
            </Button>

            {showForm && (
              <div className="mt-4 p-4 border rounded-lg space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Item *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Tapete do motorista" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ChecklistItem["category"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documentacao">Documentação</SelectItem>
                        <SelectItem value="equipamento">Equipamento Obrigatório</SelectItem>
                        <SelectItem value="acessorio">Acessório</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor de Reposição (€) *</Label>
                    <Input type="number" value={form.replacementValue} onChange={(e) => setForm({ ...form, replacementValue: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Padrão de Dano (€)</Label>
                    <Input type="number" value={form.damageValue} onChange={(e) => setForm({ ...form, damageValue: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: !!v })} />
                  <Label>Item obrigatório</Label>
                </div>
                <Button onClick={handleAdd}>Adicionar Item</Button>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold">Itens Cadastrados ({items.length})</h3>

          {items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor (€)</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        {item.required && <span className="ml-2 text-xs text-destructive">*obrigatório</span>}
                        {item.active === false && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[item.category]}</TableCell>
                      <TableCell className="text-right">€{item.replacementValue.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(item.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhum item cadastrado</div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Parts Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Configuração de Partes do Veículo</CardTitle>
          <CardDescription>Defina as partes do veículo e seus valores de dano para controle de inspeção.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Button variant="outline" onClick={() => { setShowPartForm(!showPartForm); resetPartForm(); }} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Parte
            </Button>

            {showPartForm && (
              <div className="mt-4 p-4 border rounded-lg space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Parte *</Label>
                    <Input value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} placeholder="Ex: Para-choque traseiro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor de Dano (€) *</Label>
                    <Input type="number" value={partForm.damageValue} onChange={(e) => setPartForm({ ...partForm, damageValue: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <Button onClick={handleAddPart}>Adicionar Parte</Button>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold">Partes Cadastradas ({vehicleParts.length})</h3>

          {vehicleParts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parte</TableHead>
                    <TableHead className="text-right">Valor de Dano (€)</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">
                        {part.name}
                        {part.active === false && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">€{part.damageValue.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditPart(part)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletePartId(part.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhuma parte cadastrada</div>
          )}
        </CardContent>
      </Card>

      {/* Fuel Level Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Fuel className="w-5 h-5" /> Configuração de Combustível</CardTitle>
          <CardDescription>Defina os valores de penalização por nível de combustível devolvido abaixo do nível de entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Valor de Penalização (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelLevels.map((fl) => (
                  <TableRow key={fl.level}>
                    <TableCell className="font-medium">{fl.label}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-28 h-8 text-sm ml-auto"
                        value={fl.penaltyValue}
                        onChange={(e) => {
                          updateFuelLevel(fl.level, Number(e.target.value) || 0);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">A penalização é calculada automaticamente com base na diferença entre o nível de entrega e devolução.</p>
        </CardContent>
      </Card>
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ChecklistItem["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="documentacao">Documentação</SelectItem>
                  <SelectItem value="equipamento">Equipamento Obrigatório</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Reposição (€) *</Label>
                <Input type="number" value={form.replacementValue} onChange={(e) => setForm({ ...form, replacementValue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Padrão de Dano (€)</Label>
                <Input type="number" value={form.damageValue} onChange={(e) => setForm({ ...form, damageValue: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: !!v })} />
              <Label>Item obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={!!editingPart} onOpenChange={(open) => !open && resetPartForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parte do Veículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Parte *</Label>
              <Input value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor de Dano (€) *</Label>
              <Input type="number" value={partForm.damageValue} onChange={(e) => setPartForm({ ...partForm, damageValue: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPartForm}>Cancelar</Button>
            <Button onClick={handleEditPartSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && !deleting && setDeleteItemId(null)}
        isDeleting={deleting}
        onConfirm={async () => {
          if (!deleteItemId) return;
          setDeleting(true);
          try {
            const used = await isItemUsed(deleteItemId);
            if (used) {
              archiveItem(deleteItemId);
              toast.success("Item já utilizado em check-lists — marcado como inativo. Não aparecerá em novos check-lists, mas permanece visível no histórico.");
            } else {
              removeItem(deleteItemId);
              toast.success("Item excluído com sucesso");
            }
            setDeleteItemId(null);
          } finally {
            setDeleting(false);
          }
        }}
        title="Excluir item do checklist"
        description="Tem certeza que deseja excluir este item? Se já tiver sido utilizado em algum check-list, será marcado como inativo (preservando o histórico) em vez de eliminado."
      />

      <DeleteConfirmDialog
        open={!!deletePartId}
        onOpenChange={(open) => !open && !deleting && setDeletePartId(null)}
        isDeleting={deleting}
        onConfirm={async () => {
          if (!deletePartId) return;
          setDeleting(true);
          try {
            const part = vehicleParts.find((p) => p.id === deletePartId);
            const used = part ? await isPartUsed(part.name) : false;
            if (used) {
              archiveVehiclePart(deletePartId);
              toast.success("Parte já utilizada em check-lists — marcada como inativa. Não aparecerá em novos check-lists, mas permanece visível no histórico.");
            } else {
              removeVehiclePart(deletePartId);
              toast.success("Parte excluída com sucesso");
            }
            setDeletePartId(null);
          } finally {
            setDeleting(false);
          }
        }}
        title="Excluir parte do veículo"
        description="Tem certeza que deseja excluir esta parte do veículo? Se já tiver sido utilizada em algum check-list, será marcada como inativa (preservando o histórico) em vez de eliminada."
      />
    </div>
  );
}
