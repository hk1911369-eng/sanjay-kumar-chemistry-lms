import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateDihybridCross } from '../lib/virtual-lab-models.mjs';

test('heterozygous dihybrid cross produces the classical 9:3:3:1 phenotype ratio', () => {
  const result = calculateDihybridCross('AaBb', 'AaBb');
  assert.deepEqual(result.gametesA, ['AB', 'Ab', 'aB', 'ab']);
  assert.deepEqual(result.gametesB, ['AB', 'Ab', 'aB', 'ab']);
  assert.equal(result.totalCombinations, 16);
  assert.deepEqual(result.phenotypes.map(item => item.count), [9, 3, 3, 1]);
  assert.deepEqual(result.phenotypes.map(item => item.percentage), [56.25, 18.75, 18.75, 6.25]);
});

test('dihybrid cross handles homozygous and heterozygous parental loci', () => {
  const result = calculateDihybridCross('AABB', 'aabb');
  assert.equal(result.cells.length, 16);
  assert.ok(result.cells.every(cell => cell.genotype === 'AaBb'));
  assert.deepEqual(result.phenotypes.map(item => item.count), [16, 0, 0, 0]);
  const testCross = calculateDihybridCross('AaBb', 'aabb');
  assert.deepEqual(testCross.phenotypes.map(item => item.count), [4, 4, 4, 4]);
});

test('dihybrid offspring genotypes are normalised with dominant allele first', () => {
  const result = calculateDihybridCross('AaBb', 'AaBb');
  assert.ok(result.outcomes.every(item => /^[Aa]{2}[Bb]{2}$/.test(item.genotype)));
  assert.equal(result.outcomes.reduce((sum, item) => sum + item.count, 0), 16);
  assert.ok(Math.abs(result.outcomes.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-12);
});

test('dihybrid model rejects malformed genotypes', () => {
  for (const [parentA, parentB] of [
    ['AABB', 'AaB'],
    ['AABb', 'aabbx'],
    ['ABab', 'AaBb'],
    ['', 'AaBb'],
    [null, 'AaBb'],
  ]) {
    assert.throws(() => calculateDihybridCross(parentA, parentB), RangeError);
  }
});

test('dihybrid lab is integrated into Biology student experience and explains assumptions', async () => {
  const [studio, component, css, declaration, migration, admin, action] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/dihybrid-inheritance-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110255200_add_dihybrid_inheritance_lab.sql', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /DihybridInheritanceLab/);
  assert.match(studio, /selected\.simulation_type === 'dihybrid'/);
  assert.match(component, /Punnett square/);
  assert.match(component, /Phenotype probability/);
  assert.match(component, /Model assumptions/);
  assert.match(component, /aria-label=/);
  assert.match(css, /\.dihybrid-grid/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(declaration, /export function calculateDihybridCross/);
  assert.match(migration, /biology-dihybrid-inheritance/);
  assert.match(migration, /'dihybrid'/);
  assert.match(admin, /\['dihybrid',/);
  assert.ok(action.includes("'dihybrid'"));
  assert.match(migration, /(?:subject|s)\.slug\s*=\s*'biology'/);
});
