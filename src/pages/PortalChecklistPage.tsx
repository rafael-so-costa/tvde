import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, History } from "lucide-react";
import { PortalDeliveriesTab } from "@/components/checklist/PortalDeliveriesTab";
import { PortalHistoryTab } from "@/components/checklist/PortalHistoryTab";

export default function PortalChecklistPage() {
  const [activeTab, setActiveTab] = useState("deliveries");

  return (
    <AppLayout title="Check-list" subtitle="Visualização dos check-lists dos seus veículos">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="deliveries" className="gap-2">
            <Car className="w-4 h-4" />
            Entrega de Veículos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries">
          <PortalDeliveriesTab />
        </TabsContent>
        <TabsContent value="history">
          <PortalHistoryTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
