-- Add Bolt and Uber platform fields and TVDE certificate to motoristas table
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS bolt_email text,
ADD COLUMN IF NOT EXISTS bolt_telemovel text,
ADD COLUMN IF NOT EXISTS uber_email text,
ADD COLUMN IF NOT EXISTS uber_telemovel text,
ADD COLUMN IF NOT EXISTS certificado_tvde text,
ADD COLUMN IF NOT EXISTS certificado_tvde_valid_until date;