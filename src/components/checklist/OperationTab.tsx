import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Truck, RotateCcw, FileDown, Check, Search, AlertTriangle, CheckCircle, XCircle, MapPin, Clock, Smartphone } from "lucide-react";
import { OperationType, FuelLevel, DamageRecord, PartStatus, ChecklistFormData, ChecklistRecord, CATEGORY_LABELS, MediaFile, SecurityMetadata } from "@/types/checklist";
import { useChecklistItems } from "@/hooks/useChecklistItems";
import { useChecklistHistory } from "@/hooks/useChecklistHistory";
import { VehicleDiagram, PartsList } from "./VehicleDiagram";
import { DamagePanel } from "./DamagePanel";
import { SignaturePad } from "./SignaturePad";
import { MediaCapture } from "./MediaCapture";
import { FullInspectionVideo } from "./FullInspectionVideo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const emptyForm: ChecklistFormData = {
  driverId: "",
  driverName: "",
  driverDocument: "",
  driverContact: "",
  driverEmail: "",
  vehicleId: "",
  plate: "",
  model: "",
  year: "",
  kmInitial: "",
  fuelLevel: "1/2",
  operationDate: new Date().toISOString().split("T")[0],
  checkedItems: {},
  specialFieldValues: {},
  damages: [],
  missingItems: {},
  newDamages: [],
  mediaFiles: {},
};

