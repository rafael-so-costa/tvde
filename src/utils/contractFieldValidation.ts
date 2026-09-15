import type { ContractField } from "@/types/contract";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateField(field: ContractField, value: string): ValidationResult {
  if (field.required && !value?.trim()) {
    return { isValid: false, error: "Campo obrigatório" };
  }

  if (!value?.trim()) {
    return { isValid: true };
  }

  switch (field.type) {
    case "email":
      return validateEmail(value);
    case "cpf_cnpj":
      return validateCpfCnpj(value);
    case "date":
      return validateDate(value);
    case "currency":
      return validateCurrency(value);
    case "number":
      return validateNumber(value);
    case "phone":
      return validatePhone(value);
    default:
      return { isValid: true };
  }
}

function validateEmail(value: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: "E-mail inválido" };
  }
  return { isValid: true };
}

function validateCpfCnpj(value: string): ValidationResult {
  const cleaned = value.replace(/\D/g, "");
  
  // NIF português (9 dígitos) ou CPF (11 dígitos) ou CNPJ (14 dígitos)
  if (cleaned.length === 9) {
    return validateNIF(cleaned);
  } else if (cleaned.length === 11) {
    return validateCPF(cleaned);
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned);
  }
  
  return { isValid: false, error: "NIF/CPF/CNPJ inválido" };
}

function validateNIF(nif: string): ValidationResult {
  // Portuguese NIF validation
  const validFirstDigits = ["1", "2", "3", "5", "6", "7", "8", "9"];
  if (!validFirstDigits.includes(nif[0])) {
    return { isValid: false, error: "NIF inválido" };
  }
  
  let checkSum = 0;
  for (let i = 0; i < 8; i++) {
    checkSum += parseInt(nif[i]) * (9 - i);
  }
  
  const remainder = checkSum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(nif[8]) !== checkDigit) {
    return { isValid: false, error: "NIF inválido" };
  }
  
  return { isValid: true };
}

function validateCPF(cpf: string): ValidationResult {
  // Check for all same digits
  if (/^(\d)\1+$/.test(cpf)) {
    return { isValid: false, error: "CPF inválido" };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) {
    return { isValid: false, error: "CPF inválido" };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) {
    return { isValid: false, error: "CPF inválido" };
  }

  return { isValid: true };
}

function validateCNPJ(cnpj: string): ValidationResult {
  // Check for all same digits
  if (/^(\d)\1+$/.test(cnpj)) {
    return { isValid: false, error: "CNPJ inválido" };
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(cnpj[12]) !== digit1) {
    return { isValid: false, error: "CNPJ inválido" };
  }

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(cnpj[13]) !== digit2) {
    return { isValid: false, error: "CNPJ inválido" };
  }

  return { isValid: true };
}

function validateDate(value: string): ValidationResult {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Data inválida" };
  }
  return { isValid: true };
}

function validateCurrency(value: string): ValidationResult {
  const cleaned = value.replace(/[€$\s]/g, "").replace(",", ".");
  const number = parseFloat(cleaned);
  
  if (isNaN(number)) {
    return { isValid: false, error: "Valor inválido" };
  }
  
  if (number < 0) {
    return { isValid: false, error: "Valor não pode ser negativo" };
  }
  
  return { isValid: true };
}

function validateNumber(value: string): ValidationResult {
  const number = parseFloat(value);
  
  if (isNaN(number)) {
    return { isValid: false, error: "Número inválido" };
  }
  
  return { isValid: true };
}

function validatePhone(value: string): ValidationResult {
  const cleaned = value.replace(/\D/g, "");
  
  // Portuguese phone numbers: 9 digits starting with 9, or with country code
  if (cleaned.length === 9 && cleaned.startsWith("9")) {
    return { isValid: true };
  }
  
  // With country code (351)
  if (cleaned.length === 12 && cleaned.startsWith("351")) {
    return { isValid: true };
  }
  
  // Brazilian phones
  if (cleaned.length === 11 || cleaned.length === 10) {
    return { isValid: true };
  }
  
  return { isValid: false, error: "Telefone inválido" };
}

export function formatFieldValue(type: ContractField["type"], value: string): string {
  switch (type) {
    case "cpf_cnpj":
      return formatCpfCnpj(value);
    case "currency":
      return formatCurrency(value);
    case "phone":
      return formatPhone(value);
    case "date":
      return formatDate(value);
    default:
      return value;
  }
}

function formatCpfCnpj(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  
  if (cleaned.length === 9) {
    // NIF: XXX XXX XXX
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  } else if (cleaned.length === 11) {
    // CPF: XXX.XXX.XXX-XX
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (cleaned.length === 14) {
    // CNPJ: XX.XXX.XXX/XXXX-XX
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  
  return value;
}

function formatCurrency(value: string): string {
  const cleaned = value.replace(/[€$\s]/g, "").replace(",", ".");
  const number = parseFloat(cleaned);
  
  if (isNaN(number)) return value;
  
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  }
  
  return value;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  return date.toLocaleDateString("pt-PT");
}
