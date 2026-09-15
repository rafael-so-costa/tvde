import { useState, useMemo } from "react";
import { ChecklistRecord, MediaFile } from "@/types/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardCheck, Eye, Trash2, Printer, Mail, FileDown,
  Filter, X, Camera, MapPin, Clock, Smartphone,
  MoreVertical, Truck, RotateCcw, AlertTriangle, Image,
} from "lucide-react";
import { useChecklistHistory } from "@/hooks/useChecklistHistory";
import { useChecklistItems } from "@/hooks/useChecklistItems";
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
    ul{margin:0;padding-left:20px}hr{margin:8px 0}
    .media-thumb{width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ccc}
    .media-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
    </style></head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

interface ConsolidatedRecord {
  delivery: ChecklistRecord;
  return_: ChecklistRecord;
}

export function HistoryTab() {
  const { records, removeRecord } = useChecklistHistory();
  const [viewRecord, setViewRecord] = useState<ConsolidatedRecord | null>(null);
  const [viewMediaRecord, setViewMediaRecord] = useState<ConsolidatedRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConsolidatedRecord | null>(null);

  const [filterDriver, setFilterDriver] = useState("");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const consolidatedRecords = useMemo(() => {
    const recolhas = records.filter(r => r.type === "recolha");
    const result: ConsolidatedRecord[] = [];
    for (const recolha of recolhas) {
      const delivery = records.find(r => r.id === recolha.linkedDeliveryId && r.type === "entrega");
      if (delivery) {
        result.push({ delivery, return_: recolha });
      }
    }
    return result;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return consolidatedRecords.filter(cr => {
      if (filterDriver && !cr.delivery.driverName.toLowerCase().includes(filterDriver.toLowerCase())) return false;
      if (filterPlate && !cr.delivery.plate.toLowerCase().includes(filterPlate.toLowerCase())) return false;
      if (filterDateFrom && cr.delivery.date < filterDateFrom) return false;
      if (filterDateTo && cr.return_.date > filterDateTo) return false;
      return true;
    });
  }, [consolidatedRecords, filterDriver, filterPlate, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterDriver(""); setFilterPlate(""); setFilterDateFrom(""); setFilterDateTo("");
  };

  const handleDownload = (cr: ConsolidatedRecord) => {
    setViewRecord(cr);
    setTimeout(() => downloadElementAsPdf("history-doc-view", `Consolidado_${cr.delivery.plate}_${cr.delivery.date}`), 500);
  };

  const handlePrint = (cr: ConsolidatedRecord) => {
    setViewRecord(cr);
    setTimeout(() => window.print(), 500);
  };

  const handleEmail = () => toast.info("Funcionalidade de envio por e-mail será integrada em breve.");

  const confirmDelete = () => {
    if (deleteTarget) {
      removeRecord(deleteTarget.return_.id);
      toast.success("Registo eliminado com sucesso");
      setDeleteTarget(null);
    }
  };

  const getMediaCount = (cr: ConsolidatedRecord) => {
    const dMedia = cr.delivery.mediaFiles || {};
    const rMedia = cr.return_.mediaFiles || {};
    return Object.values(dMedia).reduce((s, a) => s + a.length, 0) + Object.values(rMedia).reduce((s, a) => s + a.length, 0);
  };

  const getDamageCount = (cr: ConsolidatedRecord) => {
    const deliveryDamages = (cr.delivery.damages || []).filter(d => d.types.length > 0).length;
    const newDamages = (cr.return_.newDamages || []).filter(d => d.types.length > 0).length;
    return { deliveryDamages, newDamages };
  };

  const hasActiveFilters = filterDriver || filterPlate || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">📋 Histórico Consolidado</span>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" /> Filtros
              {hasActiveFilters && <Badge variant="destructive" className="ml-1 px-1 py-0 text-[10px]">!</Badge>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Motorista</Label>
                    <Input placeholder="Nome..." value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Matrícula</Label>
                    <Input placeholder="Matrícula..." value={filterPlate} onChange={e => setFilterPlate(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Entrega (de)</Label>
                    <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Devolução (até)</Label>
                    <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={clearFilters}>
                    <X className="w-3 h-3" /> Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <ClipboardCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {consolidatedRecords.length === 0
                  ? "Nenhum ciclo completo (entrega + recolha) registrado ainda."
                  : "Nenhum resultado encontrado com os filtros aplicados."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((cr) => {
                const mediaCount = getMediaCount(cr);
                const { deliveryDamages, newDamages } = getDamageCount(cr);
                const kmDriven = Math.max(0, Number(cr.return_.kmInitial) - Number(cr.delivery.kmInitial));

                return (
                  <Card
                    key={cr.return_.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border"
                    onClick={() => setViewRecord(cr)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: main info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Top row: driver + vehicle */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{cr.delivery.driverName}</span>
                            <span className="text-muted-foreground text-xs">•</span>
                            <span className="text-sm text-muted-foreground truncate">{cr.delivery.plate} — {cr.delivery.model}</span>
                          </div>

                          {/* Badges row: entrega + recolha dates */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="gap-1 text-[11px] border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <Truck className="w-3 h-3" />
                              Entrega {new Date(cr.delivery.date).toLocaleDateString("pt-PT")}
                            </Badge>
                            <Badge variant="outline" className="gap-1 text-[11px] border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              <RotateCcw className="w-3 h-3" />
                              Recolha {new Date(cr.return_.date).toLocaleDateString("pt-PT")}
                            </Badge>
                          </div>

                          {/* Summary row */}
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            {kmDriven > 0 && (
                              <span>{kmDriven.toLocaleString("pt-PT")} km percorridos</span>
                            )}
                            {(deliveryDamages > 0 || newDamages > 0) && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3 h-3" />
                                {newDamages > 0 ? `${newDamages} novo(s) dano(s)` : `${deliveryDamages} dano(s)`}
                              </span>
                            )}
                            {mediaCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                {mediaCount} ficheiro(s)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: penalty + action menu */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {cr.return_.totalPenalty > 0 ? (
                              <span className="text-sm font-bold text-destructive">€{cr.return_.totalPenalty.toFixed(2)}</span>
                            ) : (
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">€0,00</span>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => setViewRecord(cr)}>
                                <Eye className="w-4 h-4 mr-2" /> Ver relatório
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewMediaRecord(cr)}>
                                <Camera className="w-4 h-4 mr-2" /> Ver galeria
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDownload(cr)}>
                                <FileDown className="w-4 h-4 mr-2" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(cr)}>
                                <Printer className="w-4 h-4 mr-2" /> Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleEmail}>
                                <Mail className="w-4 h-4 mr-2" /> Enviar por email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(cr)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full report dialog with integrated gallery */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>📄 Relatório Completo</span>
              <div className="flex gap-2 print:hidden">
                {viewRecord && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewMediaRecord(viewRecord)}>
                    <Camera className="w-4 h-4" /> Galeria
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadElementAsPdf("history-doc-view", `Consolidado_${viewRecord?.delivery.plate}`)}>
                  <FileDown className="w-4 h-4" /> Baixar
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleEmail}>
                  <Mail className="w-4 h-4" /> Email
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-8">
              <ConsolidatedDocumentView data={viewRecord} />
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Galeria de Fotos e Vídeos
                </h3>
                <MediaGalleryView data={viewRecord} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Standalone media gallery dialog */}
      <Dialog open={!!viewMediaRecord} onOpenChange={(open) => !open && setViewMediaRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" /> Galeria de Fotos e Vídeos
            </DialogTitle>
          </DialogHeader>
          {viewMediaRecord && <MediaGalleryView data={viewMediaRecord} />}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Excluir registo de inspeção"
        description="Tem certeza que deseja excluir permanentemente este registo? Isso também removerá fotos, vídeos, assinaturas e todos os dados da inspeção. Esta ação não pode ser desfeita."
      />
    </div>
  );
}

// --- Media Gallery View ---
function MediaGalleryView({ data }: { data: ConsolidatedRecord }) {
  const allMedia: { section: string; files: MediaFile[] }[] = [];

  const addSection = (label: string, mediaFiles: Record<string, MediaFile[]> | undefined) => {
    if (!mediaFiles) return;
    for (const [key, files] of Object.entries(mediaFiles)) {
      if (files && files.length > 0) {
        const sectionName = key === "general" || key === "general_recolha"
          ? `${label} — Geral`
          : key.startsWith("item_") ? `${label} — Item: ${key.replace("item_", "")}`
          : key.startsWith("damage_") ? `${label} — Dano: ${key.replace("damage_", "")}`
          : key.startsWith("new_damage_") ? `${label} — Novo Dano: ${key.replace("new_damage_", "")}`
          : key.startsWith("missing_") ? `${label} — Item em Falta: ${key.replace("missing_", "")}`
          : key.startsWith("part_") ? `${label} — Peça: ${key.replace("part_", "")}`
          : `${label} — ${key}`;
        allMedia.push({ section: sectionName, files });
      }
    }
  };

  addSection("Entrega", data.delivery.mediaFiles);
  addSection("Recolha", data.return_.mediaFiles);

  const hasValidMedia = allMedia.some(s => s.files.some(f => f.dataUrl && f.dataUrl.length > 0));

  if (allMedia.length === 0 || !hasValidMedia) {
    return <p className="text-center text-muted-foreground py-8">Nenhuma foto ou vídeo disponível</p>;
  }

  return (
    <div className="space-y-6">
      {allMedia.map((section, idx) => {
        const validFiles = section.files.filter(f => f.dataUrl && f.dataUrl.length > 0);
        if (validFiles.length === 0) return null;
        return (
          <div key={idx} className="space-y-2">
            <h4 className="text-sm font-semibold">{section.section}</h4>
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

// --- Consolidated Document View ---
function ConsolidatedDocumentView({ data }: { data: ConsolidatedRecord }) {
  const { items } = useChecklistItems();
  const { delivery, return_ } = data;

  const deliveryChecked = items.filter(i => delivery.checkedItems[i.id]);
  const deliveryUnchecked = items.filter(i => !delivery.checkedItems[i.id]);
  const deliveryDamages = delivery.damages.filter(d => d.types.length > 0);
  const missingItems = items.filter(i => return_.missingItems[i.id]);
  const newDamages = return_.newDamages.filter(d => d.types.length > 0);

  const renderMediaThumbs = (mediaFiles: Record<string, MediaFile[]> | undefined, key: string) => {
    const files = mediaFiles?.[key];
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
    <div className="space-y-6 text-sm" id="history-doc-view">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold">RELATÓRIO DE ENTREGA E DEVOLUÇÃO</h2>
        <p className="text-muted-foreground">Sistema TVDE Pro - Gestão de Frota</p>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <h4 className="font-semibold mb-2">Dados do Motorista</h4>
          <p><strong>Nome:</strong> {delivery.driverName}</p>
          <p><strong>NIF:</strong> {delivery.driverNif || "—"}</p>
          <p><strong>Morada:</strong> {delivery.driverAddress || "—"}</p>
          <p><strong>Email:</strong> {delivery.driverEmail || "—"}</p>
          <p><strong>Contacto:</strong> {delivery.driverContact || "—"}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Dados do Veículo</h4>
          <p><strong>Matrícula:</strong> {delivery.plate}</p>
          <p><strong>Modelo:</strong> {delivery.model}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">📊 Comparativo Entrega vs Recolha</h4>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left">Campo</th>
              <th className="border p-2 text-left">Entrega</th>
              <th className="border p-2 text-left">Recolha</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border p-2 font-medium">Data</td><td className="border p-2">{new Date(delivery.date).toLocaleDateString("pt-PT")}{delivery.time && <span className="ml-1 text-muted-foreground">({delivery.time})</span>}</td><td className="border p-2">{new Date(return_.date).toLocaleDateString("pt-PT")}{return_.time && <span className="ml-1 text-muted-foreground">({return_.time})</span>}</td></tr>
            <tr><td className="border p-2 font-medium">KM</td><td className="border p-2">{delivery.kmInitial}</td><td className="border p-2">{return_.kmInitial}</td></tr>
            <tr><td className="border p-2 font-medium">Combustível</td><td className="border p-2">{delivery.fuelLevel}</td><td className="border p-2">{return_.fuelLevel}</td></tr>
            <tr><td className="border p-2 font-medium">KM Percorridos</td><td className="border p-2" colSpan={2}>{Math.max(0, Number(return_.kmInitial) - Number(delivery.kmInitial))} km</td></tr>
          </tbody>
        </table>
      </div>

      {renderMediaThumbs(delivery.mediaFiles, "general")}

      <div>
        <h4 className="font-semibold mb-2">✅ Estado na Entrega — Itens no Carro</h4>
        {deliveryChecked.length > 0 && (
          <ul className="list-inside space-y-1">
            {deliveryChecked.map(item => (
              <li key={item.id}>
                ✔ {item.name}
                {delivery.specialFieldValues[`${item.id}_document_type`] && <span className="text-muted-foreground ml-1">({delivery.specialFieldValues[`${item.id}_document_type`]})</span>}
                {delivery.specialFieldValues[`${item.id}_expiry_date`] && <span className="text-muted-foreground ml-1">(Val: {delivery.specialFieldValues[`${item.id}_expiry_date`]})</span>}
                {delivery.specialFieldValues[`${item.id}_card_number`] && <span className="text-muted-foreground ml-1">(Nº: {delivery.specialFieldValues[`${item.id}_card_number`]})</span>}
                {renderMediaThumbs(delivery.mediaFiles, `item_${item.id}`)}
              </li>
            ))}
          </ul>
        )}
        {deliveryUnchecked.length > 0 && (
          <>
            <h5 className="font-medium mt-2 text-destructive">Itens Não Entregues:</h5>
            <ul className="list-inside space-y-1 text-destructive">
              {deliveryUnchecked.map(i => <li key={i.id}>✖ {i.name}</li>)}
            </ul>
          </>
        )}
      </div>

      {deliveryDamages.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">⚠️ Danos na Entrega</h4>
          <ul className="list-inside space-y-1 text-muted-foreground">
            {deliveryDamages.map(d => (
              <li key={d.part}>
                <strong>{d.part}:</strong> {d.types.join(", ")}
                {renderMediaThumbs(delivery.mediaFiles, `damage_${d.part}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2">🔄 Estado na Devolução</h4>
        {missingItems.length > 0 ? (
          <>
            <h5 className="font-medium text-destructive">❌ Itens em Falta:</h5>
            <ul className="list-inside space-y-1">
              {missingItems.map(i => (
                <li key={i.id}>
                  ✖ {i.name} — €{i.replacementValue.toFixed(2)}
                  {renderMediaThumbs(return_.mediaFiles, `missing_${i.id}`)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-emerald-600 dark:text-emerald-400">✅ Todos os itens devolvidos.</p>
        )}
      </div>

      {newDamages.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">⚠️ Novos Danos na Devolução</h4>
          <ul className="list-inside space-y-1">
            {newDamages.map(d => (
              <li key={d.part}>
                <strong>{d.part}:</strong> {d.types.join(", ")} {d.value ? `— €${d.value.toFixed(2)}` : ""}
                {renderMediaThumbs(return_.mediaFiles, `new_damage_${d.part}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {renderMediaThumbs(return_.mediaFiles, "general_recolha")}

      {return_.totalPenalty > 0 && (
        <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
          <h4 className="font-semibold mb-2">💰 Resumo Financeiro</h4>
          <div className="mt-2 pt-2 border-t font-bold text-lg">
            Total Penalizações: <span className="text-destructive">€{return_.totalPenalty.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2">✍️ Assinaturas da Entrega</h4>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-medium">Empresa</p>
            {delivery.companySignature && delivery.companySignature !== "[signature]" ? <img src={delivery.companySignature} alt="Assinatura empresa" className="max-h-20 mx-auto border rounded sig" /> : <p className="text-muted-foreground text-xs">—</p>}
          </div>
          <div className="text-center space-y-2">
            <p className="text-xs font-medium">Motorista</p>
            {delivery.driverSignature && delivery.driverSignature !== "[signature]" ? <img src={delivery.driverSignature} alt="Assinatura motorista" className="max-h-20 mx-auto border rounded sig" /> : <p className="text-muted-foreground text-xs">—</p>}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">✍️ Assinaturas da Devolução</h4>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-medium">Empresa</p>
            {return_.companySignature && return_.companySignature !== "[signature]" ? <img src={return_.companySignature} alt="Assinatura empresa" className="max-h-20 mx-auto border rounded sig" /> : <p className="text-muted-foreground text-xs">—</p>}
          </div>
          <div className="text-center space-y-2">
            <p className="text-xs font-medium">Motorista</p>
            {return_.driverSignature && return_.driverSignature !== "[signature]" ? <img src={return_.driverSignature} alt="Assinatura motorista" className="max-h-20 mx-auto border rounded sig" /> : <p className="text-muted-foreground text-xs">—</p>}
          </div>
        </div>
      </div>

      {(delivery.securityMetadata || return_.securityMetadata) && (
        <div className="space-y-2">
          <h4 className="font-semibold mb-2">🔒 Registo de Segurança</h4>
          {[
            { label: "Entrega", meta: delivery.securityMetadata },
            { label: "Devolução", meta: return_.securityMetadata },
          ].filter(m => m.meta).map(({ label, meta }) => (
            <div key={label} className="p-2 bg-muted/50 rounded border text-xs">
              <p className="font-medium mb-1">{label}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {meta?.timestamp ? new Date(meta.timestamp).toLocaleString("pt-PT") : "—"}</p>
                <p className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {meta?.deviceType || "—"}</p>
                <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {meta?.latitude ? `${meta.latitude.toFixed(6)}, ${meta.longitude?.toFixed(6)}` : "Não disponível"}</p>
                <p>👤 {meta?.operatorName || meta?.operatorEmail || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
