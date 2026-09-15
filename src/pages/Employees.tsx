import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Funcionario, isSubstituicaoAtivaHoje, useDeleteFuncionario, useFuncionarios, useToggleFuncionarioAtivo } from "@/hooks/useFuncionarios";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeDetailsDialog } from "@/components/employees/EmployeeDetailsDialog";

const tipoLabels: Record<string, string> = {
  gerente_geral: "Gerente Geral",
  gestor_frota: "Gestor de Frota",
  administrativo_financas: "Administrativo/Finanças",
};

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ativos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [viewing, setViewing] = useState<Funcionario | null>(null);

  const { data: employees = [], isLoading } = useFuncionarios();
  const toggleActive = useToggleFuncionarioAtivo();
  const remove = useDeleteFuncionario();

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "ativos" ? emp.ativo : !emp.ativo;
    return matchesSearch && matchesTab;
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleNew = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (e: Funcionario) => { setEditing(e); setFormOpen(true); };
  const handleView = (e: Funcionario) => { setViewing(e); setDetailsOpen(true); };

  return (
    <AppLayout title="Funcionários" subtitle="Gestão de equipa e permissões">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar funcionários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Funcionário
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ativos">
              Ativos ({employees.filter((e) => e.ativo).length})
            </TabsTrigger>
            <TabsTrigger value="inativos">
              Inativos ({employees.filter((e) => !e.ativo).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">A carregar…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleView(employee)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            {employee.foto_perfil_url && (
                              <img src={employee.foto_perfil_url} alt={employee.nome} className="h-full w-full object-cover" />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(employee.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{[employee.nome, employee.sobrenome].filter(Boolean).join(" ")}</CardTitle>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            onEdit={() => handleEdit(employee)}
                            onToggleActive={() => toggleActive.mutate({ id: employee.id, ativo: !employee.ativo })}
                            onDelete={() => {
                              if (confirm(`Remover ${employee.nome}?`)) remove.mutate(employee.id);
                            }}
                            isActive={employee.ativo}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <Badge variant="outline">{tipoLabels[employee.tipo] || employee.tipo}</Badge>
                      {isSubstituicaoAtivaHoje(employee) && (() => {
                        const sub = employees.find((f) => f.id === employee.substituto_id);
                        const subNome = sub ? [sub.nome, sub.sobrenome].filter(Boolean).join(" ") : "outro funcionário";
                        return (
                          <div className="text-xs text-muted-foreground italic">
                            Substituído por <span className="font-medium text-foreground not-italic">{subNome}</span>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}

                {filteredEmployees.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">Nenhum funcionário encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Tente ajustar os critérios de pesquisa" : "Comece adicionando um novo funcionário"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} funcionario={editing} />
      <EmployeeDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} funcionario={viewing} />
    </AppLayout>
  );
}
