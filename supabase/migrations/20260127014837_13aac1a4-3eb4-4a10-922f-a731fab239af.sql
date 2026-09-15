-- Add valor column for repair cost
ALTER TABLE public.manutencoes 
ADD COLUMN valor numeric DEFAULT NULL;

-- Rename data_ultima_revisao_basica to km_proxima_revisao and change type
ALTER TABLE public.manutencoes 
DROP COLUMN data_ultima_revisao_basica;

ALTER TABLE public.manutencoes 
ADD COLUMN km_proxima_revisao integer DEFAULT NULL;