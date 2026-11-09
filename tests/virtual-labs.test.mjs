import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('virtual labs require an active paid student enrollment', async () => {
  const page = await readFile(new URL('../app/labs/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("profile?.role !== 'student'"));
  assert.ok(page.includes(".eq('status', 'active')"));
  assert.ok(page.includes(".eq('admission_fee_paid', true)"));
  assert.ok(page.includes(".gte('paid_through', periodEnd)"));
});

test('simulation catalogue is database-driven and mapped by normalized subject IDs', async () => {
  const page = await readFile(new URL('../app/labs/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261110100000_database_driven_virtual_lab_catalog.sql', import.meta.url), 'utf8');
  assert.match(page, /from\('virtual_lab_catalog'\)/);
  assert.match(page, /from\('course_subjects'\)/);
  assert.match(page, /academic_subjects\(id,name\)/);
  assert.match(page, /subjectIds/);
  assert.match(component, /catalogue: LabCatalogItem\[\]/);
  assert.match(component, /selected\.simulation_type === 'physics'/);
  assert.match(component, /selected\.simulation_type === 'ict'/);
  assert.doesNotMatch(component, /const labs = \[/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.virtual_lab_catalog/);
  assert.match(migration, /subject_id uuid NOT NULL REFERENCES public\.academic_subjects/);
  assert.match(migration, /simulation_type text NOT NULL/);
  assert.match(migration, /admins manage virtual lab catalogue/);
});

test('simulation completion resolves the subject from the published catalogue and rechecks paid course scope', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110100000_database_driven_virtual_lab_catalog.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  assert.match(migration, /WHERE lab_key = p_lab_id AND is_published IS TRUE/);
  assert.match(migration, /cs\.course_id = p_course_id AND cs\.subject_id = v_lab\.subject_id/);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/);
  assert.match(migration, /e\.paid_through >= v_period_end/);
  assert.match(migration, /c\.archived_at IS NULL/);
  assert.match(migration, /'subject_id', v_lab\.subject_id/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_simulation_completion/);
  assert.match(action, /rpc\('record_simulation_completion'/);
  assert.match(action, /test\(labId\)/);
});

test('virtual labs are still linked from the student workspace', async () => {
  const source = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("key: 'labs', label: 'Virtual labs', href: '/labs'"));
});

test('administrators can configure database-driven subject-to-template mappings', async () => {
  const page = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const layout = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.match(page, /profile\?\.role !== 'admin'/);
  assert.match(page, /from\('academic_subjects'\)/);
  assert.match(page, /from\('virtual_lab_catalog'\)/);
  assert.match(page, /name="lab_key"/);
  assert.match(page, /name="simulation_type"/);
  assert.match(action, /profile\?\.role !== 'admin'/);
  assert.match(action, /upsert\(/);
  assert.match(action, /onConflict: 'lab_key'/);
  assert.match(action, /'quadratic'\]\.includes\(simulationType\)/);
  assert.match(layout, /href: '\/admin\/virtual-labs'/);
});

test('published simulations are visible only to paid students enrolled in the mapped subject', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110110000_scope_virtual_lab_catalog_to_paid_subjects.sql', import.meta.url), 'utf8');
  assert.match(migration, /current_role\(\)::text = 'student'/);
  assert.match(migration, /cs\.subject_id = virtual_lab_catalog\.subject_id/);
  assert.match(migration, /e\.student_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/);
  assert.match(migration, /e\.paid_through >=/);
  assert.match(migration, /c\.archived_at IS NULL/);
});

test('higher mathematics has an interactive quadratic simulation template', async () => {
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261110120000_add_quadratic_virtual_lab_template.sql', import.meta.url), 'utf8');
  assert.match(component, /simulation_type === 'quadratic'/);
  assert.match(component, /discriminant/);
  assert.match(component, /vertexX/);
  assert.match(admin, /value="quadratic"/);
  assert.match(migration, /higher-maths-quadratic/);
  assert.match(migration, /higher-maths-quadratic/);
  assert.match(migration, /10000000-0000-4000-8000-000000000008/);
});

test('science simulations include safe, consequence-aware what-if challenges', async () => {
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  const standard = await readFile(new URL('../docs/JMT_NORTH_STAR_PRODUCT_STANDARD.md', import.meta.url), 'utf8');
  for (const subject of ['chemistry', 'physics', 'biology']) {
    assert.match(component, new RegExp(subject + ':\\s*\\{'));
  }
  assert.match(component, /Simulate unsafe choice/);
  assert.match(component, /Choose safe practice/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /setSafetyResult\('unsafe'\)/);
  assert.match(component, /setSafetyResult\('safe'\)/);
  assert.match(component, /acid to water—not water to acid/);
  assert.match(component, /short circuit can cause a very large current/);
  assert.match(component, /cross-contamination/);
  assert.match(component, /approved process/);
  assert.match(css, /virtual-lab-safety-actions/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(standard, /Virtual laboratory safety and interaction standard/);
  assert.match(standard, /physically disconnected from real equipment/);
});
