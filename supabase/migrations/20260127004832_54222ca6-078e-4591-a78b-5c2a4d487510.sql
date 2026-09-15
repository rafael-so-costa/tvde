-- Add column to store uploaded documents for drivers
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS documentos_upload jsonb DEFAULT '[]'::jsonb;