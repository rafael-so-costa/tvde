import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Euro,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  Send,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  invoiceNumber: string;
  driver: string;
  vehicle: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  paymentMethod?: "card" | "transfer" | "mbway" | "multibanco";
}

const mockPayments: Payment[] = [
  {
    id: "1",
    invoiceNumber: "FAT-2024-001",
    driver: "Carlos Santos",
    vehicle: "AB-12-CD",
    amount: 450,
    dueDate: "2024-01-31",
    paidDate: "2024-01-28",
    status: "paid",
    paymentMethod: "mbway",
  },
  {
    id: "2",
    invoiceNumber: "FAT-2024-002",
    driver: "Maria Silva",
    vehicle: "EF-34-GH",
    amount: 400,
    dueDate: "2024-01-31",
    paidDate: "2024-01-30",
    status: "paid",
    paymentMethod: "card",
  },
  {
    id: "3",
    invoiceNumber: "FAT-2024-003",
    driver: "António Costa",
    vehicle: "IJ-56-KL",
    amount: 550,
    dueDate: "2024-02-05",
    status: "pending",
  },
  {
    id: "4",
    invoiceNumber: "FAT-2024-004",
    driver: "Pedro Almeida",
    vehicle: "MN-78-OP",
    amount: 380,
    dueDate: "2024-01-20",
    status: "overdue",
  },
  {
    id: "5",
    invoiceNumber: "FAT-2024-005",
    driver: "João Ferreira",
    vehicle: "QR-90-ST",
    amount: 420,
    dueDate: "2024-02-10",
    status: "pending",
  },
  {
    id: "6",
    invoiceNumber: "FAT-2023-156",
    driver: "Rui Oliveira",
    vehicle: "UV-12-WX",
    amount: 400,
    dueDate: "2023-12-31",
    status: "cancelled",
  },
];

const statusConfig = {
  paid: {
    label: "Pago",
    icon: CheckCircle,
    class: "badge-success",
    iconClass: "text-success",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    class: "badge-warning",
    iconClass: "text-warning",
  },
  overdue: {
    label: "Em Atraso",
    icon: XCircle,
    class: "badge-destructive",
    iconClass: "text-destructive",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    class: "bg-muted text-muted-foreground",
    iconClass: "text-muted-foreground",
  },
};

const paymentMethodLabels = {
  card: "Cartão",
  transfer: "Transferência",
  mbway: "MB Way",
  multibanco: "Multibanco",
};

export default function Payments() {
  const totalReceived = mockPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPending = mockPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalOverdue = mockPayments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppLayout title="Pagamentos" subtitle="Gerir faturas e pagamentos">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recebido (Mês)</p>
              <p className="text-2xl font-bold text-success">€{totalReceived}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-2xl font-bold text-warning">€{totalPending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Em Atraso</p>
              <p className="text-2xl font-bold text-destructive">€{totalOverdue}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Faturas</p>
              <p className="text-2xl font-bold text-primary">{mockPayments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="paid">Pagos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="overdue">Em Atraso</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button className="btn-accent">
            <Plus className="w-4 h-4 mr-2" />
            Nova Fatura
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Fatura
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Motorista
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Veículo
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Valor
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Vencimento
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Método
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((payment, index) => {
                const status = statusConfig[payment.status];
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={payment.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Euro className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{payment.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {payment.driver}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {payment.vehicle}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-lg">€{payment.amount}</span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {new Date(payment.dueDate).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn("inline-flex items-center gap-1", status.class)}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {payment.paymentMethod
                        ? paymentMethodLabels[payment.paymentMethod]
                        : "-"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {payment.status === "pending" && (
                          <Button variant="ghost" size="sm">
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
