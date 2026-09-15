-- Add witness fields to sinistros table
ALTER TABLE public.sinistros ADD COLUMN IF NOT EXISTS teve_testemunha BOOLEAN DEFAULT false;
ALTER TABLE public.sinistros ADD COLUMN IF NOT EXISTS nome_testemunha TEXT;
ALTER TABLE public.sinistros ADD COLUMN IF NOT EXISTS telemovel_testemunha TEXT;