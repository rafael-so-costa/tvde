-- Add missing UPDATE policy for checklist-media storage bucket (needed for upsert)
CREATE POLICY "Tenant admins can update checklist media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'checklist-media' AND is_tenant_admin(auth.uid()))
WITH CHECK (bucket_id = 'checklist-media' AND is_tenant_admin(auth.uid()));

-- Also add a more permissive INSERT policy for authenticated users (not just admins)
-- since drivers/operators may also need to upload during checklist
CREATE POLICY "Authenticated users can upload checklist media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checklist-media' AND auth.role() = 'authenticated');

-- Update policy for authenticated users too
CREATE POLICY "Authenticated users can update checklist media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'checklist-media' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'checklist-media' AND auth.role() = 'authenticated');