-- Fix RLS policy that references auth.users (causes 403: permission denied for table users)
DROP POLICY IF EXISTS "Signatories can view their signatures" ON public.assinaturas_digitais;

CREATE POLICY "Signatories can view their signatures"
ON public.assinaturas_digitais
FOR SELECT
TO public
USING (
  signatario_email = current_setting('request.jwt.claim.email', true)
);
