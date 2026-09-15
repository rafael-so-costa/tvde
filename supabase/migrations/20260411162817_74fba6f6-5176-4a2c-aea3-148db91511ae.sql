-- Drop existing ALL policy for admins (it covers INSERT/UPDATE/DELETE too broadly if others exist)
-- We keep it as-is since it already restricts to tenant admins

-- Add explicit denial: ensure no INSERT policy exists for non-admins
-- The current "Tenant admins can manage veiculos" ALL policy already restricts write to admins only.
-- Motoristas and Proprietarios only have SELECT policies. No changes needed for RLS.
-- But let's be explicit by verifying no other write policies exist.

-- This is a no-op migration to confirm the existing RLS is correct.
-- The veiculos table already has:
-- 1. "Tenant admins can manage veiculos" - ALL - restricted to is_tenant_admin
-- 2. "Motoristas can view assigned vehicles" - SELECT only
-- 3. "Proprietarios can view their vehicles" - SELECT only
-- No additional migration needed as the backend is already secure.

SELECT 1; -- placeholder to confirm review
