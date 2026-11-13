import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('public pages have route-specific canonical URLs and caching', async () => {
  const layout = await read('app/layout.tsx');
  assert.ok(layout.includes("from 'next/font/google'"));
  assert.ok(layout.includes('Inter('));
  assert.ok(layout.includes('Noto_Sans_Bengali('));
  assert.equal(layout.includes("alternates: { canonical: '/' }"), false);
  for (const [path,canonical] of [
    ['app/page.tsx',"canonical: '/'"],
    ['app/courses/page.tsx',"canonical: '/courses'"],
    ['app/contact/page.tsx',"canonical: '/contact'"],
    ['app/about/page.tsx',"canonical: '/about'"],
    ['app/help/page.tsx',"canonical: '/help'"],
    ['app/privacy/page.tsx',"canonical: '/privacy'"],
    ['app/terms/page.tsx',"canonical: '/terms'"],
  ]) {
    const page = await read(path);
    assert.ok(page.includes(canonical), path);
  }
  for (const path of ['app/about/page.tsx','app/help/page.tsx','app/privacy/page.tsx','app/terms/page.tsx']) {
    assert.ok((await read(path)).includes('revalidate = 3600'), path);
  }
  for (const path of ['app/apply/page.tsx','app/login/page.tsx','app/register/page.tsx','app/forgot-password/page.tsx','app/reset-password/page.tsx']) {
    assert.ok((await read(path)).includes('index: false'), path);
  }
  const robots = await read('app/robots.ts');
  assert.ok(robots.includes("'/apply'"));
  assert.ok(robots.includes("'/register'"));
  const detail = await read('app/courses/[slug]/page.tsx');
  assert.ok(detail.includes('generateMetadata'));
  assert.ok(detail.includes("'@type':'Course'"));
});

test('portal has a consistent icon set, student bottom navigation and staff menu', async () => {
  const layout = await read('components/portal-layout.tsx');
  const icons = await read('components/portal-icon.tsx');
  const css = await read('app/globals.css');
  assert.ok(layout.includes('student-bottom-nav'));
  assert.ok(layout.includes('portal-mobile-drawer'));
  assert.ok(layout.includes('PortalIcon'));
  assert.ok(icons.includes('viewBox="0 0 24 24"'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
});

test('home hero has original SVG artwork and accessible motion defaults', async () => {
  const home = await read('app/page.tsx');
  const art = await read('components/jmt-hero-graphic.tsx');
  const css = await read('app/globals.css');
  assert.ok(home.includes('JmtHeroGraphic'));
  assert.ok(art.includes('<svg'));
  assert.ok(art.includes('open book and learning symbols'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('prefers-reduced-motion'));
});

test('duplicate profile action and unused payment adapter are removed', async () => {
  const learning = await read('app/actions/learning.ts');
  assert.equal(learning.includes('updateStudentProfile'), false);
  await assert.rejects(read('lib/payments.ts'));
});
