import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculatePhotosynthesis } from '../lib/virtual-lab-models.mjs';

const standard = {
  lightIntensity: 500,
  carbonDioxidePpm: 420,
  temperatureCelsius: 25,
  wavelengthNm: 660,
};

test('photosynthesis model separates gross assimilation, respiration and net carbon gain', () => {
  const result = calculatePhotosynthesis(standard);
  assert.ok(result.grossAssimilation > 0);
  assert.ok(result.respirationRate > 0);
  assert.ok(Math.abs(result.netAssimilation - (result.grossAssimilation - result.respirationRate)) < 1e-12);
  assert.equal(result.oxygenEvolutionRate, result.grossAssimilation);
  assert.equal(result.lightResponseCurve.length, 31);
  assert.equal(result.lightResponseCurve[0].grossAssimilation, 0);
  assert.ok(result.lightResponseCurve[30].grossAssimilation > result.lightResponseCurve[10].grossAssimilation);
});

test('light and carbon dioxide increase gross assimilation with diminishing light returns', () => {
  const lowLight = calculatePhotosynthesis({ ...standard, lightIntensity: 100 });
  const highLight = calculatePhotosynthesis({ ...standard, lightIntensity: 1500 });
  const lowCO2 = calculatePhotosynthesis({ ...standard, carbonDioxidePpm: 100 });
  const highCO2 = calculatePhotosynthesis({ ...standard, carbonDioxidePpm: 900 });
  assert.ok(highLight.grossAssimilation > lowLight.grossAssimilation);
  assert.ok(highCO2.grossAssimilation > lowCO2.grossAssimilation);
  assert.ok(highLight.lightResponse < 1);
});

test('photosynthesis action spectrum has stronger blue and red response than green', () => {
  const blue = calculatePhotosynthesis({ ...standard, wavelengthNm: 450 });
  const green = calculatePhotosynthesis({ ...standard, wavelengthNm: 550 });
  const red = calculatePhotosynthesis({ ...standard, wavelengthNm: 680 });
  assert.ok(blue.actionSpectrumResponse > green.actionSpectrumResponse);
  assert.ok(red.actionSpectrumResponse > green.actionSpectrumResponse);
});

test('photosynthesis temperature response peaks near the model optimum and respiration rises with heat', () => {
  const optimum = calculatePhotosynthesis({ ...standard, temperatureCelsius: 28 });
  const cool = calculatePhotosynthesis({ ...standard, temperatureCelsius: 10 });
  const hot = calculatePhotosynthesis({ ...standard, temperatureCelsius: 42 });
  assert.ok(optimum.temperatureResponse > cool.temperatureResponse);
  assert.ok(optimum.temperatureResponse > hot.temperatureResponse);
  assert.ok(hot.respirationRate > optimum.respirationRate);
});

test('photosynthesis model identifies a limiting factor and validates input bounds', () => {
  const dark = calculatePhotosynthesis({ ...standard, lightIntensity: 0 });
  assert.equal(dark.limitingFactor.key, 'light');
  assert.ok(dark.netAssimilation < 0);
  assert.throws(() => calculatePhotosynthesis({ ...standard, lightIntensity: -1 }), RangeError);
  assert.throws(() => calculatePhotosynthesis({ ...standard, carbonDioxidePpm: 1200 }), RangeError);
  assert.throws(() => calculatePhotosynthesis({ ...standard, temperatureCelsius: 50 }), RangeError);
  assert.throws(() => calculatePhotosynthesis({ ...standard, wavelengthNm: 750 }), RangeError);
});

test('photosynthesis is integrated into the student studio and admin catalogue', async () => {
  const [studio, admin, action, component, declaration] = await Promise.all([
    readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/virtual-labs/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/photosynthesis-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.d.mts', import.meta.url), 'utf8'),
  ]);
  assert.match(studio, /simulation_type === 'photosynthesis'/);
  assert.match(studio, /PhotosynthesisLab/);
  assert.match(admin, /value="photosynthesis">Biology · Photosynthesis and limiting factors/);
  assert.match(action, /'photosynthesis'/);
  assert.match(component, /limitingFactor/);
  assert.match(component, /grossAssimilation/);
  assert.match(component, /netAssimilation/);
  assert.match(component, /aria-label=/);
  assert.match(declaration, /export function calculatePhotosynthesis/);
});

test('photosynthesis template is allowed and published for Biology', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110254900_add_photosynthesis_lab.sql', import.meta.url), 'utf8');
  assert.match(migration, /'photosynthesis'/);
  assert.match(migration, /biology-photosynthesis-investigation/);
  assert.match(migration, /10000000-0000-4000-8000-000000000003/);
  assert.match(migration, /is_published,[\s\S]*true/);
});
test('photosynthesis chart and controls are responsive and disclose model assumptions', async () => {
  const [component, css, model] = await Promise.all([
    readFile(new URL('../components/photosynthesis-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../lib/virtual-lab-models.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /Light-response curve/);
  assert.match(component, /CURRENT LIMITING FACTOR/);
  assert.match(component, /Model assumptions/);
  assert.match(css, /\.photosynthesis-controls/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(model, /not calibrated to a species/);
});
