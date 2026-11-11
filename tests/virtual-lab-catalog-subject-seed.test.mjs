import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../supabase/migrations/20261110100000_database_driven_virtual_lab_catalog.sql',
  import.meta.url,
);
const quadraticMigrationUrl = new URL(
  '../supabase/migrations/20261110120000_add_quadratic_virtual_lab_template.sql',
  import.meta.url,
);

test('virtual-lab catalogue seeds required subjects before resolving catalogue foreign keys', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  const subjectSeed = sql.indexOf('INSERT INTO public.academic_subjects (name, slug, description)');
  const catalogueInsert = sql.indexOf('INSERT INTO public.virtual_lab_catalog');
  const catalogueJoin = sql.indexOf('JOIN public.academic_subjects subject ON subject.slug = seed.subject_slug');

  assert.notEqual(subjectSeed, -1, 'required academic subjects must be seeded');
  assert.notEqual(catalogueInsert, -1, 'catalogue rows must be inserted');
  assert.notEqual(catalogueJoin, -1, 'catalogue subject IDs must be resolved by stable slug');
  assert.ok(subjectSeed < catalogueInsert, 'subject seed must precede catalogue FK insertion');
  assert.ok(catalogueInsert < catalogueJoin, 'catalogue insert must use slug-resolved subjects');

  for (const slug of ['physics', 'chemistry', 'biology', 'mathematics', 'ict', 'higher-mathematics']) {
    assert.match(sql, new RegExp(`'[^']+', '${slug}',`), `missing idempotent seed for ${slug}`);
    assert.match(sql, new RegExp(`'[^']+', '${slug}', '[^']+'`), `missing catalogue mapping for ${slug}`);
  }

  assert.match(sql, /ON CONFLICT \(slug\) DO NOTHING/);
  assert.doesNotMatch(
    sql.slice(catalogueInsert, sql.indexOf('ON CONFLICT (lab_key)', catalogueInsert)),
    /10000000-0000-4000-8000-00000000000[1-6]/,
    'catalogue seeds must not depend on UUIDs generated in another environment',
  );

  const conflictUpdate = sql.slice(sql.indexOf('ON CONFLICT (lab_key)'));
  assert.match(conflictUpdate, /DO UPDATE SET\s+subject_id = EXCLUDED\.subject_id,\s+updated_at = now\(\);/);
  assert.doesNotMatch(
    conflictUpdate,
    /SET[\s\S]*\b(is_published|title|summary|principle|simulation_type|sort_order)\s*=/,
    'rerunning the seed must not overwrite teacher/admin editorial state',
  );
});


test('higher-mathematics quadratic lab resolves its subject by stable slug', async () => {
  const sql = await readFile(quadraticMigrationUrl, 'utf8');
  assert.match(sql, /FROM public\\.academic_subjects subject\\s+WHERE subject\\.slug = 'higher-mathematics'/);
  assert.doesNotMatch(sql, /10000000-0000-4000-8000-00000000000[1-9]/);
  assert.match(sql, /simulation_type IN \\('physics','chemistry','biology','maths','ict','quadratic'\\)/);
});


test('follow-on virtual-lab migrations resolve academic subjects by stable slug, not environment UUID', async () => {
  const cases = [
    ['20261110120000_add_quadratic_virtual_lab_template.sql', 'higher-mathematics'],
    ['20261110160000_add_projectile_motion_virtual_lab.sql', 'physics'],
    ['20261110170000_add_virtual_microscope_lab.sql', 'biology'],
    ['20261110254000_add_chemistry_reaction_kinetics_lab.sql', 'chemistry'],
    ['20261110254200_add_physics_wave_interference_lab.sql', 'physics'],
    ['20261110254400_add_chemistry_equilibrium_lab.sql', 'chemistry'],
    ['20261110254600_add_biology_cell_division_lab.sql', 'biology'],
    ['20261110254800_add_chemistry_electrochemical_cell_lab.sql', 'chemistry'],
    ['20261110254900_add_photosynthesis_lab.sql', 'biology'],
    ['20261110255200_add_dihybrid_inheritance_lab.sql', 'biology'],
    ['20261110255201_add_physics_spring_oscillator_lab.sql', 'physics'],
  ];

  for (const [filename, slug] of cases) {
    const url = new URL(`../supabase/migrations/${filename}`, import.meta.url);
    const migration = await readFile(url, 'utf8');
    assert.match(migration, new RegExp(`where\\s+subject\\.slug\\s*=\\s*'${slug}'`, 'i').test(migration)
      ? /subject\.slug/
      : new RegExp(`where\\s+s\\.slug\\s*=\\s*'${slug}'`, 'i'), `${filename} must resolve ${slug} by slug`);
    assert.doesNotMatch(migration, /10000000-0000-4000-8000-00000000000[1-8]/,
      `${filename} must not assume a subject UUID from another database`);
  }
});
