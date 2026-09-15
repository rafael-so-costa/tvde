import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface IncompleteProfileAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: string[];
  entityType: "proprietário" | "motorista" | "veículo";
  onConfirm: () => void;
}

export function IncompleteProfileAlert({
  open,
  onOpenChange,
  missingFields,
  entityType,
  onConfirm,
}: IncompleteProfileAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            Perfil Incompleto
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              O perfil do {entityType} será guardado com status <strong className="text-warning">"Incompleto"</strong> porque 
              os seguintes dados obrigatórios não foram preenchidos:
            </p>
            <ul className="list-disc list-inside space-y-1 bg-muted p-3 rounded-lg text-sm">
              {missingFields.map((field, index) => (
                <li key={index} className="text-muted-foreground">{field}</li>
              ))}
            </ul>
            <p className="text-sm">
              O {entityType} <strong>não ficará ativo</strong> até que todos os dados sejam preenchidos.
              Pode editar o perfil mais tarde para completar o cadastro.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar e Preencher</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-warning hover:bg-warning/90">
            Guardar Mesmo Assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Validation helper functions
export interface OwnerValidation {
  isComplete: boolean;
  missingFields: string[];
}

export function validateOwnerProfile(
  formData: any, 
  address: any, 
  isEmpresa: boolean
): OwnerValidation {
  const missingFields: string[] = [];

  // Common required fields
  if (!formData.nif) missingFields.push("NIF");
  if (!formData.email) missingFields.push("Email");
  if (!formData.telemovel) missingFields.push("Telemóvel");

  // Address fields
  if (!address.rua) missingFields.push("Rua");
  if (!address.cidade) missingFields.push("Cidade");
  if (!address.cep) missingFields.push("Código Postal");

  if (isEmpresa) {
    // Company specific
    if (!formData.nome_empresa) missingFields.push("Nome da Empresa");
    if (!formData.nome_gerente) missingFields.push("Nome do Gerente");
    if (!formData.certidao_permanente) missingFields.push("Certidão Permanente");
    if (!formData.certidao_valid_until) missingFields.push("Validade da Certidão");
    if (!formData.certificado_tvde) missingFields.push("Certificado TVDE");
    if (!formData.certificado_tvde_valid_until) missingFields.push("Validade Certificado TVDE");
  } else {
    // Individual specific
    if (!formData.nome_completo) missingFields.push("Nome Completo");
    if (!formData.data_nascimento) missingFields.push("Data de Nascimento");
    if (!formData.tipo_documento) missingFields.push("Tipo de Documento");
    if (!formData.numero_documento) missingFields.push("Número do Documento");
    if (!formData.documento_valid_until) missingFields.push("Validade do Documento");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

export interface DriverValidation {
  isComplete: boolean;
  missingFields: string[];
}

export function validateDriverProfile(formData: any, address: any): DriverValidation {
  const missingFields: string[] = [];

  // Required fields
  if (!formData.nome_completo) missingFields.push("Nome Completo");
  if (!formData.nif) missingFields.push("NIF");
  if (!formData.email) missingFields.push("Email");
  if (!formData.telemovel) missingFields.push("Telemóvel");
  if (!formData.data_nascimento) missingFields.push("Data de Nascimento");

  // Address fields
  if (!address.rua) missingFields.push("Rua");
  if (!address.cidade) missingFields.push("Cidade");
  if (!address.cep) missingFields.push("Código Postal");

  // Document fields
  if (!formData.tipo_documento) missingFields.push("Tipo de Documento");
  if (!formData.numero_documento) missingFields.push("Número do Documento");
  if (!formData.documento_valid_until) missingFields.push("Validade do Documento");
  if (!formData.carta_numero) missingFields.push("Número da Carta de Condução");
  if (!formData.carta_valid_until) missingFields.push("Validade da Carta de Condução");
  if (!formData.registo_criminal_valid_until) missingFields.push("Validade do Registo Criminal");

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

export interface VehicleValidation {
  isComplete: boolean;
  missingFields: string[];
}

export function validateVehicleProfile(formData: any): VehicleValidation {
  const missingFields: string[] = [];

  // Required fields
  if (!formData.matricula) missingFields.push("Matrícula");
  if (!formData.marca) missingFields.push("Marca");
  if (!formData.modelo) missingFields.push("Modelo");
  if (!formData.cor) missingFields.push("Cor");
  if (!formData.chassi) missingFields.push("Chassi");
  if (!formData.data_matricula) missingFields.push("Data de Matrícula");

  // Document fields
  if (!formData.carta_verde) missingFields.push("Carta Verde");
  if (!formData.carta_verde_valid_until) missingFields.push("Validade da Carta Verde");
  if (!formData.inspecao_tvde) missingFields.push("Inspeção TVDE");
  if (!formData.inspecao_tvde_valid_until) missingFields.push("Validade da Inspeção TVDE");

  // Owner
  if (!formData.proprietario_id) missingFields.push("Proprietário");

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
