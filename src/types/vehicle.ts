export interface Vehicle {
  id: string;
  plate: string;
  plateDate: string;
  brand: string;
  model: string;
  color: string;
  fuel: string;
  seats: number;
  doors: number;
  owner: string;
  status: "active" | "maintenance" | "inactive";
  mainPhoto?: string;
  gallery?: string[];
  documents: {
    cartaVerde: { valid: boolean; expiry: string };
    inspecaoTVDE: { valid: boolean; expiry: string };
    uberExpiry: string;
    boltExpiry: string;
  };
}

export interface VehicleDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  expiryDate?: string;
  uploadedAt: string;
}

export interface VehicleFine {
  id: string;
  vehicleId: string;
  driverId: string;
  driverName: string;
  date: string;
  location: string;
  description: string;
  amount: number;
  status: "pending" | "paid" | "contested";
  type: "speeding" | "parking" | "red_light" | "other";
  notificationNumber?: string;
}

export interface VehicleClaim {
  id: string;
  vehicleId: string;
  driverId: string;
  driverName: string;
  accidentDate: string;
  expertiseDate?: string;
  expertiseDone: boolean;
  insuranceCompany: string;
  policyNumber: string;
  processNumber: string;
  damagedItems: string[];
  description: string;
  photos: string[];
  occurrenceReport?: string;
  status: "open" | "in_progress" | "closed";
}

export const mockVehicles: Vehicle[] = [
  {
    id: "1",
    plate: "AB-12-CD",
    plateDate: "2022-03-15",
    brand: "Tesla",
    model: "Model 3",
    color: "Branco",
    fuel: "Elétrico",
    seats: 5,
    doors: 4,
    owner: "Auto Lisboa Lda",
    status: "active",
    documents: {
      cartaVerde: { valid: false, expiry: "2024-02-01" },
      inspecaoTVDE: { valid: true, expiry: "2024-08-15" },
      uberExpiry: "2024-12-31",
      boltExpiry: "2024-12-31",
    },
  },
  {
    id: "2",
    plate: "EF-34-GH",
    plateDate: "2021-07-20",
    brand: "Mercedes",
    model: "Classe E",
    color: "Preto",
    fuel: "Híbrido",
    seats: 5,
    doors: 4,
    owner: "João Ferreira",
    status: "active",
    documents: {
      cartaVerde: { valid: true, expiry: "2024-06-30" },
      inspecaoTVDE: { valid: false, expiry: "2024-01-28" },
      uberExpiry: "2024-12-31",
      boltExpiry: "2024-12-31",
    },
  },
  {
    id: "3",
    plate: "IJ-56-KL",
    plateDate: "2023-01-10",
    brand: "BMW",
    model: "Série 5",
    color: "Cinza",
    fuel: "Diesel",
    seats: 5,
    doors: 4,
    owner: "TVDE Porto SA",
    status: "maintenance",
    documents: {
      cartaVerde: { valid: true, expiry: "2024-09-15" },
      inspecaoTVDE: { valid: true, expiry: "2024-10-20" },
      uberExpiry: "2024-12-31",
      boltExpiry: "2024-12-31",
    },
  },
  {
    id: "4",
    plate: "MN-78-OP",
    plateDate: "2020-11-05",
    brand: "Audi",
    model: "A4",
    color: "Azul",
    fuel: "Gasolina",
    seats: 5,
    doors: 4,
    owner: "Carlos Mendes",
    status: "inactive",
    documents: {
      cartaVerde: { valid: false, expiry: "2023-12-15" },
      inspecaoTVDE: { valid: false, expiry: "2023-11-30" },
      uberExpiry: "2023-12-31",
      boltExpiry: "2023-12-31",
    },
  },
];

export const mockFines: VehicleFine[] = [
  {
    id: "f1",
    vehicleId: "1",
    driverId: "d1",
    driverName: "Manuel Silva",
    date: "2024-01-15",
    location: "A1, km 45",
    description: "Excesso de velocidade - 130km/h em zona de 100km/h",
    amount: 120,
    status: "pending",
    type: "speeding",
    notificationNumber: "NOT-2024-001234",
  },
  {
    id: "f2",
    vehicleId: "2",
    driverId: "d2",
    driverName: "Ana Costa",
    date: "2024-01-20",
    location: "Lisboa, Av. da Liberdade",
    description: "Estacionamento em zona proibida",
    amount: 60,
    status: "paid",
    type: "parking",
    notificationNumber: "NOT-2024-001567",
  },
];

export const mockClaims: VehicleClaim[] = [
  {
    id: "c1",
    vehicleId: "1",
    driverId: "d1",
    driverName: "Manuel Silva",
    accidentDate: "2024-01-10",
    expertiseDate: "2024-01-25",
    expertiseDone: false,
    insuranceCompany: "Fidelidade",
    policyNumber: "POL-2024-789456",
    processNumber: "PROC-2024-001",
    damagedItems: ["Para-choques dianteiro", "Farol esquerdo", "Capô"],
    description: "Colisão traseira em semáforo vermelho",
    photos: [],
    status: "in_progress",
  },
  {
    id: "c2",
    vehicleId: "3",
    driverId: "d3",
    driverName: "Pedro Santos",
    accidentDate: "2023-12-20",
    expertiseDate: "2023-12-28",
    expertiseDone: true,
    insuranceCompany: "Allianz",
    policyNumber: "POL-2023-654321",
    processNumber: "PROC-2023-089",
    damagedItems: ["Espelho retrovisor direito"],
    description: "Vandalismo no estacionamento",
    photos: [],
    status: "closed",
  },
];
