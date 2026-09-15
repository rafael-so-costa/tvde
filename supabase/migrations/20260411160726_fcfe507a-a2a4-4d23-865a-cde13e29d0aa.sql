-- Allow proprietários to view fines on their vehicles
CREATE POLICY "Proprietarios can view fines on their vehicles"
ON public.multas
FOR SELECT
TO public
USING (
  veiculo_id IN (
    SELECT id FROM public.veiculos
    WHERE proprietario_id IN (
      SELECT id FROM public.proprietarios
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow proprietários to view claims on their vehicles
CREATE POLICY "Proprietarios can view claims on their vehicles"
ON public.sinistros
FOR SELECT
TO public
USING (
  veiculo_id IN (
    SELECT id FROM public.veiculos
    WHERE proprietario_id IN (
      SELECT id FROM public.proprietarios
      WHERE user_id = auth.uid()
    )
  )
);