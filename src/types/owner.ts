export interface Owner {
  id: string;
  type: "company" | "individual";
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  vehicleCount: number;
  status: "active" | "pending" | "inactive";
  profilePhoto?: string;
  birthDate?: string;
  // Company specific
  companyName?: string;
  socialCapital?: string;
  managerName?: string;
  certidaoPermanente?: string;
  certidaoValidade?: string;
  tvdeCertificate?: string;
  tvdeCertificateValidity?: string;
  // Documents
  documents?: OwnerDocument[];
}

export interface OwnerDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  expiryDate?: string;
  uploadedAt: string;
}

export const mockOwners: Owner[] = [
  {
    id: "1",
    type: "company",
    name: "Auto Lisboa Lda",
    companyName: "Auto Lisboa Lda",
    nif: "509123456",
    email: "geral@autolisboa.pt",
    phone: "+351 912 345 678",
    address: "Av. da Liberdade 123, Lisboa",
    vehicleCount: 12,
    status: "active",
    socialCapital: "50.000€",
    managerName: "António Silva",
    certidaoPermanente: "1234-5678-9012",
    certidaoValidade: "2025-06-15",
    tvdeCertificate: "TVDE-2024-0045",
    tvdeCertificateValidity: "2025-12-31",
    birthDate: "1980-05-15",
    documents: [],
  },
  {
    id: "2",
    type: "company",
    name: "TVDE Porto SA",
    companyName: "TVDE Porto SA",
    nif: "509654321",
    email: "info@tvdeporto.pt",
    phone: "+351 923 456 789",
    address: "Rua de Santa Catarina 456, Porto",
    vehicleCount: 8,
    status: "active",
    socialCapital: "100.000€",
    managerName: "Maria Santos",
    birthDate: "1975-08-22",
    documents: [],
  },
  {
    id: "3",
    type: "individual",
    name: "João Ferreira",
    nif: "234567890",
    email: "joao.ferreira@email.pt",
    phone: "+351 934 567 890",
    address: "Rua das Flores 78, Coimbra",
    vehicleCount: 2,
    status: "active",
    birthDate: "1985-03-10",
    documents: [],
  },
  {
    id: "4",
    type: "individual",
    name: "Carlos Mendes",
    nif: "345678901",
    email: "carlos.mendes@email.pt",
    phone: "+351 945 678 901",
    address: "Av. Central 234, Braga",
    vehicleCount: 1,
    status: "pending",
    birthDate: "1990-12-05",
    documents: [],
  },
  {
    id: "5",
    type: "individual",
    name: "Ricardo Silva",
    nif: "456789012",
    email: "ricardo.silva@email.pt",
    phone: "+351 956 789 012",
    address: "Rua Principal 100, Faro",
    vehicleCount: 0,
    status: "inactive",
    birthDate: "1988-07-20",
    documents: [],
  },
];
