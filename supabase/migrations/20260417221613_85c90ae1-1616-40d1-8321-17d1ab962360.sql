-- New fields on funcionarios
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS telemovel text,
  ADD COLUMN IF NOT EXISTS contato_urgencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_urgencia_telemovel text;

-- Recibos de vencimento table
CREATE TABLE IF NOT EXISTS public.recibos_vencimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ano integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  arquivo_url text NOT NULL,
  arquivo_nome text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_recibos_funcionario ON public.recibos_vencimento(funcionario_id, ano, mes);

ALTER TABLE public.recibos_vencimento ENABLE ROW LEVEL SECURITY;

-- Tenant admins manage everything
CREATE POLICY "Tenant admins manage recibos"
  ON public.recibos_vencimento
  FOR ALL
  TO authenticated
  USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Funcionario views own recibos only
CREATE POLICY "Funcionario views own recibos"
  ON public.recibos_vencimento
  FOR SELECT
  TO authenticated
  USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ));

-- Trigger updated_at
CREATE TRIGGER trg_recibos_vencimento_updated_at
  BEFORE UPDATE ON public.recibos_vencimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for documents bucket (private) - recibos folder
-- Path convention: recibos/{funcionario_id}/{ano}/{mes}.pdf
CREATE POLICY "Tenant admins upload recibos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'recibos'
    AND public.is_tenant_admin(auth.uid())
  );

CREATE POLICY "Tenant admins update recibos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'recibos'
    AND public.is_tenant_admin(auth.uid())
  );

CREATE POLICY "Tenant admins delete recibos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'recibos'
    AND public.is_tenant_admin(auth.uid())
  );

CREATE POLICY "View recibos: admins or own funcionario"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'recibos'
    AND (
      public.is_tenant_admin(auth.uid())
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.funcionarios WHERE user_id = auth.uid()
      )
    )
  );