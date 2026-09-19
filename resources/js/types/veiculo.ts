export type VeiculoStatus =
    | 'pendente'
    | 'ativo'
    | 'incompleto'
    | 'inativo';

export interface VeiculoProprietario {
    id: string;
    nome_completo: string | null;
    nome_empresa: string | null;
    tipo: 'pessoa_fisica' | 'empresa';
}

export interface Veiculo {
    id: string;
    tenant_id: string;
    proprietario_id: string | null;
    matricula: string;
    data_matricula: string | null;
    marca: string;
    modelo: string;
    chassi: string | null;
    cilindrada: number | null;
    potencia: number | null;
    combustivel: string | null;
    lugares: number | null;
    portas: number | null;
    cor: string | null;
    carta_verde: string | null;
    carta_verde_valid_until: string | null;
    inspecao_tvde: string | null;
    inspecao_tvde_valid_until: string | null;
    uber_valid_until: string | null;
    bolt_valid_until: string | null;
    extintor_valid_until: string | null;
    foto_principal_url: string | null;
    fotos_galeria: string[];
    valor_caucao: string | null;
    valor_aluguel: string | null;
    via_verde: string | null;
    ativo: boolean;
    status_cadastro: VeiculoStatus;
    proprietario: VeiculoProprietario | null;
    created_at: string;
    updated_at: string;
}

export interface VeiculoPayload {
    proprietario_id: string | null;
    matricula: string;
    data_matricula: string | null;
    marca: string;
    modelo: string;
    chassi: string | null;
    cilindrada: number | null;
    potencia: number | null;
    combustivel: string | null;
    lugares: number | null;
    portas: number | null;
    cor: string | null;
    carta_verde: string | null;
    carta_verde_valid_until: string | null;
    inspecao_tvde: string | null;
    inspecao_tvde_valid_until: string | null;
    uber_valid_until: string | null;
    bolt_valid_until: string | null;
    extintor_valid_until: string | null;
    foto_principal_url: string | null;
    valor_caucao: number | null;
    valor_aluguel: number | null;
    via_verde: string | null;
}
