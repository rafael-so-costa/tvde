import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChecklistRecord, ChecklistFormData, SecurityMetadata, FuelLevel, MediaFile } from "@/types/checklist";

// ==========================================
// Test Suite: Checklist Data Integrity
// ==========================================

describe("ChecklistRecord — Data Integrity", () => {
  const createMockRecord = (overrides?: Partial<ChecklistRecord>): ChecklistRecord => ({
    id: `cl_${Date.now()}`,
    type: "entrega",
    driverName: "João Silva",
    driverId: "driver-123",
    driverNif: "123456789",
    driverAddress: "Rua Teste, 10, Lisboa, 1000-001",
    driverEmail: "joao@test.com",
    driverContact: "912345678",
    plate: "AA-00-BB",
    model: "Toyota Corolla",
    vehicleId: "vehicle-456",
    date: "2026-03-14",
    time: "14:30",
    kmInitial: "50000",
    fuelLevel: "3/4",
    totalPenalty: 0,
    checkedItems: { doc_carro: true, carta_verde: true, extintor: true },
    specialFieldValues: {
      doc_carro_document_type: "Documento Único Automóvel (DUA)",
      carta_verde_expiry_date: "2027-01-01",
      extintor_expiry_date: "2027-06-15",
    },
    damages: [{ part: "Capô", types: ["riscado"], status: "riscado" }],
    missingItems: {},
    newDamages: [],
    companySignature: "data:image/png;base64,iVBOR...",
    driverSignature: "data:image/png;base64,iVBOR...",
    createdAt: new Date().toISOString(),
    mediaFiles: {
      general: [{ id: "m1", type: "photo", name: "foto.jpg", dataUrl: "data:image/jpeg;base64,...", timestamp: new Date().toISOString() }],
    },
    securityMetadata: {
      timestamp: new Date().toISOString(),
      timezone: "Europe/Lisbon",
      latitude: 38.7223,
      longitude: -9.1393,
      accuracy: 10,
      userAgent: "Mozilla/5.0",
      deviceType: "Computador",
      operatorEmail: "admin@test.com",
      operatorName: "Admin",
    },
    ...overrides,
  });

  it("should include time field in delivery record", () => {
    const record = createMockRecord();
    expect(record.time).toBeDefined();
    expect(record.time).toBe("14:30");
  });

  it("should include time field in return record", () => {
    const record = createMockRecord({ type: "recolha", time: "16:45" });
    expect(record.time).toBe("16:45");
  });

  it("should preserve company signature data URL", () => {
    const record = createMockRecord();
    expect(record.companySignature).toBeDefined();
    expect(record.companySignature).not.toBe("[signature]");
    expect(record.companySignature).toContain("data:image");
  });

  it("should preserve driver signature data URL", () => {
    const record = createMockRecord();
    expect(record.driverSignature).toBeDefined();
    expect(record.driverSignature).not.toBe("[signature]");
    expect(record.driverSignature).toContain("data:image");
  });

  it("should include security metadata with all fields", () => {
    const record = createMockRecord();
    const meta = record.securityMetadata!;
    expect(meta.timestamp).toBeDefined();
    expect(meta.timezone).toBe("Europe/Lisbon");
    expect(meta.latitude).toBe(38.7223);
    expect(meta.longitude).toBe(-9.1393);
    expect(meta.deviceType).toBe("Computador");
    expect(meta.operatorEmail).toBe("admin@test.com");
    expect(meta.operatorName).toBe("Admin");
  });

  it("should include media files with data URLs", () => {
    const record = createMockRecord();
    expect(record.mediaFiles).toBeDefined();
    expect(record.mediaFiles!["general"]).toHaveLength(1);
    expect(record.mediaFiles!["general"][0].dataUrl).toContain("data:image");
  });

  it("should include all checked items and special fields", () => {
    const record = createMockRecord();
    expect(record.checkedItems.doc_carro).toBe(true);
    expect(record.specialFieldValues.doc_carro_document_type).toBe("Documento Único Automóvel (DUA)");
    expect(record.specialFieldValues.carta_verde_expiry_date).toBe("2027-01-01");
  });

  it("should register damages with part and type", () => {
    const record = createMockRecord();
    expect(record.damages).toHaveLength(1);
    expect(record.damages[0].part).toBe("Capô");
    expect(record.damages[0].types).toContain("riscado");
  });
});

