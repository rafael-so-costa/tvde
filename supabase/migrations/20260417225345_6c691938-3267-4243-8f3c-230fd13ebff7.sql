ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS cartao_frota text;
ALTER TABLE public.proprietarios ADD COLUMN IF NOT EXISTS cartao_frota text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS via_verde text;