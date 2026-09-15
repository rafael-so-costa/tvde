-- Add emergency contact fields to motoristas table
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS contato_urgencia_nome text,
ADD COLUMN IF NOT EXISTS contato_urgencia_telemovel text;