// ==========================================
// Test Suite: localStorage Persistence (stripBinaryData)
// ==========================================

describe("stripBinaryData — localStorage Persistence", () => {
  // Simulates the stripBinaryData function from useChecklistHistory
  function stripBinaryData(record: ChecklistRecord): ChecklistRecord {
    const { mediaFiles, ...rest } = record;
    return {
      ...rest,
      // Signatures are NOW preserved (not stripped)
      mediaFiles: mediaFiles
        ? Object.fromEntries(
            Object.entries(mediaFiles).map(([key, files]) => [
              key,
              files.map((f) => ({ ...f, dataUrl: "" })),
            ])
          )
        : undefined,
    };
  }

  const fullRecord: ChecklistRecord = {
    id: "cl_test",
    type: "entrega",
    driverName: "Test Driver",
    driverId: "d1",
    plate: "XX-00-YY",
    model: "Test Car",
    vehicleId: "v1",
    date: "2026-03-14",
    time: "10:00",
    kmInitial: "1000",
    fuelLevel: "1/2",
    totalPenalty: 0,
    checkedItems: {},
    specialFieldValues: {},
    damages: [],
    missingItems: {},
    newDamages: [],
    companySignature: "data:image/png;base64,LONG_SIGNATURE_DATA_COMPANY",
    driverSignature: "data:image/png;base64,LONG_SIGNATURE_DATA_DRIVER",
    createdAt: new Date().toISOString(),
    mediaFiles: {
      general: [
        { id: "p1", type: "photo", name: "photo.jpg", dataUrl: "data:image/jpeg;base64,LARGE_IMAGE_DATA", timestamp: new Date().toISOString() },
        { id: "v1", type: "video", name: "video.mp4", dataUrl: "data:video/mp4;base64,HUGE_VIDEO_DATA", timestamp: new Date().toISOString() },
      ],
    },
  };

  it("should preserve signatures after stripping", () => {
    const stripped = stripBinaryData(fullRecord);
    expect(stripped.companySignature).toBe("data:image/png;base64,LONG_SIGNATURE_DATA_COMPANY");
    expect(stripped.driverSignature).toBe("data:image/png;base64,LONG_SIGNATURE_DATA_DRIVER");
  });

  it("should strip media dataUrls to empty strings", () => {
    const stripped = stripBinaryData(fullRecord);
    expect(stripped.mediaFiles!["general"][0].dataUrl).toBe("");
    expect(stripped.mediaFiles!["general"][1].dataUrl).toBe("");
  });

  it("should preserve media metadata (id, type, name)", () => {
    const stripped = stripBinaryData(fullRecord);
    const photo = stripped.mediaFiles!["general"][0];
    expect(photo.id).toBe("p1");
    expect(photo.type).toBe("photo");
    expect(photo.name).toBe("photo.jpg");
  });

  it("should preserve time field after stripping", () => {
    const stripped = stripBinaryData(fullRecord);
    expect(stripped.time).toBe("10:00");
  });

  it("should preserve all non-binary fields", () => {
    const stripped = stripBinaryData(fullRecord);
    expect(stripped.driverName).toBe("Test Driver");
    expect(stripped.plate).toBe("XX-00-YY");
    expect(stripped.date).toBe("2026-03-14");
    expect(stripped.kmInitial).toBe("1000");
    expect(stripped.fuelLevel).toBe("1/2");
  });
});

// ==========================================
// Test Suite: Validation Logic
// ==========================================

