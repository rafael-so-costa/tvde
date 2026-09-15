-- Add new columns for vehicle deposit and rent
ALTER TABLE public.veiculos
ADD COLUMN IF NOT EXISTS valor_caucao numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valor_aluguel numeric DEFAULT NULL;