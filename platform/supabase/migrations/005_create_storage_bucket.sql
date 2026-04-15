-- Create the fx-proofs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fx-proofs',
  'fx-proofs',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload proofs for authorized transactions
CREATE POLICY "upload_proof" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'fx-proofs'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM fx_transactions
      WHERE id::text = (storage.foldername(name))[1]
      AND status IN ('authorized', 'completed')
      AND EXISTS (
        SELECT 1 FROM cs_companies_owners
        WHERE company_id = fx_transactions.company_id
        AND user_id = auth.uid()
      )
    )
  );

-- Policy: Users can read proofs for their own transactions or admin
CREATE POLICY "read_proof" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'fx-proofs'
    AND (
      (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
      OR EXISTS (
        SELECT 1 FROM fx_transactions
        WHERE id::text = (storage.foldername(name))[1]
        AND EXISTS (
          SELECT 1 FROM cs_companies_owners
          WHERE company_id = fx_transactions.company_id
          AND user_id = auth.uid()
        )
      )
    )
  );
