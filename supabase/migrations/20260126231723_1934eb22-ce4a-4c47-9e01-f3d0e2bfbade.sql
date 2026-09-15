-- Add documentos column to multas table
ALTER TABLE public.multas ADD COLUMN IF NOT EXISTS documentos JSONB DEFAULT '[]'::jsonb;

-- Add documentos column to sinistros table
ALTER TABLE public.sinistros ADD COLUMN IF NOT EXISTS documentos JSONB DEFAULT '[]'::jsonb;