export type ProductivityEntityType =
    | "empresa"
    | "proprietario"
    | "motorista"
    | "veiculo"
    | "contrato"
    | "documento";

export interface ProductivityItem {
    entity_type: ProductivityEntityType;
    entity_id: string;
    category: string;
    title: string;
    subtitle: string | null;
    url: string;
    favorite_id: string | null;
}