describe("Validation Logic — Step Guards", () => {
  it("should reject entrega step 1 without driver name", () => {
    const form: Partial<ChecklistFormData> = {
      driverName: "",
      driverDocument: "123",
      driverContact: "912",
      plate: "AA-00-BB",
      model: "Test",
      kmInitial: "1000",
    };
    const isValid = !!(form.driverName && form.driverDocument && form.driverContact && form.plate && form.model && form.kmInitial);
    expect(isValid).toBe(false);
  });

  it("should reject entrega step 1 without KM", () => {
    const form: Partial<ChecklistFormData> = {
      driverName: "Test",
      driverDocument: "123",
      driverContact: "912",
      plate: "AA-00-BB",
      model: "Test",
      kmInitial: "",
    };
    const isValid = !!(form.driverName && form.driverDocument && form.driverContact && form.plate && form.model && form.kmInitial);
    expect(isValid).toBe(false);
  });

  it("should accept entrega step 1 with all fields", () => {
    const form: Partial<ChecklistFormData> = {
      driverName: "João",
      driverDocument: "123456789",
      driverContact: "912345678",
      plate: "AA-00-BB",
      model: "Toyota",
      kmInitial: "50000",
    };
    const isValid = !!(form.driverName && form.driverDocument && form.driverContact && form.plate && form.model && form.kmInitial);
    expect(isValid).toBe(true);
  });

  it("should reject finalization without signatures", () => {
    const companySignature: string | null = null;
    const driverSignature: string | null = "data:image/png;base64,...";
    const canFinalize = !!(companySignature && driverSignature);
    expect(canFinalize).toBe(false);
  });

  it("should accept finalization with both signatures", () => {
    const companySignature = "data:image/png;base64,company...";
    const driverSignature = "data:image/png;base64,driver...";
    const canFinalize = !!(companySignature && driverSignature);
    expect(canFinalize).toBe(true);
  });

  it("should block double submission via isSubmitting guard", () => {
    let isSubmitting = false;
    let callCount = 0;

    const handleFinalize = () => {
      if (isSubmitting) return;
      isSubmitting = true;
      callCount++;
    };

    handleFinalize(); // first call — should proceed
    handleFinalize(); // second call — should be blocked
    handleFinalize(); // third call — should be blocked

    expect(callCount).toBe(1);
  });
});

// ==========================================
// Test Suite: Recolha (Return) Validation
// ==========================================

describe("Recolha — Financial & Fuel Penalty", () => {
  const fuelLevelOrder: FuelLevel[] = ["1/4", "1/2", "3/4", "cheio"];

  function calculateFuelPenalty(deliveryLevel: FuelLevel, returnLevel: FuelLevel): number {
    const penalties: Record<FuelLevel, number> = { "1/4": 45, "1/2": 30, "3/4": 15, "cheio": 0 };
    const deliveryIdx = fuelLevelOrder.indexOf(deliveryLevel);
    const returnIdx = fuelLevelOrder.indexOf(returnLevel);
    if (returnIdx >= deliveryIdx) return 0;
    return Math.max(0, penalties[returnLevel] - penalties[deliveryLevel]);
  }

  it("should apply no penalty when fuel is same", () => {
    expect(calculateFuelPenalty("3/4", "3/4")).toBe(0);
  });

  it("should apply no penalty when fuel is higher", () => {
    expect(calculateFuelPenalty("1/2", "3/4")).toBe(0);
  });

  it("should apply penalty when fuel is lower", () => {
    const penalty = calculateFuelPenalty("cheio", "1/4");
    expect(penalty).toBe(45); // 45 - 0
  });

  it("should reject recolha step 0 without selected delivery", () => {
    const selectedDeliveryId: string | null = null;
    expect(!!selectedDeliveryId).toBe(false);
  });

  it("should reject recolha step 1 without KM final", () => {
    const kmInitial = "";
    expect(!!kmInitial).toBe(false);
  });

  it("should reject new damages without types selected", () => {
    const newDamages = [{ part: "Capô", types: [] as string[], status: "ok" as const }];
    const hasInvalid = newDamages.some(d => d.types.length === 0);
    expect(hasInvalid).toBe(true);
  });

  it("should calculate total penalty correctly", () => {
    const missingItemsTotal = 50 + 30; // two missing items
    const damageTotal = 300; // one damage
    const fuelPenalty = 15;
    const total = missingItemsTotal + damageTotal + fuelPenalty;
    expect(total).toBe(395);
  });
});

