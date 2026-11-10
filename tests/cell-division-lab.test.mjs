import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cell division is integrated into the Biology student lab and admin catalogue', async () => {
  const [studio, admin, action, component, declaration, model] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/cell-division-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'cell-division'/);
  assert.match(studio, /CellDivisionLab/);
  assert.equal((admin.match(/value="cell-division">Biology · Mitosis and meiosis/g) ?? []).length, 2);
  assert.match(action, /'equilibrium','cell-division'/);
  assert.match(component, /crossingOver/);
  assert.match(component, /independentAssortment/);
  assert.match(component, /DNA content/);
  assert.match(component, /role="img"/);
  assert.match(component, /aria-label=/);
  assert.match(model, /export function calculateCellDivision/);
  assert.match(declaration, /export function calculateCellDivision/);
});

test('cell division template is allowed and published for Biology', async () => {
  const [constraint, catalogue] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110254500_allow_cell_division_template.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110254600_add_biology_cell_division_lab.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(constraint, /'cell-division'/);
  assert.match(catalogue, /biology-cell-division/);
  assert.match(catalogue, /10000000-0000-4000-8000-000000000003/);
  assert.match(catalogue, /'cell-division'/);
  assert.match(catalogue, /is_published,[\s\S]*true/);
});

test('cell division stage controls and chromosome diagrams are mobile and accessible', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../components/cell-division-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Previous stage/);
  assert.match(component, /Next stage/);
  assert.match(component, /Chromosome arrangement/);
  assert.match(css, /\.cell-division-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
});
