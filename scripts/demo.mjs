import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2];
if (process.argv.length > 3 || (mode && !['--write-assets', '--check-assets'].includes(mode))) {
  console.error('Usage: node scripts/demo.mjs [--write-assets|--check-assets]');
  process.exit(2);
}
const scan = name => JSON.parse(execFileSync(process.execPath, ['scan.mjs', '--html', `fixtures/${name}.html`, '--json'], { cwd: root, encoding: 'utf8' }));
const sample = scan('vibecoded');
const baseline = scan('clean');
const selected = [1, 39, 41, 45].map(id => sample.rows.find(row => row.id === id));
const action = {
  1: 'Review the gradient in context; remove it only if it does not serve the design.',
  39: 'Replace placeholder hrefs with working destinations or the appropriate button action.',
  41: 'Write a specific title and description; set the language, favicon and social preview.',
  45: 'Inspect the rendered layout. A regular expression cannot judge section rhythm.',
};
const md = [
  '# Example audit', '',
  'Generated from the bundled fictional fixtures. This is an excerpt of a 49-row checklist, not a design score or proof of AI authorship.', '',
  '```bash', 'npm run demo', '```', '',
  `The deliberately generic fixture produces **${sample.hardHits.length} core matches** and **${sample.anyHits.length} total matches to review**. Its scan status is **${sample.scanStatus}**.`, '',
  ...sample.warnings.map(w => `- Coverage note: ${w.message} (${w.target})`), '',
  ...selected.flatMap(row => [
    `## ${row.id}. ${row.tell}`, '',
    `**${row.liveVerdict}**`, '',
    '```text', row.live, '```', '',
    `**Next step:** ${action[row.id]}`, '',
  ]),
  `The separate clean fixture produces **${baseline.hardHits.length} core matches**. These are different fictional pages, not a measured before/after redesign. A zero count does not certify design quality, accessibility or legal compliance.`, '',
  '## Try the full reports', '',
  '```bash', 'node scan.mjs --html fixtures/vibecoded.html', 'node scan.mjs --html fixtures/clean.html', 'node scan.mjs --url https://your-site.example/ --text 800', '```', '',
  'See [the README](../README.md) for installation, limitations and CI usage.', '',
].join('\n');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const short = row => row.live.split(' \u00b7 e.g. ')[0];
const manual = selected.find(row => row.id === 45);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="660" viewBox="0 0 840 660" role="img" aria-labelledby="title desc">
<title id="title">vibecoded-audit: real findings from a fictional fixture</title>
<desc id="desc">${escape(`${sample.anyHits.length} pattern matches to review. Excerpts: gradients, placeholder links, missing metadata and a manual layout review. Coverage ${sample.scanStatus}; remote CSS is omitted in offline mode. These are review prompts, not a design score.`)}</desc>
<rect width="840" height="660" fill="#101923"/>
<g font-family="Arial, Helvetica, sans-serif" fill="#ecf1f5">
<text x="32" y="44" font-size="18" fill="#9cb1c0" letter-spacing="1">VIBECODED-AUDIT / FICTIONAL FIXTURE</text>
<text x="32" y="94" font-size="36" font-weight="700">See the evidence.</text>
<text x="32" y="132" font-size="21" fill="#bccbd5">${sample.anyHits.length} pattern matches to review, with evidence for each finding.</text>
<rect x="32" y="157" width="776" height="52" fill="#1d2a36"/>
<text x="50" y="190" font-family="monospace" font-size="20" fill="#9ce4c4">$ npm run demo</text>
${selected.slice(0, 3).map((row, i) => {
  const y = 251 + i * 91;
  const evidence = row.id === 41 ? row.live.replace(/^fixtures\/vibecoded\.html: /, '') : short(row);
  return `<text x="32" y="${y}" font-size="23" font-weight="700">${escape(row.id + '. ' + row.tell)}</text>
<text x="808" y="${y}" text-anchor="end" font-size="19" fill="#f5cb83">${escape(row.liveVerdict)}</text>
<text x="32" y="${y + 33}" font-family="monospace" font-size="18" fill="#bccbd5">${escape(evidence)}</text>
<path d="M32 ${y + 51}H808" stroke="#344350"/>`;
}).join('\n')}
<text x="32" y="526" font-size="22" font-weight="700">${escape(manual.id + '. ' + manual.tell)}</text>
<text x="808" y="526" text-anchor="end" font-size="18" fill="#9ce4c4">MANUAL REVIEW</text>
<text x="32" y="559" font-size="19" fill="#bccbd5">Inspect the rendered layout before assigning a verdict.</text>
<path d="M32 587H808" stroke="#344350"/>
<text x="32" y="619" font-size="18" fill="#f5cb83">Coverage: ${escape(sample.scanStatus)}. Remote CSS omitted in offline mode.</text>
<text x="32" y="645" font-size="16" fill="#9cb1c0">Selected rows from the actual scanner output. Reproduce with npm run demo.</text>
</g>
</svg>
`;
const files = new Map([['examples/demo.md', md], ['assets/demo.svg', svg]]);
if (mode === '--write-assets') {
  for (const [file, content] of files) fs.writeFileSync(path.join(root, file), content, 'utf8');
  console.log('Updated examples/demo.md and assets/demo.svg from the current scanner.');
} else if (mode === '--check-assets') {
  for (const [file, expected] of files) assert.equal(fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'), expected, file + ' is stale; run npm run demo:update');
  console.log('ok  README demo matches actual fixture output');
} else console.log(md);