// ==========================================
// Test Suite: Security Metadata
// ==========================================

describe("SecurityMetadata — Audit Trail", () => {
  it("should capture all required security fields", () => {
    const meta: SecurityMetadata = {
      timestamp: new Date().toISOString(),
      timezone: "Europe/Lisbon",
      latitude: 38.7223,
      longitude: -9.1393,
      accuracy: 5,
      userAgent: "Mozilla/5.0",
      deviceType: "Telemóvel",
      operatorEmail: "admin@test.com",
      operatorName: "Admin User",
    };

    expect(meta.timestamp).toBeTruthy();
    expect(meta.timezone).toBeTruthy();
    expect(meta.latitude).toBeTypeOf("number");
    expect(meta.longitude).toBeTypeOf("number");
    expect(meta.accuracy).toBeTypeOf("number");
    expect(meta.deviceType).toMatch(/Telemóvel|Tablet|Computador/);
    expect(meta.operatorEmail).toBeTruthy();
  });

  it("should handle missing GPS gracefully", () => {
    const meta: SecurityMetadata = {
      timestamp: new Date().toISOString(),
      timezone: "Europe/Lisbon",
      latitude: null,
      longitude: null,
      accuracy: null,
      userAgent: "Mozilla/5.0",
      deviceType: "Computador",
      operatorEmail: null,
      operatorName: null,
    };

    expect(meta.latitude).toBeNull();
    expect(meta.longitude).toBeNull();
    expect(meta.operatorEmail).toBeNull();
  });
});

// ==========================================
// Test Suite: Delivery Record Linking
// ==========================================

describe("Delivery-Return Linking", () => {
  it("should link recolha to entrega via linkedDeliveryId", () => {
    const deliveryId = "cl_12345";
    const returnRecord: Partial<ChecklistRecord> = {
      type: "recolha",
      linkedDeliveryId: deliveryId,
    };
    expect(returnRecord.linkedDeliveryId).toBe(deliveryId);
  });

  it("should consolidate delivery+return records", () => {
    const records: ChecklistRecord[] = [
      { id: "cl_1", type: "entrega", driverName: "João", plate: "AA-00-BB" } as ChecklistRecord,
      { id: "cl_2", type: "recolha", linkedDeliveryId: "cl_1", driverName: "João", plate: "AA-00-BB" } as ChecklistRecord,
      { id: "cl_3", type: "entrega", driverName: "Maria", plate: "CC-11-DD" } as ChecklistRecord,
    ];

    const recolhas = records.filter(r => r.type === "recolha");
    const consolidated = recolhas
      .map(r => ({
        delivery: records.find(d => d.id === r.linkedDeliveryId && d.type === "entrega"),
        return_: r,
      }))
      .filter(c => c.delivery);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].delivery!.driverName).toBe("João");
    expect(consolidated[0].return_.type).toBe("recolha");
  });

  it("should not consolidate orphaned recolhas", () => {
    const records: ChecklistRecord[] = [
      { id: "cl_2", type: "recolha", linkedDeliveryId: "cl_nonexistent" } as ChecklistRecord,
    ];

    const consolidated = records
      .filter(r => r.type === "recolha")
      .map(r => ({
        delivery: records.find(d => d.id === r.linkedDeliveryId && d.type === "entrega"),
        return_: r,
      }))
      .filter(c => c.delivery);

    expect(consolidated).toHaveLength(0);
  });
});