export function OperationTab() {
  const { items: allItems, activeItems, vehicleParts: allVehicleParts, activeVehicleParts, fuelLevels } = useChecklistItems();
  // Em novas operações, usar apenas itens/partes ativos. Para histórico (lookup por id), usar a lista total.
  const items = activeItems;
  const vehicleParts = activeVehicleParts;
  const { records, addRecord } = useChecklistHistory();
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [companySignature, setCompanySignature] = useState<string | null>(null);
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Recolha: selected delivery record
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedDelivery = useMemo(() => records.find(r => r.id === selectedDeliveryId), [records, selectedDeliveryId]);

  // DB data for selectors
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [driverNif, setDriverNif] = useState("");
  const [driverAddress, setDriverAddress] = useState("");

  const [form, setForm] = useState<ChecklistFormData>({ ...emptyForm });
  const [geoLocation, setGeoLocation] = useState<{ lat: number | null; lng: number | null; accuracy: number | null }>({ lat: null, lng: null, accuracy: null });
  const [operatorInfo, setOperatorInfo] = useState<{ email: string | null; name: string | null }>({ email: null, name: null });

  // Capture GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => {} // silently fail
      );
    }
    // Get current user info
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setOperatorInfo({ email: data.user.email || null, name: data.user.user_metadata?.nome_completo || data.user.email || null });
      }
    });
  }, []);

  // Beforeunload protection — warn user if they have unsaved checklist data
  useEffect(() => {
    const hasData = operationType !== null && (form.driverName || form.plate || Object.keys(form.checkedItems).length > 0);
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [operationType, form.driverName, form.plate, form.checkedItems]);

  // Available delivery records (only active entregas — exclude those already returned)
  const deliveryRecords = useMemo(() => {
    const returnedIds = new Set(
      records.filter(r => r.type === "recolha" && r.linkedDeliveryId).map(r => r.linkedDeliveryId)
    );
    return records.filter(r => r.type === "entrega" && !returnedIds.has(r.id));
  }, [records]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: driverData } = await supabase.from("motoristas").select("id, nome_completo, numero_documento, telemovel, email, nif, endereco, endereco_rua, endereco_numero, endereco_cidade, endereco_cep").eq("ativo", true);
      const { data: vehicleData } = await supabase.from("veiculos").select("id, matricula, marca, modelo, data_matricula, combustivel").eq("ativo", true);
      if (driverData) setDrivers(driverData);
      if (vehicleData) setVehicles(vehicleData);
    };
    fetchData();
  }, []);

  const deliverySteps = ["Dados", "Itens", "Danos", "Confirmação", "Documento"];
  const returnSteps = ["Selecionar Entrega", "Dados", "Itens em Falta", "Novos Danos", "Avaliação Financeira", "Cálculo Final", "Documento"];

  const steps = operationType === "entrega" ? deliverySteps : returnSteps;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const partNames = vehicleParts.map(p => p.name);

  const setPartStatus = (part: string, status: PartStatus) => {
    const key = operationType === "recolha" ? "newDamages" : "damages";
    setForm((prev) => {
      const damages = [...prev[key]];
      const idx = damages.findIndex((d) => d.part === part);
      const types: ("amassado" | "riscado" | "quebrado")[] = status === "ok" ? [] : [status as "amassado" | "riscado" | "quebrado"];
      if (idx === -1) {
        damages.push({ part, types, status });
      } else {
        damages[idx] = { ...damages[idx], types, status };
      }
      return { ...prev, [key]: damages };
    });
  };

  const toggleDamage = (part: string, type: "amassado" | "riscado" | "quebrado") => {
    const key = operationType === "recolha" ? "newDamages" : "damages";
    setForm((prev) => {
      const damages = [...prev[key]];
      const idx = damages.findIndex((d) => d.part === part);
      if (idx === -1) {
        damages.push({ part, types: [type], status: type as PartStatus });
      } else {
        const types = damages[idx].types.includes(type)
          ? damages[idx].types.filter((t) => t !== type)
          : [...damages[idx].types, type];
        if (types.length === 0) {
          damages[idx] = { ...damages[idx], types, status: "ok" };
        } else {
          damages[idx] = { ...damages[idx], types, status: types[types.length - 1] as PartStatus };
        }
      }
      return { ...prev, [key]: damages };
    });
  };

  const totalMissing = useMemo(() => {
    return Object.entries(form.missingItems)
      .filter(([_, missing]) => missing)
      .reduce((sum, [id]) => {
        const item = items.find((i) => i.id === id);
        return sum + (item?.replacementValue || 0);
      }, 0);
  }, [form.missingItems, items]);

  const totalDamageValue = useMemo(() => {
    return form.newDamages.reduce((sum, d) => sum + (d.value || 0), 0);
  }, [form.newDamages]);

  // Fuel penalty calculation
  const fuelLevelOrder: FuelLevel[] = ["1/4", "1/2", "3/4", "cheio"];
  const fuelPenalty = useMemo(() => {
    if (!selectedDelivery || operationType !== "recolha") return 0;
    const deliveryIdx = fuelLevelOrder.indexOf(selectedDelivery.fuelLevel);
    const returnIdx = fuelLevelOrder.indexOf(form.fuelLevel);
    if (returnIdx >= deliveryIdx) return 0; // Same or higher level, no penalty
    // Calculate penalty based on level difference
    let penalty = 0;
    const returnConfig = fuelLevels.find(f => f.level === form.fuelLevel);
    const deliveryConfig = fuelLevels.find(f => f.level === selectedDelivery.fuelLevel);
    if (returnConfig && deliveryConfig) {
      penalty = returnConfig.penaltyValue - deliveryConfig.penaltyValue;
    }
    return Math.max(0, penalty);
  }, [selectedDelivery, form.fuelLevel, fuelLevels, operationType]);

  const totalPenalty = totalMissing + totalDamageValue + fuelPenalty;

  const handleDriverSelect = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      const address = [driver.endereco_rua, driver.endereco_numero, driver.endereco_cidade, driver.endereco_cep].filter(Boolean).join(", ") || driver.endereco || "";
      setDriverNif(driver.nif || "");
      setDriverAddress(address);
      setForm(prev => ({
        ...prev,
        driverId: driver.id,
        driverName: driver.nome_completo || "",
        driverDocument: driver.numero_documento || "",
        driverContact: driver.telemovel || "",
        driverEmail: driver.email || "",
      }));
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      const year = vehicle.data_matricula ? new Date(vehicle.data_matricula).getFullYear().toString() : "";
      setForm(prev => ({
        ...prev,
        vehicleId: vehicle.id,
        plate: vehicle.matricula || "",
        model: `${vehicle.marca || ""} ${vehicle.modelo || ""}`.trim(),
        year,
      }));
    }
  };

  const handleSelectDelivery = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    const delivery = records.find(r => r.id === deliveryId);
    if (delivery) {
      setForm(prev => ({
        ...prev,
        driverId: delivery.driverId,
        driverName: delivery.driverName,
        driverDocument: delivery.driverId, // will be overridden
        driverContact: "",
        driverEmail: "",
        vehicleId: delivery.vehicleId,
        plate: delivery.plate,
        model: delivery.model,
        year: "",
        kmInitial: "", // KM Final - manual
        fuelLevel: "1/2", // manual
        operationDate: new Date().toISOString().split("T")[0], // manual
        checkedItems: {}, // will be filled during comparison
        damages: delivery.damages || [],
      }));
      const driver = drivers.find(d => d.id === delivery.driverId);
      if (driver) {
        const address = [driver.endereco_rua, driver.endereco_numero, driver.endereco_cidade, driver.endereco_cep].filter(Boolean).join(", ") || driver.endereco || "";
        setDriverNif(driver.nif || "");
        setDriverAddress(address);
        setForm(prev => ({
          ...prev,
          driverDocument: driver.numero_documento || "",
          driverContact: driver.telemovel || "",
          driverEmail: driver.email || "",
        }));
      } else {
        // Fallback: use data from the delivery record
        setDriverNif(delivery.driverNif || "");
        setDriverAddress(delivery.driverAddress || "");
      }
    }
  };

  const validateStep = () => {
    if (operationType === "recolha") {
      if (currentStep === 0 && !selectedDeliveryId) {
        toast.error("Selecione uma entrega existente para vincular a recolha");
        return false;
      }
      if (currentStep === 1 && !form.kmInitial) {
        toast.error("Preencha o KM Final");
        return false;
      }
      // Step 2 (Itens em Falta) - no mandatory validation needed, user can skip
      // Step 3 (Novos Danos) - validate that damages have descriptions
      if (currentStep === 3 && form.newDamages.length > 0) {
        // Only validate damages that have a part selected and are not marked as "ok"
        const hasInvalidDamage = form.newDamages.some(d => d.part && d.status !== "ok" && d.types.length === 0);
        if (hasInvalidDamage) {
          toast.error("Todos os danos registrados devem ter pelo menos um tipo selecionado");
          return false;
        }
      }
      // Step 4 (Avaliação Financeira) - validate fuel level is set
      if (currentStep === 4 && !form.fuelLevel) {
        toast.error("Selecione o nível de combustível na devolução");
        return false;
      }
      if (currentStep === 5) {
        if (!companySignature || !driverSignature) {
          toast.error("Ambas as assinaturas são obrigatórias");
          return false;
        }
      }
      return true;
    }

    // Entrega validations
    if (currentStep === 0) {
      if (!form.driverName || !form.driverDocument || !form.driverContact || !form.plate || !form.model || !form.kmInitial) {
        toast.error("Preencha todos os campos obrigatórios");
        return false;
      }
    }
    if (currentStep === 1 && operationType === "entrega") {
      const docCarroItem = items.find(i => i.id === "doc_carro");
      if (docCarroItem) {
        if (!form.checkedItems["doc_carro"]) {
          toast.error("Documento do Carro é obrigatório – marque o item e selecione o tipo");
          return false;
        }
        if (!form.specialFieldValues["doc_carro_document_type"]) {
          toast.error("Selecione o tipo de documento do carro");
          return false;
        }
      }
      if (form.checkedItems["extintor"] && !form.specialFieldValues["extintor_expiry_date"]) {
        toast.error("Informe a data de vencimento do extintor");
        return false;
      }
      // Fuel card validation: must choose sim/nao, and if sim, number is required
      if (!form.specialFieldValues["cartao_abastecimento_has_card"]) {
        toast.error("Indique se o veículo possui cartão de abastecimento");
        return false;
      }
      if (form.specialFieldValues["cartao_abastecimento_has_card"] === "sim" && !form.specialFieldValues["cartao_abastecimento_card_number"]) {
        toast.error("Informe o número do cartão de abastecimento");
        return false;
      }
    }
    if (currentStep === 3 && operationType === "entrega") {
      if (!companySignature || !driverSignature) {
        toast.error("Ambas as assinaturas são obrigatórias");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleMediaChange = (key: string, files: MediaFile[]) => {
    setForm(prev => ({
      ...prev,
      mediaFiles: { ...prev.mediaFiles, [key]: files },
    }));
  };

  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    if (/mobile|android|iphone/i.test(ua)) return "Telemóvel";
    return "Computador";
  };

  const captureSecurityMetadata = (): SecurityMetadata => {
    // Use already-captured geoLocation from mount — no async re-fetch that returns stale data
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      latitude: geoLocation.lat,
      longitude: geoLocation.lng,
      accuracy: geoLocation.accuracy,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
      operatorEmail: operatorInfo.email,
      operatorName: operatorInfo.name,
    };
  };

  const saveRecord = async (): Promise<ChecklistRecord> => {
    const now = new Date();
    const record: ChecklistRecord = {
      id: `cl_${Date.now()}`,
      type: operationType!,
      driverName: form.driverName,
      driverId: form.driverId,
      driverNif: driverNif,
      driverAddress: driverAddress,
      driverEmail: form.driverEmail,
      driverContact: form.driverContact,
      plate: form.plate,
      model: form.model,
      vehicleId: form.vehicleId,
      date: form.operationDate,
      time: now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      kmInitial: form.kmInitial,
      fuelLevel: form.fuelLevel,
      totalPenalty: operationType === "recolha" ? totalPenalty : 0,
      checkedItems: form.checkedItems,
      specialFieldValues: form.specialFieldValues,
      damages: form.damages,
      missingItems: form.missingItems,
      newDamages: form.newDamages,
      companySignature,
      driverSignature,
      createdAt: now.toISOString(),
      linkedDeliveryId: selectedDeliveryId || undefined,
      mediaFiles: form.mediaFiles,
      securityMetadata: captureSecurityMetadata(),
    };
    await addRecord(record);
    return record;
  };

  const handleFinalizeEntrega = async () => {
    if (isSubmitting) return;
    if (!companySignature || !driverSignature) {
      toast.error("Ambas as assinaturas são obrigatórias");
      return;
    }
    setIsSubmitting(true);
    try {
      await saveRecord();
      setShowPdfPreview(true);
      setCurrentStep(4);
    } finally {
      setTimeout(() => setIsSubmitting(false), 2000);
    }
  };

  const handleFinalizeRecolha = async () => {
    if (isSubmitting) return;
    if (!companySignature || !driverSignature) {
      toast.error("Ambas as assinaturas são obrigatórias");
      return;
    }
    setIsSubmitting(true);
    try {
      await saveRecord();
      setCurrentStep(6);
    } finally {
      setTimeout(() => setIsSubmitting(false), 2000);
    }
  };

  const handleFinishDocument = () => {
    toast.success("Check-list finalizado e salvo no histórico!");
    resetAll();
  };

  const resetAll = () => {
    setOperationType(null);
    setCurrentStep(0);
    setForm({ ...emptyForm, operationDate: new Date().toISOString().split("T")[0] });
    setCompanySignature(null);
    setDriverSignature(null);
    setShowPdfPreview(false);
    setSelectedDeliveryId(null);
    setDriverNif("");
    setDriverAddress("");
  };

  // Operation type selection screen
  if (!operationType) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Escolha o Tipo de Operação</h2>
          <p className="text-muted-foreground">Selecione se deseja realizar uma entrega ou recolha de veículo</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-2"
            onClick={() => setOperationType("entrega")}
          >
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <Truck className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold">ENTREGA DO VEÍCULO</h3>
              <p className="text-sm text-muted-foreground">Registrar a entrega do veículo para o motorista TVDE</p>
              <span className="inline-block text-xs bg-muted px-3 py-1 rounded-full">Novo contrato / Início de operação</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-2"
            onClick={() => setOperationType("recolha")}
          >
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
                <RotateCcw className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold">RECOLHA DO VEÍCULO</h3>
              <p className="text-sm text-muted-foreground">Registrar a devolução do veículo pelo motorista</p>
              <span className="inline-block text-xs bg-muted px-3 py-1 rounded-full">Fim de contrato / Rescisão</span>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {totalSteps}</span>
          <span className={cn("ml-2 text-xs font-bold px-2 py-1 rounded-full", operationType === "entrega" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            {operationType === "entrega" ? "ENTREGA" : "RECOLHA"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAll}>Cancelar</Button>
      </div>
      <Progress value={progress} className="h-1" />

      {/* Step indicators */}
      <div className="flex gap-2 justify-center flex-wrap">
        {steps.map((step, i) => (
          <div key={step} className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all",
            i === currentStep ? "bg-primary text-primary-foreground" : i < currentStep ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">{i + 1}</span>
            {step}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">

          {/* ============ ENTREGA STEPS ============ */}

          {/* Step 1 Entrega: Data with driver/vehicle selectors */}
          {currentStep === 0 && operationType === "entrega" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold">Dados do Veículo e Motorista</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-medium text-muted-foreground">Informações do Motorista</h4>
                  <div className="space-y-2">
                    <Label>Selecionar Motorista</Label>
                    <Select value={form.driverId} onValueChange={handleDriverSelect}>
                      <SelectTrigger><SelectValue placeholder="Escolha um motorista..." /></SelectTrigger>
                      <SelectContent>
                        {drivers.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>NIF / Documento *</Label>
                    <Input value={form.driverDocument} onChange={(e) => setForm({ ...form, driverDocument: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto *</Label>
                    <Input value={form.driverContact} onChange={(e) => setForm({ ...form, driverContact: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.driverEmail} onChange={(e) => setForm({ ...form, driverEmail: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-muted-foreground">Informações do Veículo</h4>
                  <div className="space-y-2">
                    <Label>Selecionar Veículo</Label>
                    <Select value={form.vehicleId} onValueChange={handleVehicleSelect}>
                      <SelectTrigger><SelectValue placeholder="Escolha um veículo..." /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.matricula} - {v.marca} {v.modelo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Matrícula *</Label>
                      <Input value={form.plate} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo *</Label>
                      <Input value={form.model} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input value={form.year} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>KM Inicial *</Label>
                      <Input type="number" value={form.kmInitial} onChange={(e) => setForm({ ...form, kmInitial: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Combustível</Label>
                    <div className="flex gap-2">
                      {(["1/4", "1/2", "3/4", "cheio"] as FuelLevel[]).map((level) => (
                        <Button key={level} type="button" variant={form.fuelLevel === level ? "default" : "outline"} size="sm"
                          onClick={() => setForm({ ...form, fuelLevel: level })}>{level}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Data da Operação</Label>
                    <Input type="date" value={form.operationDate} onChange={(e) => setForm({ ...form, operationDate: e.target.value })} />
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label>📷 Mídia Geral do Veículo</Label>
                    <MediaCapture mediaKey="general" media={form.mediaFiles} onMediaChange={handleMediaChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Entrega: Items checklist with special fields */}
          {currentStep === 1 && operationType === "entrega" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold">Itens Dentro do Veículo</h3>
              {Object.entries(
                items.filter(i => i.id !== "cartao_abastecimento").reduce((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item);
                  return acc;
                }, {} as Record<string, typeof items>)
              ).map(([category, catItems]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">{CATEGORY_LABELS[category]}</h4>
                  {catItems.map((item) => (
                     <div key={item.id} className="p-3 rounded-lg hover:bg-muted/50 border space-y-2">
                       <div className="flex items-center gap-3">
                         <Checkbox
                           checked={form.checkedItems[item.id] || false}
                           onCheckedChange={(v) => setForm({ ...form, checkedItems: { ...form.checkedItems, [item.id]: !!v } })}
                         />
                         <span className="flex-1 text-sm font-medium">{item.name}</span>
                         {item.required && <span className="text-xs text-destructive font-semibold">OBRIGATÓRIO</span>}
                       </div>
                       {form.checkedItems[item.id] && (
                         <>
                           {item.specialFields?.map((field) => (
                             <div key={field.type} className="ml-8 space-y-1">
                               {field.type === "document_type" && field.options && (
                                 <div className="space-y-2">
                                   <Label className="text-xs">{field.label} *</Label>
                                   <select
                                     className={cn(
                                       "flex h-8 w-72 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                     )}
                                     value={form.specialFieldValues[`${item.id}_document_type`] || ""}
                                     onChange={(e) => setForm(prev => ({
                                       ...prev,
                                       specialFieldValues: { ...prev.specialFieldValues, [`${item.id}_document_type`]: e.target.value }
                                     }))}
                                   >
                                     <option value="" disabled>Selecione o tipo...</option>
                                     {field.options.map((opt) => (
                                       <option key={opt} value={opt}>{opt}</option>
                                     ))}
                                   </select>
                                 </div>
                               )}
                               {field.type === "expiry_date" && (
                                 <div className="space-y-1">
                                   <Label className="text-xs">{field.label} *</Label>
                                   <Input
                                     type="date"
                                     className="w-48 h-8 text-sm"
                                     value={form.specialFieldValues[`${item.id}_expiry_date`] || ""}
                                     onChange={(e) => setForm(prev => ({
                                       ...prev,
                                       specialFieldValues: { ...prev.specialFieldValues, [`${item.id}_expiry_date`]: e.target.value }
                                     }))}
                                   />
                                 </div>
                               )}
                             </div>
                           ))}
                           <div className="ml-8">
                             <MediaCapture mediaKey={`item_${item.id}`} media={form.mediaFiles} onMediaChange={handleMediaChange} compact />
                           </div>
                         </>
                       )}
                     </div>
                  ))}
                </div>
              ))}

              {/* Cartão de Abastecimento - mandatory radio selection */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Cartão de Abastecimento</h4>
                <div className="p-3 rounded-lg border space-y-3">
                  <Label className="text-sm font-medium">O veículo possui cartão de abastecimento? *</Label>
                  <RadioGroup
                    value={form.specialFieldValues["cartao_abastecimento_has_card"] || ""}
                    onValueChange={(value) => {
                      setForm(prev => ({
                        ...prev,
                        checkedItems: { ...prev.checkedItems, cartao_abastecimento: value === "sim" },
                        specialFieldValues: {
                          ...prev.specialFieldValues,
                          cartao_abastecimento_has_card: value,
                          ...(value === "nao" ? { cartao_abastecimento_card_number: "" } : {}),
                        },
                      }));
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="fuel_card_yes" />
                      <Label htmlFor="fuel_card_yes" className="text-sm cursor-pointer">Possui cartão</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="fuel_card_no" />
                      <Label htmlFor="fuel_card_no" className="text-sm cursor-pointer">Não possui cartão</Label>
                    </div>
                  </RadioGroup>
                  {form.specialFieldValues["cartao_abastecimento_has_card"] === "sim" && (
                    <div className="ml-6 space-y-1">
                      <Label className="text-xs">Número do Cartão *</Label>
                      <Input
                        className="w-64 h-8 text-sm"
                        placeholder="Número do cartão de abastecimento"
                        value={form.specialFieldValues["cartao_abastecimento_card_number"] || ""}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          specialFieldValues: { ...prev.specialFieldValues, cartao_abastecimento_card_number: e.target.value }
                        }))}
                      />
                    </div>
                  )}
                  <div className="ml-6">
                    <MediaCapture mediaKey="item_cartao_abastecimento" media={form.mediaFiles} onMediaChange={handleMediaChange} compact />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Entrega: Damage inspection */}
          {currentStep === 2 && operationType === "entrega" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold">Inspeção Visual — Estado de Cada Peça</h3>
              <p className="text-sm text-muted-foreground">Selecione o estado de cada peça do veículo e anexe fotos/vídeos como prova.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VehicleDiagram damages={form.damages} onPartClick={setSelectedPart} vehicleParts={partNames} />
                <div className="space-y-4">
                  <DamagePanel
                    selectedPart={selectedPart}
                    damages={form.damages}
                    onToggleDamage={(part, type) => toggleDamage(part, type)}
                    onSetPartStatus={(part, status) => setPartStatus(part, status)}
                    onClose={() => setSelectedPart(null)}
                  />
                  {selectedPart && (
                    <div className="ml-1">
                      <MediaCapture mediaKey={`part_${selectedPart}`} media={form.mediaFiles} onMediaChange={handleMediaChange} />
                    </div>
                  )}
                  <PartsList damages={form.damages} onPartClick={setSelectedPart} vehicleParts={partNames} />
                  
                  {/* Summary of evaluated parts */}
                  {form.damages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Peças Avaliadas:</h4>
                      {form.damages.filter(d => d.status).map((d) => (
                        <div key={d.part} className={cn(
                          "text-xs p-2 rounded border-l-2 space-y-1",
                          d.status === "ok" ? "bg-green-50 dark:bg-green-950/20 border-l-green-500" : "bg-destructive/5 border-l-destructive"
                        )}>
                          <div>
                            <strong>{d.part}:</strong>{" "}
                            <span className={d.status === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                              {d.status === "ok" ? "🟢 OK" : d.status === "riscado" ? "🟠 Riscado" : d.status === "amassado" ? "🔴 Amassado" : "🔴 Quebrado"}
                            </span>
                          </div>
                          <MediaCapture mediaKey={`part_${d.part}`} media={form.mediaFiles} onMediaChange={handleMediaChange} compact />
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                        if (window.confirm("Tem certeza que deseja limpar todas as avaliações de danos?")) {
                          setForm({ ...form, damages: [] });
                        }
                      }}>
                        Limpar Todas as Avaliações
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Full inspection video */}
              <FullInspectionVideo
                mediaKey="full_inspection_entrega"
                media={form.mediaFiles}
                onMediaChange={handleMediaChange}
              />
            </div>
          )}

          {/* Step 4 Entrega: Confirmation & Signatures */}
          {currentStep === 3 && operationType === "entrega" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold">Termo de Confirmação - Entrega</h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Motorista:</strong> {form.driverName}</div>
                    <div><strong>Documento:</strong> {form.driverDocument}</div>
                    <div><strong>Veículo:</strong> {form.plate} - {form.model}</div>
                    <div><strong>KM:</strong> {form.kmInitial}</div>
                    <div><strong>Combustível:</strong> {form.fuelLevel}</div>
                    <div><strong>Data:</strong> {form.operationDate}</div>
                  </div>
                  <div><strong>Itens verificados:</strong> {Object.values(form.checkedItems).filter(Boolean).length} de {items.length}</div>
                  <div><strong>Danos registrados:</strong> {form.damages.filter((d) => d.types.length > 0).length} peças</div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground italic text-center">
                "Reconheço que o carro foi me entregue com todos os itens acima mencionados."
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignaturePad label="✍️ Assinatura da Empresa *" onSignatureChange={setCompanySignature} />
                <SignaturePad label="✍️ Assinatura do Motorista *" onSignatureChange={setDriverSignature} />
              </div>
            </div>
          )}

          {/* Step 5 Entrega: PDF Preview */}
          {currentStep === 4 && operationType === "entrega" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-success" /> Documento Gerado
              </h3>
              <div className="border rounded-lg p-6 space-y-6 bg-background" id="checklist-pdf">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">Termo de Entrega de Veículo</h2>
                  <p className="text-muted-foreground text-sm">Sistema TVDE Pro - Gestão de Frota</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Dados do Motorista</h4>
                    <p><strong>Nome:</strong> {form.driverName}</p>
                    <p><strong>NIF:</strong> {driverNif || form.driverDocument}</p>
                    <p><strong>Morada:</strong> {driverAddress || "—"}</p>
                    <p><strong>Email:</strong> {form.driverEmail || "—"}</p>
                    <p><strong>Contacto:</strong> {form.driverContact}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Dados do Veículo</h4>
                    <p><strong>Matrícula:</strong> {form.plate}</p>
                    <p><strong>Modelo:</strong> {form.model}</p>
                    <p><strong>KM:</strong> {form.kmInitial}</p>
                    <p><strong>Combustível:</strong> {form.fuelLevel}</p>
                    <p><strong>Data:</strong> {form.operationDate}</p>
                    <p><strong>Hora:</strong> {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <h4 className="font-semibold mb-2">Itens Entregues</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {items.filter(i => i.id !== "cartao_abastecimento" && form.checkedItems[i.id]).map(item => (
                      <li key={item.id}>
                        {item.name}
                        {form.specialFieldValues[`${item.id}_document_type`] && ` (${form.specialFieldValues[`${item.id}_document_type`]})`}
                        {form.specialFieldValues[`${item.id}_expiry_date`] && ` (Val: ${form.specialFieldValues[`${item.id}_expiry_date`]})`}
                      </li>
                    ))}
                  </ul>
                  {/* Fuel card summary */}
                  <h4 className="font-semibold mb-2 mt-4">Cartão de Abastecimento</h4>
                  {form.specialFieldValues["cartao_abastecimento_has_card"] === "sim" ? (
                    <div>
                      <p>Cartão de abastecimento: <strong>SIM</strong></p>
                      <p>Número do cartão: <strong>{form.specialFieldValues["cartao_abastecimento_card_number"]}</strong></p>
                    </div>
                  ) : (
                    <p>Cartão de abastecimento: <strong>NÃO</strong></p>
                  )}
                  {items.filter(i => i.id !== "cartao_abastecimento" && !form.checkedItems[i.id]).length > 0 && (
                    <>
                      <h4 className="font-semibold mb-2 mt-4">Itens Não Entregues</h4>
                      <ul className="list-disc list-inside space-y-1 text-destructive">
                        {items.filter(i => i.id !== "cartao_abastecimento" && !form.checkedItems[i.id]).map(item => (
                          <li key={item.id}>{item.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                {form.damages.filter(d => d.types.length > 0).length > 0 && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">Danos Identificados</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {form.damages.filter(d => d.types.length > 0).map(d => (
                        <li key={d.part}><strong>{d.part}:</strong> {d.types.join(", ")}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(form.mediaFiles["full_inspection_entrega"] || []).filter(f => f.type === "video").length > 0 && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">🎥 Vídeo da Inspeção Completa</h4>
                    <p className="text-muted-foreground">Vídeo gravado — disponível para visualização no sistema.</p>
                  </div>
                )}
                <div className="p-4 bg-muted/30 rounded-lg italic text-center text-sm">
                  "Reconheço que o carro foi me entregue com todos os itens acima mencionados."
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="text-center space-y-2">
                    <p className="font-semibold">Assinatura da Empresa</p>
                    {companySignature && <img src={companySignature} alt="Assinatura empresa" className="max-h-20 mx-auto border rounded" />}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-semibold">Assinatura do Motorista</p>
                    {driverSignature && <img src={driverSignature} alt="Assinatura motorista" className="max-h-20 mx-auto border rounded" />}
                  </div>
                </div>

                {/* Security Metadata */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border text-xs space-y-1">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">🔒 Registo de Segurança</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" /> <strong>Data/Hora:</strong> {new Date().toLocaleString("pt-PT")}</p>
                    <p className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-muted-foreground" /> <strong>Dispositivo:</strong> {getDeviceType()}</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /> <strong>GPS:</strong> {geoLocation.lat ? `${geoLocation.lat.toFixed(6)}, ${geoLocation.lng?.toFixed(6)}` : "Não disponível"}</p>
                    <p>👤 <strong>Operador:</strong> {operatorInfo.name || operatorInfo.email || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ RECOLHA STEPS ============ */}

          {/* Step 1 Recolha: Select existing delivery */}
          {currentStep === 0 && operationType === "recolha" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5" /> Selecionar Entrega Existente
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecione a entrega à qual deseja vincular esta recolha. Os dados do motorista e veículo serão preenchidos automaticamente.
              </p>
              {deliveryRecords.length === 0 ? (
                <Card className="bg-warning/5 border-warning/30">
                  <CardContent className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
                    <p className="font-medium">Nenhuma entrega registrada</p>
                    <p className="text-sm text-muted-foreground">É necessário ter pelo menos uma entrega cadastrada para realizar uma recolha.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {deliveryRecords.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-2",
                        selectedDeliveryId === delivery.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleSelectDelivery(delivery.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              selectedDeliveryId === delivery.id ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {selectedDeliveryId === delivery.id ? <Check className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-semibold">{delivery.driverName}</p>
                              <p className="text-sm text-muted-foreground">{delivery.plate} - {delivery.model}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{delivery.date}</p>
                            <p className="text-muted-foreground">KM: {delivery.kmInitial}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 Recolha: Data (auto-filled + manual fields) */}
          {currentStep === 1 && operationType === "recolha" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold">Dados da Recolha</h3>
              {selectedDelivery && (
                <Card className="bg-muted/30 border-primary/20">
                  <CardContent className="p-4 space-y-1 text-sm">
                    <p className="text-xs font-semibold text-primary mb-2">📋 Dados da Entrega Vinculada</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Motorista:</strong> {selectedDelivery.driverName}</div>
                      <div><strong>Veículo:</strong> {selectedDelivery.plate} - {selectedDelivery.model}</div>
                      <div><strong>Data Entrega:</strong> {selectedDelivery.date}</div>
                      <div><strong>KM Entrega:</strong> {selectedDelivery.kmInitial}</div>
                      <div><strong>Combustível Entrega:</strong> {selectedDelivery.fuelLevel}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>KM Final *</Label>
                  <Input
                    type="number"
                    value={form.kmInitial}
                    onChange={(e) => setForm({ ...form, kmInitial: e.target.value })}
                    placeholder="Quilometragem atual"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Combustível</Label>
                  <div className="flex gap-2">
                    {(["1/4", "1/2", "3/4", "cheio"] as FuelLevel[]).map((level) => (
                      <Button key={level} type="button" variant={form.fuelLevel === level ? "default" : "outline"} size="sm"
                        onClick={() => setForm({ ...form, fuelLevel: level })}>{level}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data da Devolução</Label>
                  <Input type="date" value={form.operationDate} onChange={(e) => setForm({ ...form, operationDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t">
                <Label>📷 Mídia Geral da Recolha</Label>
                <MediaCapture mediaKey="general_recolha" media={form.mediaFiles} onMediaChange={handleMediaChange} />
              </div>
            </div>
          )}

          {/* Step 3 Recolha: Missing items with comparison */}
          {currentStep === 2 && operationType === "recolha" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold">Itens em Falta</h3>
              <p className="text-sm text-muted-foreground">Compare os itens entregues e marque os que estão em falta na devolução:</p>
              {items.map((item) => {
                const wasDelivered = selectedDelivery?.checkedItems[item.id];
                return (
                  <div key={item.id} className={cn(
                    "p-3 rounded-lg border space-y-2",
                    form.missingItems[item.id] && "bg-destructive/5 border-l-4 border-l-destructive"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={form.missingItems[item.id] || false}
                          onCheckedChange={(v) => setForm({ ...form, missingItems: { ...form.missingItems, [item.id]: !!v } })}
                        />
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {wasDelivered ? (
                              <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Entregue</span>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="w-3 h-3" /> Não entregue</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-success/10 text-success px-2 py-1 rounded-full">
                        €{item.replacementValue.toFixed(2)}
                      </span>
                    </div>
                    {form.missingItems[item.id] && (
                      <div className="ml-8">
                        <MediaCapture mediaKey={`missing_${item.id}`} media={form.mediaFiles} onMediaChange={handleMediaChange} compact />
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg font-semibold">
                <span>Total em Itens:</span>
                <span className="text-lg">€{totalMissing.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Step 4 Recolha: New damages - selection only, NO values */}
          {currentStep === 3 && operationType === "recolha" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold">Novos Danos Identificados</h3>

              {/* Show existing delivery damages for reference */}
              {selectedDelivery && selectedDelivery.damages.filter(d => d.types.length > 0).length > 0 && (
                <Card className="bg-muted/30 border-primary/20">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-primary">📋 Danos registrados na Entrega</p>
                    {selectedDelivery.damages.filter(d => d.types.length > 0).map(d => (
                      <div key={d.part} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        <strong>{d.part}:</strong> {d.types.join(", ")}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                ⚠️ Selecione as partes danificadas. Os valores serão definidos na próxima etapa.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VehicleDiagram damages={form.newDamages} onPartClick={setSelectedPart} vehicleParts={partNames} />
                <div className="space-y-4">
                  <DamagePanel
                    selectedPart={selectedPart}
                    damages={form.newDamages}
                    onToggleDamage={(part, type) => toggleDamage(part, type)}
                    onSetPartStatus={(part, status) => setPartStatus(part, status)}
                    onClose={() => setSelectedPart(null)}
                  />
                  {selectedPart && (
                    <div className="ml-1">
                      <MediaCapture mediaKey={`new_part_${selectedPart}`} media={form.mediaFiles} onMediaChange={handleMediaChange} />
                    </div>
                  )}
                  <PartsList damages={form.newDamages} onPartClick={setSelectedPart} vehicleParts={partNames} />
                  {form.newDamages.filter((d) => d.types.length > 0).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Danos Selecionados:</h4>
                      {form.newDamages.filter((d) => d.types.length > 0).map((d) => {
                        const deliveryDamage = selectedDelivery?.damages.find(dd => dd.part === d.part);
                        return (
                          <div key={d.part} className="p-2 bg-warning/5 rounded border-l-2 border-warning text-xs space-y-1">
                            <div>
                              <strong>{d.part}:</strong> {d.types.join(", ")}
                              {deliveryDamage && (
                                <span className="ml-2 text-muted-foreground">(Na entrega: {deliveryDamage.types.join(", ")})</span>
                              )}
                            </div>
                            <MediaCapture mediaKey={`new_damage_${d.part}`} media={form.mediaFiles} onMediaChange={handleMediaChange} compact />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Full inspection video */}
              <FullInspectionVideo
                mediaKey="full_inspection_recolha"
                media={form.mediaFiles}
                onMediaChange={handleMediaChange}
              />
            </div>
          )}

          {/* Step 5 Recolha: Financial evaluation of damages */}
          {currentStep === 4 && operationType === "recolha" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold">Avaliação Financeira</h3>
              <p className="text-sm text-muted-foreground">Defina os valores para cada item danificado ou em falta.</p>

              {/* Missing items summary */}
              {Object.values(form.missingItems).some(Boolean) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">❌ Itens em Falta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.filter(i => form.missingItems[i.id]).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border text-sm">
                        <span>{item.name}</span>
                        <span className="font-semibold">€{item.replacementValue.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Subtotal Itens:</span>
                      <span>€{totalMissing.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Damaged parts with value inputs */}
              {form.newDamages.filter(d => d.types.length > 0).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">⚠️ Novos Danos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {form.newDamages.filter(d => d.types.length > 0).map((d) => {
                      const configuredPart = vehicleParts.find(p => p.name === d.part);
                      return (
                        <div key={d.part} className="p-3 bg-warning/5 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{d.part}</span>
                              <span className="ml-2 text-xs text-muted-foreground">({d.types.join(", ")})</span>
                            </div>
                            {configuredPart && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    newDamages: prev.newDamages.map((nd) =>
                                      nd.part === d.part ? { ...nd, value: configuredPart.damageValue } : nd
                                    ),
                                  }));
                                }}
                              >
                                Usar padrão (€{configuredPart.damageValue.toFixed(2)})
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Valor (€):</Label>
                            <Input
                              type="number"
                              className="w-28 h-8 text-sm"
                              value={d.value || ""}
                              placeholder={configuredPart ? String(configuredPart.damageValue) : "0.00"}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setForm((prev) => ({
                                  ...prev,
                                  newDamages: prev.newDamages.map((nd) =>
                                    nd.part === d.part ? { ...nd, value: val } : nd
                                  ),
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Subtotal Danos:</span>
                      <span>€{totalDamageValue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fuel penalty */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">⛽ Diferença de Combustível</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-muted rounded">
                      <span className="text-xs text-muted-foreground">Nível na Entrega</span>
                      <p className="font-semibold">{selectedDelivery?.fuelLevel || "-"}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-xs text-muted-foreground">Nível na Devolução</span>
                      <p className="font-semibold">{form.fuelLevel}</p>
                    </div>
                  </div>
                  {fuelPenalty > 0 ? (
                    <div className="p-3 bg-destructive/10 rounded border border-destructive/30 flex justify-between items-center">
                      <span className="text-destructive font-medium">Penalização de Combustível:</span>
                      <span className="font-bold text-destructive">€{fuelPenalty.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-success/10 rounded border border-success/30 text-success text-sm">
                      ✅ Nível de combustível igual ou superior ao da entrega — sem penalização.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grand total */}
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg font-bold text-lg">
                <span>Total de Penalizações:</span>
                <span className={totalPenalty > 0 ? "text-destructive" : "text-success"}>€{totalPenalty.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Step 6 Recolha: Final calculation + signatures */}
          {currentStep === 5 && operationType === "recolha" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold">Cálculo Final e Confirmação</h3>
              <Card className="bg-muted/30">
                <CardContent className="p-6 space-y-4">
                  <h4 className="font-semibold">💰 Resumo Financeiro</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Itens em Falta ({Object.values(form.missingItems).filter(Boolean).length})</span>
                      <span className="font-semibold">€{totalMissing.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Novos Danos ({form.newDamages.filter((d) => d.types.length > 0).length})</span>
                      <span className="font-semibold">€{totalDamageValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diferença de Combustível</span>
                      <span className="font-semibold">€{fuelPenalty.toFixed(2)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total de Penalizações</span>
                      <span className={totalPenalty > 0 ? "text-destructive" : "text-success"}>€{totalPenalty.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison summary */}
              {selectedDelivery && (
                <Card className="border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm">📊 Comparativo Entrega vs Recolha</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">ENTREGA</p>
                        <p>KM: {selectedDelivery.kmInitial}</p>
                        <p>Combustível: {selectedDelivery.fuelLevel}</p>
                        <p>Data: {selectedDelivery.date}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">RECOLHA</p>
                        <p>KM: {form.kmInitial}</p>
                        <p>Combustível: {form.fuelLevel}</p>
                        <p>Data: {form.operationDate}</p>
                      </div>
                    </div>
                    {form.kmInitial && selectedDelivery.kmInitial && (
                      <div className="text-sm p-2 bg-muted rounded">
                        <strong>KM Percorridos:</strong> {Math.max(0, Number(form.kmInitial) - Number(selectedDelivery.kmInitial))} km
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignaturePad label="✍️ Assinatura da Empresa *" onSignatureChange={setCompanySignature} />
                <SignaturePad label="✍️ Assinatura do Motorista *" onSignatureChange={setDriverSignature} />
              </div>
            </div>
          )}

          {/* Step 7 Recolha: PDF Preview */}
          {currentStep === 6 && operationType === "recolha" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-success" /> Documento de Recolha Gerado
              </h3>
              <div className="border rounded-lg p-6 space-y-6 bg-background" id="checklist-pdf-recolha">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">Termo de Recolha de Veículo</h2>
                  <p className="text-muted-foreground text-sm">Sistema TVDE Pro - Gestão de Frota</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Dados do Motorista</h4>
                    <p><strong>Nome:</strong> {form.driverName}</p>
                    <p><strong>NIF:</strong> {driverNif || form.driverDocument}</p>
                    <p><strong>Morada:</strong> {driverAddress || "—"}</p>
                    <p><strong>Email:</strong> {form.driverEmail || "—"}</p>
                    <p><strong>Contacto:</strong> {form.driverContact}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Dados do Veículo</h4>
                    <p><strong>Matrícula:</strong> {form.plate}</p>
                    <p><strong>Modelo:</strong> {form.model}</p>
                  </div>
                </div>

                {/* Comparison table */}
                {selectedDelivery && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">📊 Comparativo</h4>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">Campo</th>
                          <th className="border p-2 text-left">Entrega</th>
                          <th className="border p-2 text-left">Recolha</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2 font-medium">Data</td>
                          <td className="border p-2">{selectedDelivery.date}</td>
                          <td className="border p-2">{form.operationDate}</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">KM</td>
                          <td className="border p-2">{selectedDelivery.kmInitial}</td>
                          <td className="border p-2">{form.kmInitial}</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">Combustível</td>
                          <td className="border p-2">{selectedDelivery.fuelLevel}</td>
                          <td className="border p-2">{form.fuelLevel}</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">KM Percorridos</td>
                          <td className="border p-2" colSpan={2}>
                            {Math.max(0, Number(form.kmInitial) - Number(selectedDelivery.kmInitial))} km
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Missing items */}
                {Object.values(form.missingItems).some(Boolean) && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2 text-destructive">❌ Itens em Falta</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {items.filter(i => form.missingItems[i.id]).map(item => (
                        <li key={item.id}>{item.name} — €{item.replacementValue.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Delivery damages */}
                {selectedDelivery && selectedDelivery.damages.filter(d => d.types.length > 0).length > 0 && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">Danos na Entrega</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {selectedDelivery.damages.filter(d => d.types.length > 0).map(d => (
                        <li key={d.part}><strong>{d.part}:</strong> {d.types.join(", ")}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* New damages */}
                {form.newDamages.filter(d => d.types.length > 0).length > 0 && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2 text-warning">⚠️ Novos Danos</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {form.newDamages.filter(d => d.types.length > 0).map(d => (
                        <li key={d.part}><strong>{d.part}:</strong> {d.types.join(", ")} {d.value ? `— €${d.value.toFixed(2)}` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(form.mediaFiles["full_inspection_recolha"] || []).filter(f => f.type === "video").length > 0 && (
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">🎥 Vídeo da Inspeção Completa</h4>
                    <p className="text-muted-foreground">Vídeo gravado — disponível para visualização no sistema.</p>
                  </div>
                )}

                {/* Financial summary */}
                <div className="p-4 bg-muted/30 rounded-lg text-sm">
                  <h4 className="font-semibold mb-2">💰 Resumo Financeiro</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Itens em Falta:</span><span>€{totalMissing.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Novos Danos:</span><span>€{totalDamageValue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Diferença de Combustível:</span><span>€{fuelPenalty.toFixed(2)}</span></div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Penalizações:</span>
                      <span className={totalPenalty > 0 ? "text-destructive" : "text-success"}>€{totalPenalty.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg italic text-center text-sm">
                  "Reconheço que devolvi o veículo nas condições acima descritas."
                </div>

                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="text-center space-y-2">
                    <p className="font-semibold">Assinatura da Empresa</p>
                    {companySignature && <img src={companySignature} alt="Assinatura empresa" className="max-h-20 mx-auto border rounded" />}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-semibold">Assinatura do Motorista</p>
                    {driverSignature && <img src={driverSignature} alt="Assinatura motorista" className="max-h-20 mx-auto border rounded" />}
                  </div>
                </div>

                {/* Security Metadata */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border text-xs space-y-1">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">🔒 Registo de Segurança</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" /> <strong>Data/Hora:</strong> {new Date().toLocaleString("pt-PT")}</p>
                    <p className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-muted-foreground" /> <strong>Dispositivo:</strong> {getDeviceType()}</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /> <strong>GPS:</strong> {geoLocation.lat ? `${geoLocation.lat.toFixed(6)}, ${geoLocation.lng?.toFixed(6)}` : "Não disponível"}</p>
                    <p>👤 <strong>Operador:</strong> {operatorInfo.name || operatorInfo.email || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Anterior
        </Button>
        {/* Entrega navigation */}
        {operationType === "entrega" && currentStep === 4 ? (
          <Button onClick={handleFinishDocument} className="gap-2 bg-success hover:bg-success/90">
            <Check className="w-4 h-4" /> Finalizar
          </Button>
        ) : operationType === "entrega" && currentStep === 3 ? (
          <Button onClick={handleFinalizeEntrega} disabled={isSubmitting} className="gap-2 bg-success hover:bg-success/90">
            <FileDown className="w-4 h-4" /> {isSubmitting ? "A gerar..." : "Gerar Documento"}
          </Button>
        ) : operationType === "recolha" && currentStep === 6 ? (
          <Button onClick={handleFinishDocument} className="gap-2 bg-success hover:bg-success/90">
            <Check className="w-4 h-4" /> Finalizar
          </Button>
        ) : operationType === "recolha" && currentStep === 5 ? (
          <Button onClick={handleFinalizeRecolha} disabled={isSubmitting} className="gap-2 bg-success hover:bg-success/90">
            <FileDown className="w-4 h-4" /> {isSubmitting ? "A gerar..." : "Gerar Documento"}
          </Button>
        ) : (
          <Button onClick={handleNext} className="gap-2" disabled={operationType === "recolha" && currentStep === 0 && deliveryRecords.length === 0}>
            Próxima Etapa <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
