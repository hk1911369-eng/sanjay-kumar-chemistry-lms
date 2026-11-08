-- All private Storage access rules depend on auth.uid() or current_role().
-- Keep only the dedicated course-image read policy available to anon.
ALTER POLICY "JMT admins delete course images" ON storage.objects TO authenticated;
ALTER POLICY "JMT admins update course images" ON storage.objects TO authenticated;
ALTER POLICY "JMT admins upload course images" ON storage.objects TO authenticated;
ALTER POLICY "admins read payment proofs" ON storage.objects TO authenticated;
ALTER POLICY "assigned teachers delete lesson materials" ON storage.objects TO authenticated;
ALTER POLICY "assigned teachers upload lesson materials" ON storage.objects TO authenticated;
ALTER POLICY "course members read lesson materials" ON storage.objects TO authenticated;
ALTER POLICY "student avatar owner delete" ON storage.objects TO authenticated;
ALTER POLICY "student avatar owner update" ON storage.objects TO authenticated;
ALTER POLICY "student avatar owner upload" ON storage.objects TO authenticated;
ALTER POLICY "student avatar scoped read" ON storage.objects TO authenticated;
ALTER POLICY "students read own payment proofs" ON storage.objects TO authenticated;
ALTER POLICY "students remove unsubmitted own payment proofs" ON storage.objects TO authenticated;
ALTER POLICY "students upload own unsubmitted payment proofs" ON storage.objects TO authenticated;
