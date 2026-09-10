// Black-box tests: the scanner must flag the vibecoded fixture and pass the clean one.
// Run: node test.mjs   (or: npm test)
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const run = (...a) => {
  const r = spawnSync(process.execPath, [path.join(here, 'scan.mjs'), ...a], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

// 1. vibecoded fixture: most of the 30 tells must fire, --fail-on hard exits 1
{
  const r = run('--html', path.join(here, 'fixtures/vibecoded.html'), '--json', '--fail-on', 'hard');
  assert.equal(r.code, 1, `expected exit 1 on vibecoded fixture, got ${r.code}\n${r.err}`);
  const j = JSON.parse(r.out);
  const expected = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  const missing = expected.filter(id => !j.hardHits.includes(id));
  assert.deepEqual(missing, [], `vibecoded fixture: tells not flagged: ${missing.join(', ')}`);
  const ext = [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 47, 49];
  const missingExt = ext.filter(id => !j.anyHits.includes(id));
  assert.deepEqual(missingExt, [], `vibecoded fixture: extended tells not flagged: ${missingExt.join(', ')}`);
  assert.equal(j.live.noTitle, 0);
  assert.equal(j.live.pages[0].ogImage, false);
  assert.equal(j.live.pages[0].lang, null);
  console.log(`ok  vibecoded.html: ${j.hardHits.length} hard hits, ${j.anyHits.length} total`);
}

// 2. clean fixture: zero hard hits, exit 0, metadata present, applied CSS keeps only used rules
{
  const r = run('--html', path.join(here, 'fixtures/clean.html'), '--json', '--fail-on', 'hard');
  assert.equal(r.code, 0, `expected exit 0 on clean fixture\n${r.err}`);
  const j = JSON.parse(r.out);
  assert.deepEqual(j.hardHits, [], `clean fixture flagged: ${j.hardHits.join(', ')}`);
  assert.equal(j.live.pages[0].ogImage, true);
  assert.equal(j.live.pages[0].lang, 'de');
  assert.ok(j.live.cssAppliedBytes < j.live.cssBytes, 'applied CSS should be smaller than shipped CSS');
  console.log(`ok  clean.html: 0 hard hits, applied ${j.live.cssAppliedBytes}/${j.live.cssBytes} CSS bytes`);
}

// 3. applied-CSS filter: Tailwind-escaped selectors and unused rules
{
  const { appliedCss } = await import('./scan.mjs');
  const css = '.md\\:grid-cols-3{display:grid}.unused{color:red}body{margin:0}.a .b{x:1}.a,.zzz{y:1}';
  const out = appliedCss(css, new Set(['md:grid-cols-3', 'a', 'b']));
  assert.ok(out.includes('grid-cols-3'), 'escaped Tailwind class should be kept');
  assert.ok(!out.includes('.unused'), 'unused class should be dropped');
  assert.ok(out.includes('body{'), 'class-less rule should be kept');
  assert.ok(out.includes('.a .b{'), 'compound selector with all classes present kept');
  assert.ok(out.includes('.a,.zzz{'), 'selector list kept when one alternative applies');
  console.log('ok  appliedCss filter');
}

// 4. --fail-on any: extended tells alone trigger exit 1; --fail-on none never fails
{
  const r = run('--html', path.join(here, 'fixtures/clean.html'), '--fail-on', 'any');
  assert.ok([0, 1].includes(r.code));
  const r2 = run('--html', path.join(here, 'fixtures/vibecoded.html'));
  assert.equal(r2.code, 0, 'default --fail-on none must exit 0');
  assert.ok(r2.out.includes('| 1 | high | harsh gradients |'), 'markdown table rendered');
  console.log('ok  exit codes');
}
// The published checklist must have every numbered row exactly once.
{
  const r = run('--html', path.join(here, 'fixtures/clean.html'), '--json');
  const j = JSON.parse(r.out);
  assert.deepEqual(j.rows.filter(row => Number.isInteger(row.id)).map(row => row.id), Array.from({ length: 49 }, (_, i) => i + 1));
  assert.equal(j.rows.find(row => row.id === 41).liveVerdict, 'pass');
  for (const id of [45, 46]) assert.equal(j.rows.find(row => row.id === id).liveVerdict, 'manual review');
  const bad = JSON.parse(run('--html', path.join(here, 'fixtures/vibecoded.html'), '--json').out);
  assert.equal(bad.rows.find(row => row.id === 41).liveVerdict, 'HIT?');
  assert.equal(bad.rows.find(row => row.id === 47).tell, 'generic FAQ accordion');
  console.log('ok  all 49 checklist rows, metadata and manual verdicts');
}
for (const args of [['--html', 'fixtures/does-not-exist.html'], ['--html'], ['--html', path.join(here, 'fixtures/clean.html'), '--fail-on', 'typo'], ['--html', path.join(here, 'fixtures/clean.html'), '--crawl', '-1']]) {
  assert.equal(run(...args).code, 2, 'invalid/incomplete scans must not pass CI: ' + args.join(' '));
}
console.log('ok  invalid input exit codes');
console.log('all tests passed');
