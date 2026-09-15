import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock data for tenants
const mockTenants = [
  {
    id: "1",
    nome_empresa: "TVDE Lisboa Lda",
    nif: "123456789",
    email: "admin@tvdelisboa.pt",
    telemovel: "912345678",
    nome_gerente: "António Silva",
    ativo: true,
    status: "approved",
    veiculos_count: 15,
    motoristas_count: 20,
    created_at: "2024-01-15",
  },
  {
    id: "2",
    nome_empresa: "Porto Rides SA",
    nif: "987654321",
    email: "geral@portorides.pt",
    telemovel: "961234567",
    nome_gerente: "Maria Costa",
    ativo: true,
    status: "approved",
    veiculos_count: 8,
    motoristas_count: 12,
    created_at: "2024-01-10",
  },
  {
    id: "3",
    nome_empresa: "Algarve Drivers",
    nif: "456789123",
    email: "info@algarvedrivers.pt",
    telemovel: "934567890",
    nome_gerente: "João Santos",
    ativo: false,
    status: "pending",
    veiculos_count: 0,
    motoristas_count: 0,
    created_at: "2024-01-22",
  },
];

export default function Tenants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ativos");

  const filteredTenants = mockTenants.filter((tenant) => {
    const matchesSearch =
      tenant.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.nif.includes(searchQuery) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "ativos") return matchesSearch && tenant.ativo && tenant.status === "approved";
    if (activeTab === "pendentes") return matchesSearch && tenant.status === "pending";
    if (activeTab === "inativos") return matchesSearch && !tenant.ativo;
    return matchesSearch;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const activeCount = mockTenants.filter((t) => t.ativo && t.status === "approved").length;
  const pendingCount = mockTenants.filter((t) => t.status === "pending").length;
  const inactiveCount = mockTenants.filter((t) => !t.ativo).length;

  return (
    <AppLayout title="Empresas" subtitle="Gestão de empresas gestoras (tenants)">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Empresas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-sm text-muted-foreground">Empresas Inativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar empresas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="btn-accent gap-2">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ativos">
              Ativas ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="pendentes">
              Pendentes ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="inativos">
              Inativas ({inactiveCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTenants.map((tenant) => (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {getInitials(tenant.nome_empresa)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{tenant.nome_empresa}</CardTitle>
                          <CardDescription>
                            NIF: {tenant.nif} | Gerente: {tenant.nome_gerente}
                          </CardDescription>
                        </div>
                      </div>
                      <ActionMenu
                        onView={() => console.log("View", tenant.id)}
                        onEdit={() => console.log("Edit", tenant.id)}
                        onToggleActive={() => console.log("Toggle", tenant.id)}
                        onDelete={() => console.log("Delete", tenant.id)}
                        isActive={tenant.ativo}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="outline">{tenant.email}</Badge>
                      <Badge variant="outline">{tenant.telemovel}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">
                          <strong>{tenant.veiculos_count}</strong> veículos
                        </span>
                        <span className="text-muted-foreground">
                          <strong>{tenant.motoristas_count}</strong> motoristas
                        </span>
                      </div>
                      {tenant.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600">
                            Rejeitar
                          </Button>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600">
                            Aprovar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredTenants.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">Nenhuma empresa encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Tente ajustar os critérios de pesquisa"
                      : "Nenhuma empresa nesta categoria"}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
