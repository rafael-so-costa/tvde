import { useState } from "react";
import { ChecklistRecord, MediaFile } from "@/types/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Eye, Camera, FileDown, Printer, Mail, Trash2 } from "lucide-react";
import { useChecklistHistory } from "@/hooks/useChecklistHistory";
import { useChecklistItems } from "@/hooks/useChecklistItems";
import { ActionMenu } from "@/components/common/ActionMenu";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { toast } from "sonner";

function downloadElementAsPdf(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) { toast.error("Popup bloqueado. Permita popups para baixar."); return; }
  printWindow.document.write(`
    <html><head><title>${filename}</title>
    <style>body{font-family:sans-serif;padding:20px;font-size:12px}
    h2{text-align:center}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ccc;padding:6px;text-align:left}
    .sig{max-height:80px;border:1px solid #ccc;border-radius:4px}
    ul{margin:0;padding-left:20px}
    .media-thumb{width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ccc}
    .media-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
    </style></head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

export function DeliveriesTab() {
  const { records, removeRecord } = useChecklistHistory();
  const [viewRecord, setViewRecord] = useState<ChecklistRecord | null>(null);
  const [viewMediaRecord, setViewMediaRecord] = useState<ChecklistRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Only show deliveries that have NOT been returned (no linked recolha exists)
  const returnedDeliveryIds = new Set(
    records.filter(r => r.type === "recolha" && r.linkedDeliveryId).map(r => r.linkedDeliveryId)
  );
  const deliveryRecords = records.filter((r) => r.type === "entrega" && !returnedDeliveryIds.has(r.id));

  const handleDownload = (record: ChecklistRecord) => {
    setViewRecord(record);
    setTimeout(() => downloadElementAsPdf("delivery-doc-view", `Entrega_${record.plate}_${record.date}`), 500);
  };

  const handlePrint = (record: ChecklistRecord) => {
    setViewRecord(record);
    setTimeout(() => window.print(), 500);
  };

  const handleEmail = () => toast.info("Funcionalidade de envio por e-mail será integrada em breve.");

  const confirmDelete = () => {
    if (deleteTargetId) {
      removeRecord(deleteTargetId);
      toast.success("Registo eliminado com sucesso");
      setDeleteTargetId(null);
    }
  };

  const getMediaCount = (record: ChecklistRecord) => {
    const m = record.mediaFiles || {};
    return Object.values(m).reduce((s, a) => s + a.length, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🚗 Entregas de Veículos</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveryRecords.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Truck className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhuma entrega registrada ainda.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-12">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryRecords.map((record) => {
                    const mediaCount = getMediaCount(record);
                    return (
                      <TableRow
                        key={record.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setViewRecord(record)}
                      >
                        <TableCell className="font-medium">{record.driverName}</TableCell>
                        <TableCell>{record.plate} - {record.model}</TableCell>
                        <TableCell>
                          <div>{new Date(record.date).toLocaleDateString("pt-PT")}</div>
                          {record.time && <div className="text-xs text-muted-foreground">{record.time}</div>}
                        </TableCell>
                        <TableCell><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Ativo</Badge></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            onView={() => setViewRecord(record)}
                            onEdit={undefined}
                            onDelete={() => setDeleteTargetId(record.id)}
                            showEdit={false}
                            showToggle={false}
                            showView={true}
                            showDelete={true}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document View */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Entrega</span>
              <div className="flex gap-2 print:hidden">
                {viewRecord && getMediaCount(viewRecord) > 0 && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setViewMediaRecord(viewRecord); }}>
                    <Camera className="w-4 h-4" /> Galeria
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => viewRecord && downloadElementAsPdf("delivery-doc-view", `Entrega_${viewRecord.plate}_${viewRecord.date}`)}>
                  <FileDown className="w-4 h-4" /> Baixar
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleEmail}>
                  <Mail className="w-4 h-4" /> Enviar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewRecord && <DeliveryDocumentView record={viewRecord} />}
        </DialogContent>
      </Dialog>

      {/* Media Gallery */}
      <Dialog open={!!viewMediaRecord} onOpenChange={(open) => !open && setViewMediaRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📷 Fotos e Vídeos da Entrega</DialogTitle>
          </DialogHeader>
          {viewMediaRecord && <DeliveryMediaView record={viewMediaRecord} />}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Excluir registo de entrega"
        description="Tem certeza que deseja excluir permanentemente este registo de entrega? Fotos, vídeos e assinaturas serão perdidos. Esta ação não pode ser desfeita."
      />
    </div>
  );
}

function DeliveryMediaView({ record }: { record: ChecklistRecord }) {
  const mediaFiles = record.mediaFiles || {};
  const sections = Object.entries(mediaFiles).filter(([_, files]) => files && files.length > 0);

  // Check if any section has files with valid URLs
  const hasValidMedia = sections.some(([_, files]) => files.some(f => f.dataUrl && f.dataUrl.length > 0));

  if (sections.length === 0 || !hasValidMedia) {
    return <p className="text-center text-muted-foreground py-8">Nenhuma foto ou vídeo disponível</p>;
  }

  return (
    <div className="space-y-6">
      {sections.map(([key, files]) => {
        const label = key === "general" ? "Geral"
          : key.startsWith("item_") ? `Item: ${key.replace("item_", "")}`
          : key.startsWith("damage_") ? `Dano: ${key.replace("damage_", "")}`
          : key.startsWith("part_") ? `Peça: ${key.replace("part_", "")}`
          : key;
        const validFiles = files.filter(f => f.dataUrl && f.dataUrl.length > 0);
        if (validFiles.length === 0) return null;
        return (
          <div key={key} className="space-y-2">
            <h4 className="text-sm font-semibold">{label}</h4>
            <div className="flex gap-3 flex-wrap">
              {validFiles.map(f => (
                <div key={f.id} className="space-y-1">
                  {f.type === "photo" ? (
                    <a href={f.dataUrl} target="_blank" rel="noopener noreferrer">
                      <img src={f.dataUrl} alt={f.name} className="w-32 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" />
                    </a>
                  ) : f.type === "video" ? (
                    <video src={f.dataUrl} controls className="w-48 h-32 rounded-lg border bg-muted" />
                  ) : (
                    <a href={f.dataUrl} target="_blank" rel="noopener noreferrer" className="flex w-32 h-24 rounded-lg border bg-muted items-center justify-center text-xs text-primary hover:bg-muted/80 transition-colors">
                      📄 {f.name}
                    </a>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate w-32">{f.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeliveryDocumentView({ record }: { record: ChecklistRecord }) {
  const { items } = useChecklistItems();
  const checkedItemsList = items.filter((item) => record.checkedItems[item.id]);
  const uncheckedItemsList = items.filter((item) => !record.checkedItems[item.id]);
  const activeDamages = record.damages.filter((d) => d.types.length > 0);

  const renderMediaThumbs = (key: string) => {
    const files = record.mediaFiles?.[key];
    if (!files || files.length === 0) return null;
    const validFiles = files.filter(f => f.dataUrl);
    if (validFiles.length === 0) return null;
    return (
      <div className="media-grid flex gap-2 flex-wrap mt-1">
        {validFiles.map(f => f.type === "photo" ? (
          <img key={f.id} src={f.dataUrl} alt={f.name} className="media-thumb w-20 h-14 object-cover rounded border" />
        ) : f.type === "video" ? (
          <video key={f.id} src={f.dataUrl} className="media-thumb w-20 h-14 rounded border bg-muted" muted />
        ) : null)}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-sm" id="delivery-doc-view">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold">Termo de Entrega de Veículo</h2>
        <p className="text-muted-foreground">Sistema TVDE Pro - Gestão de Frota</p>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <h4 className="font-semibold mb-2">Dados do Motorista</h4>
          <p><strong>Nome:</strong> {record.driverName}</p>
          <p><strong>NIF:</strong> {record.driverNif || "—"}</p>
          <p><strong>Morada:</strong> {record.driverAddress || "—"}</p>
          <p><strong>Email:</strong> {record.driverEmail || "—"}</p>
          <p><strong>Contacto:</strong> {record.driverContact || "—"}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Dados do Veículo</h4>
          <p><strong>Matrícula:</strong> {record.plate}</p>
          <p><strong>Modelo:</strong> {record.model}</p>
          <p><strong>KM:</strong> {record.kmInitial}</p>
          <p><strong>Combustível:</strong> {record.fuelLevel}</p>
        </div>
      </div>

      <div className="p-4 bg-muted/30 rounded-lg">
        <p><strong>Data da Operação:</strong> {new Date(record.date).toLocaleDateString("pt-PT")}</p>
        {record.time && <p><strong>Hora da Operação:</strong> {record.time}</p>}
      </div>

      {renderMediaThumbs("general")}

      <div>
        <h4 className="font-semibold mb-2">Itens Entregues</h4>
        {checkedItemsList.length > 0 ? (
          <ul className="list-inside space-y-1">
            {checkedItemsList.map((item) => (
              <li key={item.id}>
                ✔ {item.name}
                {record.specialFieldValues[`${item.id}_document_type`] && <span className="text-muted-foreground ml-1">({record.specialFieldValues[`${item.id}_document_type`]})</span>}
                {record.specialFieldValues[`${item.id}_expiry_date`] && <span className="text-muted-foreground ml-1">(Val: {record.specialFieldValues[`${item.id}_expiry_date`]})</span>}
                {record.specialFieldValues[`${item.id}_card_number`] && <span className="text-muted-foreground ml-1">(Nº: {record.specialFieldValues[`${item.id}_card_number`]})</span>}
                {renderMediaThumbs(`item_${item.id}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Nenhum item marcado</p>
        )}
      </div>

      {uncheckedItemsList.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Itens Não Entregues</h4>
          <ul className="list-inside space-y-1 text-destructive">
            {uncheckedItemsList.map((item) => <li key={item.id}>✖ {item.name}</li>)}
          </ul>
        </div>
      )}

      {activeDamages.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Danos Identificados</h4>
          <ul className="list-inside space-y-1">
            {activeDamages.map((d) => (
              <li key={d.part}>
                <strong>{d.part}:</strong> {d.types.join(", ")}
                {renderMediaThumbs(`damage_${d.part}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 bg-muted/30 rounded-lg italic text-center">
        "Reconheço que o carro foi me entregue com todos os itens acima mencionados."
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="text-center space-y-2">
          <p className="font-semibold">Assinatura da Empresa</p>
          {record.companySignature && record.companySignature !== "[signature]" ? (
            <img src={record.companySignature} alt="Assinatura empresa" className="max-h-24 mx-auto border rounded sig" />
          ) : (
            <p className="text-muted-foreground">Sem assinatura</p>
          )}
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold">Assinatura do Motorista</p>
          {record.driverSignature && record.driverSignature !== "[signature]" ? (
            <img src={record.driverSignature} alt="Assinatura motorista" className="max-h-24 mx-auto border rounded sig" />
          ) : (
            <p className="text-muted-foreground">Sem assinatura</p>
          )}
        </div>
      </div>

      {/* Security Metadata */}
      {record.securityMetadata && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border text-xs space-y-1">
          <h4 className="font-semibold text-sm mb-2">🔒 Registo de Segurança</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <p>🕒 {record.securityMetadata.timestamp ? new Date(record.securityMetadata.timestamp).toLocaleString("pt-PT") : "—"}</p>
            <p>📱 {record.securityMetadata.deviceType || "—"}</p>
            <p>📍 {record.securityMetadata.latitude ? `${record.securityMetadata.latitude.toFixed(6)}, ${record.securityMetadata.longitude?.toFixed(6)}` : "Não disponível"}</p>
            <p>👤 {record.securityMetadata.operatorName || record.securityMetadata.operatorEmail || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
