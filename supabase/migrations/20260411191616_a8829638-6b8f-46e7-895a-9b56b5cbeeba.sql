-- Allow motoristas to view checklist records where they are the driver
CREATE POLICY "Motoristas can view their checklist records"
ON public.checklist_records
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT id::text FROM public.motoristas WHERE user_id = auth.uid()
  )
);

-- Allow proprietarios to view checklist records for their vehicles
CREATE POLICY "Proprietarios can view their checklist records"
ON public.checklist_records
FOR SELECT
TO authenticated
USING (
  vehicle_id IN (
    SELECT id::text FROM public.veiculos 
    WHERE proprietario_id IN (
      SELECT id FROM public.proprietarios WHERE user_id = auth.uid()
    )
  )
);