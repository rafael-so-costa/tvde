-- Add extintor_valid_until field to veiculos table
ALTER TABLE public.veiculos
ADD COLUMN IF NOT EXISTS extintor_valid_until date;