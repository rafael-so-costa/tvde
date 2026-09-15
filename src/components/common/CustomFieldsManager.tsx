import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Calendar, Pencil, Save, Sparkles } from "lucide-react";
import { format, isBefore, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  EntidadeTipo,
  useCamposPersonalizados,
  useCreateCampoPersonalizado,
  useUpdateCampoPersonalizado,
  useDeleteCampoPersonalizado,
} from "@/hooks/useCamposPersonalizados";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";

const SUGESTOES: Record<EntidadeTipo, string[]> = {
  funcionario: [
    "Número de Colaborador",
    "Departamento",
    "Cargo Interno",
    "Data de Admissão",
    "Certificado de Formação",
    "Vacina",
  ],
  motorista: [
    "Cartão TVDE",
    "Cartão Tachógrafo",
    "Curso de Condução Defensiva",
    "Atestado Médico",
    "Visto / Autorização Trabalho",
  ],
  veiculo: [
    "Selo / IUC",
    "Inspeção Periódica (IPO)",
    "Seguro - Apólice",
    "Carta Verde",
    "Licença TVDE Veículo",
    "Pneus - Última Substituição",
  ],
  empresa: [
    "Alvará",
    "Certidão de Não Dívida",
    "Seguro de Responsabilidade Civil",
    "Licença Municipal",
  ],
  proprietario: [
    "Procuração",
    "Comprovativo IBAN",
    "Comprovativo Morada",
    "Cartão TVDE Proprietário",
  ],
};

interface Props {
  entidadeTipo: EntidadeTipo;
  entidadeId: string | null;
  readOnly?: boolean;
  title?: string;
}

export function CustomFieldsManager({
  entidadeTipo,
  entidadeId,
  readOnly = false,
  title = "Informação Adicional",
}: Props) {
  const { data: campos = [], isLoading } = useCamposPersonalizados(entidadeTipo, entidadeId);
  const createMut = useCreateCampoPersonalizado();
  const updateMut = useUpdateCampoPersonalizado();
  const deleteMut = useDeleteCampoPersonalizado();

  const [selectedNome, setSelectedNome] = useState("");
  const [customNome, setCustomNome] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [valor, setValor] = useState("");
  const [dataVenc, setDataVenc] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editData, setEditData] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sugestoesBase = SUGESTOES[entidadeTipo] ?? [];
  const tiposExistentes = Array.from(new Set(campos.map((c) => c.nome_campo)));
  const allTypes = Array.from(new Set([...sugestoesBase, ...tiposExistentes]));

  const handleAdd = async () => {
    if (!entidadeId) return;
    const nome = isCustom ? customNome.trim() : selectedNome;
    if (!nome) {
      toast.error("Selecione ou crie um nome de campo");
      return;
    }
    try {
      await createMut.mutateAsync({
        entidade_tipo: entidadeTipo,
        entidade_id: entidadeId,
        nome_campo: nome,
        valor: valor.trim() || null,
        data_vencimento: dataVenc || null,
      });
      setSelectedNome("");
      setCustomNome("");
      setIsCustom(false);
      setValor("");
      setDataVenc("");
    } catch {
      // tratado no hook
    }
  };

  const startEdit = (id: string, valorAtual: string | null, data: string | null) => {
    setEditId(id);
    setEditValor(valorAtual ?? "");
    setEditData(data ?? "");
  };

  const saveEdit = async (id: string) => {
    if (!entidadeId) return;
    await updateMut.mutateAsync({
      id,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      valor: editValor.trim() || null,
      data_vencimento: editData || null,
    });
    setEditId(null);
  };

  const isExpired = (date: string | null) =>
    !!date && isBefore(parseISO(date), new Date());

  if (!entidadeId) {
    return (
      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        Guarde o perfil primeiro para adicionar informação adicional.
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-muted rounded-lg space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {title}
        </h4>

        {!readOnly && (
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              {!isCustom ? (
                <>
                  <div className="flex-1 space-y-2">
                    <Label>Nome do Campo</Label>
                    <Select value={selectedNome} onValueChange={setSelectedNome}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCustom(true)}
                    title="Criar novo campo"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-2">
                    <Label>Novo Nome do Campo</Label>
                    <Input
                      value={customNome}
                      onChange={(e) => setCustomNome(e.target.value)}
                      placeholder="Ex: Cartão Sindicato"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsCustom(false);
                      setCustomNome("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (opcional)</Label>
                <Input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex: ABC-123"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento (opcional)</Label>
                <Input
                  type="date"
                  value={dataVenc}
                  onChange={(e) => setDataVenc(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAdd}
              disabled={createMut.isPending || (!selectedNome && !customNome.trim())}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createMut.isPending ? "A adicionar..." : "Adicionar Campo"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">A carregar...</div>
        ) : campos.length > 0 ? (
          <div className="space-y-2 mt-4">
            {campos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    <Badge variant="secondary">{c.nome_campo}</Badge>
                    {c.data_vencimento && (
                      <Badge
                        variant={isExpired(c.data_vencimento) ? "destructive" : "outline"}
                        className="gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(c.data_vencimento), "dd/MM/yyyy", { locale: pt })}
                      </Badge>
                    )}
                  </div>
                  {editId === c.id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <Input
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                        placeholder="Valor"
                      />
                      <Input
                        type="date"
                        value={editData}
                        onChange={(e) => setEditData(e.target.value)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground truncate">
                      {c.valor || <span className="italic">— sem valor —</span>}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-1 flex-shrink-0">
                    {editId === c.id ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => saveEdit(c.id)}
                          disabled={updateMut.isPending}
                          title="Guardar"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditId(null)}
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(c.id, c.valor, c.data_vencimento)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(c.id)}
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum campo adicional registado.
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId && entidadeId) {
            deleteMut.mutate({
              id: deleteId,
              entidade_tipo: entidadeTipo,
              entidade_id: entidadeId,
            });
            setDeleteId(null);
          }
        }}
        title="Remover campo"
        description="Tem a certeza que deseja remover este campo? Esta ação não pode ser desfeita."
      />
    </>
  );
}
