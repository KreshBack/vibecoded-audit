// Regression tests for incomplete scans. All HTTP traffic stays on loopback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibecoded-audit-test-'));
const clean = fs.readFileSync(path.join(here, 'fixtures/clean.html'), 'utf8');
const htmlWith = links => clean.replace('</head>', links + '</head>');
const local = path.join(temp, 'page.html');
const missing = path.join(temp, 'missing');
const run = (...args) => new Promise((resolve, reject) => {
  execFile(process.execPath, [path.join(here, 'scan.mjs'), ...args], { encoding: 'utf8', timeout: 20000 }, (error, out, err) => {
    if (error && typeof error.code !== 'number') return reject(error);
    resolve({ code: error?.code ?? 0, out, err });
  });
});
const json = async (...args) => {
  const r = await run(...args, '--json');
  return { ...r, report: JSON.parse(r.out) };
};
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  if (req.url === '/redirect') { res.writeHead(302, { Location: '/ok' }); res.end(); return; }
  if (req.url === '/ok.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); res.end('body{background:linear-gradient(red,blue)}'); return; }
  if (req.url === '/drop.css') { req.socket.destroy(); return; }
  const pages = {
    '/ok': '<link rel="stylesheet" href="/ok.css">',
    '/bad-css': '<link rel="stylesheet" href="/missing.css">',
    '/drop': '<link rel="stylesheet" href="/drop.css">',
    '/capped': '<link rel="stylesheet" href="/ok.css"><link rel="stylesheet" href="/second.css">',
  };
  if (Object.hasOwn(pages, req.url)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(htmlWith(pages[req.url])); return; }
  res.writeHead(req.url === '/bad-page' ? 500 : 404);
  res.end('<style>body{background:linear-gradient(red,blue)}</style>');
});
try {
  fs.writeFileSync(local, clean);
  for (const flag of ['--html', '--src', '--messages']) {
    for (const base of [[], ['--html', local]]) {
      const r = await json(...base, flag, missing);
      assert.equal(r.code, 2, flag + ' missing input must fail even with a valid page');
      assert.equal(r.report.scanStatus, 'incomplete');
      assert.ok(r.report.errors.some(e => e.target === missing));
      if (!base.length && flag === '--html') {
        assert.deepEqual(r.report.hardHits, [], 'unreadable pages must not produce absence findings');
        assert.equal(r.report.rows.find(row => row.id === 41).liveVerdict, 'not scanned');
      }
    }
  }
  const empty = path.join(temp, 'empty');
  fs.mkdirSync(empty);
  for (const flag of ['--html', '--src']) assert.equal((await run(flag, empty)).code, 2);
  console.log('ok  missing and empty inputs cannot pass a complete or partial scan');

  fs.writeFileSync(local, htmlWith('<link rel="stylesheet" href="missing.css">'));
  const localMissing = await json('--html', local, '--fail-on', 'hard');
  assert.equal(localMissing.code, 2, 'scan errors take priority over design findings');
  assert.equal(localMissing.report.scanStatus, 'incomplete');
  assert.ok(localMissing.report.errors.some(e => e.kind === 'stylesheet'));
  assert.match((await run('--html', local)).out, /Scan status: incomplete/);
  fs.writeFileSync(path.join(temp, 'styles.css'), 'body{background:linear-gradient(red,blue)}');
  fs.writeFileSync(local, htmlWith('<link rel="stylesheet" href="styles.css?v=1#theme">'));
  const linked = await json('--html', local);
  assert.equal(linked.code, 0);
  assert.equal(linked.report.scanStatus, 'complete');
  assert.ok(linked.report.hardHits.includes(1));
  fs.writeFileSync(path.join(temp, 'copy.json'), '{"title":"Welcome to"}');
  const source = await json('--messages', path.join(temp, 'copy.json'));
  assert.equal(source.code, 0);
  assert.equal(source.report.src.files, 1);
  fs.writeFileSync(path.join(temp, 'large.js'), 'x'.repeat(2_000_001));
  const large = await json('--src', path.join(temp, 'large.js'));
  assert.equal(large.code, 0);
  assert.equal(large.report.scanStatus, 'limited');
  assert.equal(large.report.src.files, 0, 'skipped source files must not count as scanned');
  assert.ok(large.report.warnings.some(w => w.kind === 'source-size'));
  assert.ok(!(await run('--html', local, '--text', '0')).out.includes('### text'));
  console.log('ok  local stylesheets, source coverage, messages-only scanning and text limits');

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  fs.writeFileSync(local, htmlWith('<link rel="stylesheet" href="' + origin + '/ok.css"><link rel="stylesheet" href="//127.0.0.1:' + server.address().port + '/other.css">'));
  const offline = await json('--html', local);
  assert.equal(offline.code, 0);
  assert.equal(offline.report.scanStatus, 'limited');
  assert.equal(offline.report.warnings.length, 2);
  assert.equal(requests.length, 0, 'offline mode must not fetch remote stylesheets');
  const ok = await json('--url', origin + '/redirect');
  assert.equal(ok.code, 0);
  assert.equal(ok.report.scanStatus, 'complete');
  assert.equal(ok.report.live.pages[0].final, origin + '/ok');
  assert.ok(ok.report.hardHits.includes(1));
  for (const route of ['/bad-css', '/drop', '/bad-page']) {
    const r = await json('--url', origin + route);
    assert.equal(r.code, 2, route + ' must fail');
    assert.equal(r.report.scanStatus, 'incomplete');
    assert.ok(r.report.errors.length > 0);
    assert.ok(!r.report.hardHits.includes(1), 'error response bodies must not be audited as page/CSS evidence');
  }
  const capped = await json('--url', origin + '/capped', '--max-css', '1');
  assert.equal(capped.code, 0);
  assert.equal(capped.report.scanStatus, 'limited');
  assert.ok(capped.report.warnings.some(w => w.kind === 'stylesheet-limit'));
  assert.ok(!requests.includes('/second.css'));
  console.log('ok  HTTP failures, redirects, offline isolation and explicit CSS limits');
} finally {
  if (server.listening) await new Promise(resolve => server.close(resolve));
  // Only remove the temporary directory created by this test.
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('vibecoded-audit-test-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
