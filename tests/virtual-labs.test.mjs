import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('virtual labs require an active paid student enrollment', async () => {
  const page = await readFile(new URL('../app/labs/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("profile?.is_active !== true || profile.role !== 'student'"));
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
  assert.match(page, /profile\?\.is_active !== true \|\| profile\.role !== 'admin'/g);
  assert.match(page, /from\('academic_subjects'\)/);
  assert.match(page, /from\('virtual_lab_catalog'\)/);
  assert.match(page, /name="lab_key"/);
  assert.match(page, /name="simulation_type"/);
  assert.match(action, /profile\?\.is_active !== true \|\| profile\.role !== 'admin'/);
  assert.match(action, /upsert\(/);
  assert.match(action, /onConflict: 'lab_key'/);
  for (const type of ['quadratic','pendulum','projectile','microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator','dihybrid']) assert.ok(action.includes("'" + type + "'"));
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
  assert.match(admin, /\['quadratic',/);
  assert.match(migration, /higher-maths-quadratic/);
  assert.match(migration, /higher-maths-quadratic/);
  assert.match(migration, /(?:subject|s)\.slug\s*=\s*'higher-mathematics'/);
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
  assert.match(component, /consequenceSteps/);
  assert.match(component, /virtual-lab-consequence-chain/);
  assert.match(component, /approved process/);
  assert.match(css, /virtual-lab-safety-actions/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(standard, /Virtual laboratory safety and interaction standard/);
  assert.match(standard, /physically disconnected from real equipment/);
});

test('double pendulum is a separately mapped physics simulation with educator-configurable template', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110150000_add_double_pendulum_simulation.sql', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const lab = await readFile(new URL('../components/double-pendulum-lab.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  assert.match(migration, /'pendulum'/);
  assert.match(migration, /physics-double-pendulum/);
  assert.match(component, /simulation_type === 'pendulum'/);
  assert.match(component, /DoublePendulumLab/);
  assert.match(lab, /prefers-reduced-motion/);
  assert.match(lab, /Step forward/);
  assert.match(lab, /Pause experiment/);
  assert.match(lab, /Reset experiment/);
  assert.match(lab, /ResizeObserver/);
  for (const type of ['pendulum','projectile','microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator','dihybrid']) assert.ok(action.includes("'" + type + "'"));
  assert.match(admin, /\['pendulum',/);
});

test('chemistry titration exposes a live pH-volume curve and identifies its modelled indicator', async () => {
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(component, /titrationCurve/);
  assert.match(component, /Strong acid and base titration curve/);
  assert.match(component, /Equivalence/);
  assert.match(component, /Phenolphthalein/);
  assert.match(css, /virtual-lab-titration-graph/);
  assert.match(css, /virtual-lab-equivalence-line/);
});

test('biology inheritance square labels parental gametes and explains probability limitations', async () => {
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  assert.match(component, /parental gametes/);
  assert.match(component, /inheritance\.gametesA/);
  assert.match(component, /inheritance\.gametesB/);
  assert.match(component, /not predictions for an individual child or family/);
});


test('biology virtual microscope exposes specimen, optics and explicit schematic limitations', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110170000_add_virtual_microscope_lab.sql', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const lab = await readFile(new URL('../components/virtual-microscope-lab.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  assert.match(migration, /biology-virtual-microscope/);
  assert.match(migration, /'microscope'/);
  assert.match(component, /simulation_type === 'microscope'/);
  assert.match(component, /VirtualMicroscopeLab/);
  assert.match(lab, /Onion epidermis/);
  assert.match(lab, /Cheek epithelial cells/);
  assert.match(lab, /Leaf epidermis/);
  assert.match(lab, /fieldDiameter = 180000 \/ magnification/);
  assert.match(lab, /not a photomicrograph/);
  assert.match(lab, /numerical aperture/);
  assert.match(admin, /\['microscope',/);
  for (const type of ['microscope','wave-interference','equilibrium','cell-division','electrochemical-cell','photosynthesis','spring-oscillator','dihybrid']) assert.ok(action.includes("'" + type + "'"));
});


test('virtual lab catalogue creator foreign key is indexed', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110255301_index_virtual_lab_catalog_creator.sql', import.meta.url), 'utf8');
  assert.match(migration, /create index if not exists virtual_lab_catalog_created_by_idx/);
  assert.match(migration, /on public\.virtual_lab_catalog \(created_by\)/);
});


test('ideal gas law template is wired through the student and admin catalogues', async () => {
  const component = await readFile(new URL('../components/gas-laws-lab.tsx', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261110260000_add_ideal_gas_law_virtual_lab.sql', import.meta.url), 'utf8');
  assert.match(component, /PV = nRT/);
  assert.match(component, /kPa·L·mol/);
  assert.match(component, /ideal gas/);
  assert.match(studio, /GasLawsLab/);
  assert.match(studio, /'gas-laws'/);
  assert.match(action, /'gas-laws'/);
  assert.match(admin, /\['gas-laws',/);
  assert.match(migration, /'gas-laws'/);
  assert.match(migration, /virtual_lab_catalog_simulation_type_check/);
});


test('biology population genetics lab models Hardy–Weinberg genotype frequencies and is wired into the dihybrid studio', async () => {
  const lab = await readFile(new URL('../components/hardy-weinberg-lab.tsx', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  assert.match(lab, /p \* p/);
  assert.match(lab, /2 \* p \* q/);
  assert.match(lab, /q \* q/);
  assert.match(lab, /p \+ q = 1/);
  assert.match(lab, /no selection, no mutation, no migration and no genetic drift/);
  assert.match(lab, /population-level expectations/);
  assert.match(studio, /HardyWeinbergLab/);
  assert.match(studio, /selected\.simulation_type === 'dihybrid'/);
});


test('admin catalogue edit dropdown includes every supported simulation type', async () => {
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const supported = [...studio.matchAll(/type SimulationType = ([^;]+);/g)][0]?.[1] ?? '';
  for (const type of supported.split('|').map(value => value.trim().replace(/^'|'$/g, ''))) {
    assert.ok(admin.includes("['" + type + "',"), 'Admin option missing for ' + type);
  }
  assert.equal((admin.match(/SIMULATION_OPTIONS\.map\(\(\[value, label\]\)/g) ?? []).length, 2);
});


test('physics catalogue includes the interactive ray optics experiment', async () => {
  const studio = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  const rayOptics = await readFile(new URL('../components/ray-optics-lab.tsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8');
  assert.match(studio, /import \{ RayOpticsLab \}/);
  assert.match(studio, /selected\.simulation_type === 'physics' && <RayOpticsLab/);
  assert.match(rayOptics, /calculateThinLens/);
  assert.match(rayOptics, /Principal ray construction/);
  assert.match(admin, /Physics · Circuits and ray optics/);
});
