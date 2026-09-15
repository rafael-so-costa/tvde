export interface Driver {
  id: string;
  name: string;
  documentType: "passport" | "residence_permit" | "citizen_card";
  documentNumber: string;
  documentExpiry: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  iban: string;
  status: "active" | "pending" | "inactive";
  contractCount: number;
  profilePhoto?: string;
  birthDate?: string;
  // Documents
  documents?: DriverDocument[];
}

export interface DriverDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  expiryDate?: string;
  uploadedAt: string;
}

export const documentTypeLabels = {
  passport: "Passaporte",
  residence_permit: "Título de Residência",
  citizen_card: "Cartão de Cidadão",
};

export const statusStyles = {
  active: "badge-success",
  pending: "badge-warning",
  inactive: "badge-destructive",
};

export const statusLabels = {
  active: "Ativo",
  pending: "Pendente",
  inactive: "Inativo",
};

export const mockDrivers: Driver[] = [
  {
    id: "1",
    name: "Carlos Santos",
    documentType: "citizen_card",
    documentNumber: "12345678",
    documentExpiry: "2028-05-15",
    nif: "234567890",
    email: "carlos.santos@email.pt",
    phone: "+351 912 345 678",
    address: "Rua Augusta 45, Lisboa",
    iban: "PT50 0002 0123 1234 5678 9015 4",
    status: "active",
    contractCount: 3,
    birthDate: "1988-06-15",
    documents: [],
  },
  {
    id: "2",
    name: "Maria Silva",
    documentType: "residence_permit",
    documentNumber: "TR789012",
    documentExpiry: "2025-03-20",
    nif: "345678901",
    email: "maria.silva@email.pt",
    phone: "+351 923 456 789",
    address: "Av. dos Aliados 123, Porto",
    iban: "PT50 0002 0123 1234 5678 9016 5",
    status: "active",
    contractCount: 2,
    birthDate: "1992-11-20",
    documents: [],
  },
  {
    id: "3",
    name: "António Costa",
    documentType: "citizen_card",
    documentNumber: "87654321",
    documentExpiry: "2026-11-30",
    nif: "456789012",
    email: "antonio.costa@email.pt",
    phone: "+351 934 567 890",
    address: "Rua de Santa Catarina 78, Porto",
    iban: "PT50 0002 0123 1234 5678 9017 6",
    status: "pending",
    contractCount: 0,
    birthDate: "1995-04-08",
    documents: [],
  },
  {
    id: "4",
    name: "Pedro Almeida",
    documentType: "passport",
    documentNumber: "P1234567",
    documentExpiry: "2024-02-28",
    nif: "567890123",
    email: "pedro.almeida@email.pt",
    phone: "+351 945 678 901",
    address: "Rua Ferreira Borges 56, Coimbra",
    iban: "PT50 0002 0123 1234 5678 9018 7",
    status: "inactive",
    contractCount: 1,
    birthDate: "1985-09-30",
    documents: [],
  },
];
