
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS sobrenome text,
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS foto_perfil_url text,
  ADD COLUMN IF NOT EXISTS fotos_galeria jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS endereco_rua text,
  ADD COLUMN IF NOT EXISTS endereco_numero text,
  ADD COLUMN IF NOT EXISTS endereco_complemento text,
  ADD COLUMN IF NOT EXISTS endereco_cidade text,
  ADD COLUMN IF NOT EXISTS endereco_cep text;

-- Permitir funcionário ver seu próprio registo
CREATE POLICY "Funcionario views own record"
  ON public.funcionarios
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir funcionário atualizar dados básicos do seu perfil
CREATE POLICY "Funcionario updates own profile"
  ON public.funcionarios
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
