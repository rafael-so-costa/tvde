import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Truck, History, Car } from "lucide-react";
import { ConfigurationTab } from "@/components/checklist/ConfigurationTab";
import { OperationTab } from "@/components/checklist/OperationTab";
import { DeliveriesTab } from "@/components/checklist/DeliveriesTab";
import { HistoryTab } from "@/components/checklist/HistoryTab";

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState("operation");

  return (
    <AppLayout title="Check-list" subtitle="Gestão de entregas e recolhas de veículos">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="w-4 h-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="operation" className="gap-2">
            <Truck className="w-4 h-4" />
            Operação
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2">
            <Car className="w-4 h-4" />
            Entrega de Veículos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigurationTab />
        </TabsContent>
        <TabsContent value="operation">
          <OperationTab />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
