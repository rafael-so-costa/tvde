import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressData {
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  cep: string;
}

interface AddressFieldsProps {
  address: AddressData;
  onChange: (field: keyof AddressData, value: string) => void;
}

export function AddressFields({ address, onChange }: AddressFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rua">Rua</Label>
        <Input
          id="rua"
          value={address.rua || ""}
          onChange={(e) => onChange("rua", e.target.value)}
          placeholder="Nome da Rua"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={address.numero || ""}
            onChange={(e) => onChange("numero", e.target.value)}
            placeholder="123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={address.complemento || ""}
            onChange={(e) => onChange("complemento", e.target.value)}
            placeholder="Apt, Bloco, etc."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={address.cidade || ""}
            onChange={(e) => onChange("cidade", e.target.value)}
            placeholder="Lisboa"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cep">Código Postal</Label>
          <Input
            id="cep"
            value={address.cep || ""}
            onChange={(e) => onChange("cep", e.target.value)}
            placeholder="1000-001"
          />
        </div>
      </div>
    </div>
  );
}

export function formatAddress(address: AddressData): string {
  const parts = [];
  if (address.rua) {
    let fullAddress = address.rua;
    if (address.numero) fullAddress += `, ${address.numero}`;
    if (address.complemento) fullAddress += ` - ${address.complemento}`;
    parts.push(fullAddress);
  }
  if (address.cidade) parts.push(address.cidade);
  if (address.cep) parts.push(address.cep);
  return parts.join(", ");
}

export function parseAddressFromLegacy(endereco: string | null | undefined): AddressData {
  // Basic parsing of legacy single-field address
  if (!endereco) {
    return { rua: "", numero: "", complemento: "", cidade: "", cep: "" };
  }
  return { rua: endereco, numero: "", complemento: "", cidade: "", cep: "" };
}
