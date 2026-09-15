
-- Allow authenticated users to upload signatures
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Allow authenticated users to update their signatures
CREATE POLICY "Authenticated users can update signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures');

-- Allow authenticated users to read signatures
CREATE POLICY "Authenticated users can read signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');
