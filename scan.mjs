#!/usr/bin/env node
// vibecoded-audit scanner. Counts "vibecoded" design tells in what a visitor actually receives
// (HTML class attributes, the CSS that applies to them, visible text, <title>) and, optionally, in a source tree.
//
//   node scan.mjs --url https://site.tld/ [--url ...] [--crawl 8] [--text 800] [--src ./src] [--messages ./messages]
//   node scan.mjs --html ./dist            # offline: a .html file or a directory of them (linked local CSS is resolved)
//   flags: --json  --out report.md  --fail-on hard|any  --max-css 12  --text N (visible text per page)  --crawl N (same-origin links)
//
// Numbers are evidence, not verdicts. Read SKILL.md: a tell counts when it reaches the live DOM/CSS;
// source-only hits are debt. Node 18+ (global fetch). No dependencies. MIT.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- args (parsed only when run as a CLI, not when imported)
const opt = { urls: [], html: [], crawl: 0, text: 0, src: [], messages: [], json: false, out: '', failOn: 'none', maxCss: 12 };
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = isMain ? process.argv.slice(2) : [];
for (let i = 0; i < args.length; i++) {
  const a = args[i], v = args[i + 1];
  if (['--url', '--html', '--crawl', '--text', '--src', '--messages', '--max-css', '--out', '--fail-on'].includes(a) && (!v || v.startsWith('--'))) {
    console.error(a + ' requires a value'); process.exit(2);
  }
  if (a === '--fail-on' && !['none', 'hard', 'any'].includes(v)) { console.error('--fail-on must be none, hard or any'); process.exit(2); }
  if (['--crawl', '--text', '--max-css'].includes(a) && (!/^\d+$/.test(v) || (a === '--max-css' && Number(v) === 0))) {
    console.error(a + ' requires a non-negative integer (--max-css must be positive)'); process.exit(2);
  }
  if (a === '--url') { opt.urls.push(v); i++; }
  else if (a === '--html') { opt.html.push(v); i++; }
  else if (a === '--crawl') { opt.crawl = Number(v) || 0; i++; }
  else if (a === '--text') { opt.text = Number(v) || 800; i++; }
  else if (a === '--src') { opt.src.push(v); i++; }
  else if (a === '--messages') { opt.messages.push(v); i++; }
  else if (a === '--max-css') { opt.maxCss = Number(v) || 12; i++; }
  else if (a === '--out') { opt.out = v; i++; }
  else if (a === '--fail-on') { opt.failOn = v; i++; }
  else if (a === '--json') opt.json = true;
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n')); process.exit(0); }
  else { console.error(`unknown flag ${a}`); process.exit(2); }
}
if (isMain && !opt.urls.length && !opt.html.length && !opt.src.length) { console.error('need --url, --html and/or --src (see --help)'); process.exit(2); }

// ---------------------------------------------------------------- tells
// where: html = raw HTML minus <script> (class attrs, hrefs), css = linked + inline CSS whose selectors match shipped classes,
//        text = visible text + title, src = source files, custom = function(live) -> {n, note}
// inverse: tell fires when the count is ZERO (missing skeletons / TOS / privacy). sev: high|med|low from the Reddit study
// (JCarterJohnson/vibecoded-design-tells): shadcn/Tailwind defaults, AI purple, gradients, Inter/Geist, emoji icons, hero+3 cards lead.
const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2B50}\u{2705}\u{2728}]/gu;
const AI_WORDS_EN = "seamless(?:ly)?|effortless(?:ly)?|unlock|elevate|empower(?:ing)?|supercharge|game[- ]changer|cutting[- ]edge|next[- ]level|in today'?s fast[- ]paced|whether you'?re|welcome to|your journey|revolutioni[sz]e|streamline|leverage|delve|tailored|holistic|unparalleled|hassle[- ]free";
const AI_WORDS_DE = "nahtlos|mühelos|entfesseln|revolutionier(?:en|t)|egal,? ob (?:Sie|du)|Ihre Reise|deine Reise|ganzheitlich|ma(?:ss|ß)geschneidert|in der heutigen schnelllebigen|auf das nächste Level";
const AI_WORDS_FR = "sans effort|révolutionn\\w+|que vous soyez|votre parcours|sur mesure|dans un monde en constante évolution|libérez|propulsez";
const AI_WORDS_IT = "senza sforzo|rivoluzion\\w+|che tu sia|il tuo percorso|su misura|nel mondo di oggi|sblocca|potenzia";
const AI_WORDS = new RegExp(`\\b(?:${AI_WORDS_EN}|${AI_WORDS_DE}|${AI_WORDS_FR}|${AI_WORDS_IT})\\b`, 'gi');
const FAKE_NAMES = /\b(?:Sarah (?:Chen|Johnson|K\.)|Alex (?:Rodriguez|Chen|Thompson)|Michael Chen|Emily (?:Rodriguez|Chen)|David Kim|Jessica (?:Lee|Chen)|John Doe|Jane Doe|Priya (?:Patel|Sharma)|James Wilson|Maria Garcia)\b/g;
const CREAM = /#(?:f6f5f0|faf8f5|fdfcf8|f9f7f2|fbf9f4|f7f5ef|fefcf7|f5f2ea|f8f6f1|faf7f0|fdf6e3|f4efe6|f5f0e8)\b/i;
const SERIF_DISPLAY = /font-family:[^;}]*\b(?:DM Serif|Playfair|Fraunces|Instrument Serif|Cormorant|Lora|Newsreader|Libre Baskerville|Source Serif|Spectral|EB Garamond|Crimson)/i;
const SAGE = /#(?:c7d0ae|9caf88|8a9a5b|b2c2a4|a3b18a|748956|e7ebde|b5c99a|a8b5a2|8f9779|7d8f69|97a97c|adc178)\b|\b(?:sage|olive)\b/i;
const SECTION_ORDER = ['hero', 'features', 'pricing', 'testimonials', 'faq', 'cta'];

const TELLS = [
  { id: 1, sev: 'high', tell: 'harsh gradients', html: /bg-gradient-to-\w+/g, css: /(?<!mask:)(?<!mask-image:)(?<!mask:\s)linear-gradient\((?!(?:90deg,)?#[0-9a-f]{6,8} 1px)(?!#fff 0 0)/gi, src: /bg-gradient-|(?<!mask:)linear-gradient\((?!#fff 0 0)/g },
  { id: 2, sev: 'med', tell: 'lucide icons', html: /class="lucide\b/g, src: /from ['"]lucide-react['"]/g },
  { id: 3, sev: 'med', tell: 'pure white background', html: /\bbg-white\b/g, css: /body\{[^}]*background(?:-color)?:\s*(?:#fff\b|#ffffff\b|white\b)/gi, src: /\bbg-white\b/g },
  { id: 4, sev: 'med', tell: 'rainbow coloring (hue families)', html: new RegExp(`\\b(?:bg|text|border|from|to|via)-(${HUES})-\\d{2,3}\\b`, 'g'), src: new RegExp(`\\b(?:bg|text|border|from|to|via)-(${HUES})-\\d{2,3}\\b`, 'g'), families: true },
  { id: 5, sev: 'med', tell: 'drop shadows', html: /\bshadow-(?:sm|md|lg|xl|2xl)\b/g, css: /box-shadow:(?!\s*(?:none|inset|var\(--tw|0 0 #0000))/g, src: /\bshadow-(?:sm|md|lg|xl|2xl)\b/g },
  { id: 6, sev: 'high', tell: '3 feature cards in a row', html: /\bgrid-cols-3\b/g, css: /grid-template-columns:\s*repeat\(3,/g, src: /\bgrid-cols-3\b|repeat\(3,/g },
  { id: 7, sev: 'high', tell: 'emojis', text: EMOJI, src: EMOJI },
  { id: 8, sev: 'low', tell: 'liquid glass', html: /backdrop-blur/g, css: /backdrop-filter:/g, src: /backdrop-blur|backdrop-filter|\bglass\b/g },
  { id: 9, sev: 'med', tell: 'em dashes (visible text + title)', text: /—/g, src: /—/g },
  { id: 10, sev: 'high', tell: 'Inter / Geist / Space Grotesk / Roboto', html: /fonts\.googleapis\.com\/css2?\?family=(?:Inter|Geist|Space\+Grotesk|Roboto)/g, css: /font-family:[^;}]*\b(?:Inter|Geist|Space Grotesk|Roboto)\b/g, src: /next\/font\/google['"][\s\S]{0,80}(?:Inter|Geist|Space_Grotesk|Roboto)|['"](?:Inter|Geist|Space Grotesk|Roboto)['"]/g },
  { id: 11, sev: 'med', tell: 'colored left stripe', html: /\bborder-l-[2-8]\b/g, css: /border-left:\s*[3-8]px solid/g, src: /\bborder-l-[2-8]\b/g },
  { id: 12, sev: 'med', tell: 'testimonials / stock names', html: /testimonial/gi, text: new RegExp(`what (?:our )?(?:customers|users|clients) (?:say|are saying)|${FAKE_NAMES.source}`, 'gi'), src: /testimonial/gi },
  { id: 13, sev: 'low', tell: 'bento grids', html: /\bbento\b|\brow-span-[2-9]\b/g, src: /\bbento\b|row-span-[2-9]/gi },
  { id: 14, sev: 'low', tell: 'terminal window', html: /font-mono|\bterminal\b/g, src: /\bterminal\b|font-mono/gi },
  { id: 15, sev: 'med', tell: '"it\'s not x, it\'s y"', text: /\bnot (?:just|only|a|an) [^.!?]{2,50}?[,;—–-]\s*(?:it'?s|but|this is|that'?s)\b/gi, src: /\bnot (?:just|only|a|an) [^.!?"]{2,50}?[,;—–-]\s*(?:it'?s|but|this is|that'?s)\b|nicht (?:nur )?[^.!?"]{2,50}?, sondern/gi },
  { id: 16, sev: 'med', tell: 'checkmark bullets', html: /lucide-(?:check|circle-check|badge-check)|\bCheckCircle/g, text: /[✓✔]/g, src: /\b(?:CheckCircle2?|CircleCheck|BadgeCheck)\b|[✓✔]/g },
  { id: 17, sev: 'med', tell: 'pricing tiers (price tokens on page)', text: /(?:\$|€|£|CHF)\s?\d+(?:[.,]\d+)?|\d+\s?(?:\$|€|£|CHF)/g, src: /(?:\$|€|£|CHF)\s?\d{1,4}\b/g },
  { id: 18, sev: 'high', tell: 'stock image hosts (PROXY ONLY: "real product demo" needs eyes)', html: /(?:images\.unsplash|unsplash\.com|pexels\.com|pixabay\.com)/g, src: /(?:unsplash|pexels|pixabay)\.com/g },
  { id: 19, sev: 'high', tell: 'soft corner radius', html: /\brounded-(?:lg|xl|2xl|3xl)\b/g, css: /border-radius:\s*(?:1[2-9]|2\d|3\d)px/g, src: /\brounded-(?:lg|xl|2xl|3xl)\b/g },
  { id: 20, sev: 'high', tell: 'purple / violet / indigo', html: /\b(?:bg|text|from|to|via|border)-(?:purple|violet|indigo|fuchsia)-/g, css: /#(?:7c3aed|8b5cf6|a855f7|6d28d9|9333ea|c084fc|6366f1|4f46e5|7e22ce|a78bfa)\b/gi, src: /purple|violet|indigo|fuchsia|#(?:7c3aed|8b5cf6|a855f7|6366f1)/gi },
  { id: 21, sev: 'med', tell: 'skeleton loaders on crawled pages (source count = debt, not a pass)', html: /animate-pulse|skeleton|aria-busy="true"/gi, src: /\bSkeleton\b|animate-pulse/g, inverse: true },
  { id: 22, sev: 'low', tell: 'radial orbs / glow blobs', html: /\bblur-(?:2xl|3xl)\b/g, css: /filter:\s*blur\((?:[4-9]\d|\d{3})px\)/g, src: /\bblur-(?:2xl|3xl)\b|radial-gradient\((?!circle at 1px 1px)/g },
  { id: 23, sev: 'low', tell: 'dot grid texture', html: /bg-\[radial|dot-pattern|bg-dot/g, css: /radial-gradient\(circle at 1px 1px|radial-gradient\([^)]{0,40}1px,\s*transparent/g, src: /radial-gradient\(circle at 1px 1px|dot-pattern|bg-dot/g },
  { id: '23b', sev: 'low', tell: 'line grid texture (related)', css: /linear-gradient\((?:90deg,)?#[0-9a-f]{6,8} 1px,\s*transparent/gi, src: /linear-gradient\((?:90deg,)?#[0-9a-f]{6,8} 1px,\s*transparent/gi },
  { id: 24, sev: 'high', tell: 'sparkle icons', html: /lucide-sparkles?|\bsparkle/gi, text: /✨/g, src: /\bSparkles?\b|✨/g },
  { id: 25, sev: 'med', tell: 'animated arrows', html: /(?:group-)?hover:translate-x/g, css: /:hover[^{]*\{[^}]*translateX\(/g, src: /(?:group-)?hover:translate-x/g },
  { id: 26, sev: 'med', tell: 'terms / TOS link present', html: /href="[^"]*(?:terms|tos\b|agb|nutzungsbedingungen|conditions-generales|condizioni)[^"]*"/gi, inverse: true },
  { id: 27, sev: 'med', tell: 'privacy link present', html: /href="[^"]*(?:privacy|datenschutz|confidentialite|informativa)[^"]*"/gi, inverse: true },
  { id: 28, sev: 'med', tell: 'hover animations', html: /hover:(?:scale-|-translate-y-|shadow-|rotate-)/g, css: /:hover\{[^}]*transform:\s*(?:scale|translate)/g, src: /hover:(?:scale-|-translate-y-|shadow-|rotate-)/g },
  { id: 29, sev: 'high', tell: 'neon colors', html: /\bneon\b|\b(?:bg|text)-(?:lime|cyan|fuchsia)-(?:300|400|500)\b/gi, css: /#(?:00ff\w{2}|0ff\b|39ff14|ff00ff|ccff00|00ffff)/gi, src: /\bneon\b|\b(?:lime|cyan|fuchsia)-(?:300|400)\b|#(?:39ff14|00ff|ff00ff)/gi },
  { id: 30, sev: 'med', tell: 'basic pastel (bg-*-50/100/200)', html: /\bbg-[a-z]+-(?:50|100|200)\b/g, src: /\bbg-[a-z]+-(?:50|100|200)\b/g },
  // ---- extended tells (see patterns.md)
  { id: 31, sev: 'med', tell: 'generic CTA copy (get started / learn more)', text: /\b(?:get started|learn more|start (?:for )?free|book a demo|try (?:it )?(?:for )?free|sign up (?:for )?free|jetzt starten|mehr erfahren|commencer|en savoir plus|inizia ora|scopri di più)\b/gi, src: /\b(?:get started|learn more|start for free|book a demo|try it free)\b/gi },
  { id: 32, sev: 'high', tell: 'gradient text', html: /bg-clip-text|text-transparent/g, css: /background-clip:\s*text/g, src: /bg-clip-text|background-clip:\s*text/g },
  { id: 33, sev: 'med', tell: 'icon tile above heading', html: /(?:h-1[0-6]|w-1[0-6]) [^"]*rounded-(?:lg|xl|2xl|full)[^"]*(?:flex|grid)[^"]*items-center justify-center|flex h-1[0-6] w-1[0-6] items-center justify-center rounded/g, src: /flex h-1[0-6] w-1[0-6] items-center justify-center rounded|rounded-(?:xl|2xl) (?:bg-[a-z]+-(?:50|100)|bg-primary\/10)/g },
  { id: 34, sev: 'med', tell: '"trusted by" / logo cloud', text: /\btrusted by\b|\bas seen (?:on|in)\b|\bloved by\b|\bused by \d/gi, src: /\btrusted by\b|\bas seen (?:on|in)\b|\bloved by\b/gi },
  { id: 35, sev: 'med', tell: 'unsourced stat counters', text: /\b\d{1,3}(?:[,.]\d{3})*\s?(?:\+|k\+|%)\s*(?:users|customers|companies|businesses|uptime|countries|downloads|members|clients|projects|Nutzer|Kunden|utilisateurs|utenti)\b/gi, src: /\b\d{1,3}(?:[,.]\d{3})*\s?(?:\+|k\+|%)\s*(?:users|customers|companies|businesses|uptime|countries|downloads|members)\b/gi },
  { id: 36, sev: 'med', tell: 'AI copy vocabulary (EN/DE/FR/IT)', text: AI_WORDS, src: new RegExp(AI_WORDS.source, 'gi'), words: true },
  { id: 37, sev: 'high', tell: 'default shadcn/Tailwind tokens', html: /\b(?:bg-background|text-foreground|text-muted-foreground|bg-card|ring-offset-background|bg-primary\b)/g, css: /--background:\s*0 0% 100%|--radius:\s*0\.5rem/g, src: /text-muted-foreground|bg-background|ring-offset-background/g },
  { id: 38, sev: 'med', tell: 'default gray palette (zinc/slate/gray/neutral)', html: /\b(?:bg|text|border)-(?:zinc|slate|gray|neutral)-\d{2,3}\b/g, src: /\b(?:bg|text|border)-(?:zinc|slate|gray|neutral)-\d{2,3}\b/g },
  { id: 39, sev: 'med', tell: 'dead links (href="#")', html: /href="#"|href="javascript:void/g, src: /href="#"|href=\{?['"]#['"]/g },
  { id: 40, sev: 'med', tell: 'placeholder copy (lorem / coming soon / acme)', text: /lorem ipsum|coming soon|under construction|\bplaceholder\b|\[your (?:company|name)\]|\bacme\b|demnächst|bientôt disponible|prossimamente/gi, src: /lorem ipsum|coming soon|under construction|\bacme\b/gi },
  { id: 47, sev: 'med', tell: 'generic FAQ accordion', text: /frequently asked questions|\bFAQs?\b|häufige fragen|questions fréquentes|domande frequenti/gi, html: /<details\b/g, src: /\bfaq\b/gi },
  { id: 41, sev: 'med', tell: 'default or missing metadata', custom: live => {
      const findings = live.pages.filter(p => !p.error).flatMap(p => {
        const missing = [!p.title && 'title', /^(?:Create Next App|Vite(?: \+.*)?|React App)$/i.test(p.title) && 'default title', !p.ogImage && 'og:image', !p.lang && 'lang', !p.favicon && 'favicon', !p.description && 'description'].filter(Boolean);
        return missing.length ? [p.final + ': ' + missing.join(', ')] : [];
      });
      return { n: findings.length, note: findings.join('; ') || 'metadata fields present; verify content manually' };
    } },
  { id: 42, sev: 'low', tell: 'text-center everywhere', html: /\btext-center\b/g, src: /\btext-center\b/g },
  { id: 43, sev: 'med', tell: 'transition-all / hover:scale-105', html: /transition-all|hover:scale-105/g, src: /transition-all|hover:scale-105/g },
  { id: 44, sev: 'low', tell: 'cookie consent in server HTML (CH/EU)', html: /cookie/gi, inverse: true, ssrOnly: true },
  { id: 45, sev: 'med', tell: 'rule of three rhythm', manual: 'Count section items in a browser; HTML counts alone cannot establish the layout.' },
  { id: 46, sev: 'med', tell: 'dead design layer shipped', manual: 'Compare the CSS estimate with actual browser coverage before removing any CSS.' },
  { id: 48, sev: 'med', tell: '"tasteful default" (cream bg + serif display + sage accent)', custom: live => {
      const bg = CREAM.test(live.bodyBg) || CREAM.test(live.cssResolved.match(/body\{[^}]*\}/i)?.[0] || '');
      const serif = SERIF_DISPLAY.test(live.cssResolved), sage = SAGE.test(live.cssResolved);
      const parts = [bg && 'cream body', serif && 'serif display', sage && 'sage accent'].filter(Boolean);
      return { n: parts.length === 3 ? 1 : 0, note: parts.length ? `${parts.length}/3: ${parts.join(', ')}` : '0/3' };
    } },
  { id: 49, sev: 'high', tell: 'template section order (hero→features→pricing→testimonials→faq→cta)', custom: live => {
      let best = 0, bestPage = '';
      for (const p of live.pages) {
        if (p.error) continue;
        const seen = [...p.html.matchAll(/(?:id|class)="[^"]*\b(hero|features?|pricing|testimonials?|faq|cta)\b[^"]*"/gi)].map(m => m[1].toLowerCase().replace(/s$/, '').replace('feature', 'features').replace('testimonial', 'testimonials'));
        let k = 0; for (const s of seen) if (s === SECTION_ORDER[k]) k++;
        if (k > best) { best = k; bestPage = p.final; }
      }
      return { n: best >= 4 ? 1 : 0, note: `longest canonical run ${best}/6${bestPage ? ' on ' + bestPage : ''}` };
    } },
].sort((a, b) => parseFloat(a.id) - parseFloat(b.id));

// ---------------------------------------------------------------- helpers
const count = (re, s) => { if (!re || !s) return 0; re.lastIndex = 0; let n = 0; while (re.exec(s)) { n++; if (re.lastIndex === 0) break; } return n; };
const matches = (re, s) => { if (!re || !s) return []; re.lastIndex = 0; const out = []; let m; while ((m = re.exec(s))) { out.push(m[1] ?? m[0]); if (re.lastIndex === 0) break; } return out; };
const uniqTop = (arr, n = 8) => { const c = {}; for (const a of arr) c[a.toLowerCase()] = (c[a.toLowerCase()] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}×${v}`).join(' '); };
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&#8212;|&mdash;/g, '—');
const stripScripts = h => h.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
// evidence snippets around matches; pipes/newlines removed so they survive a markdown table
const snippets = (re, s, n = 2, before = 30, after = 30) => { if (!re || !s) return []; re.lastIndex = 0; const out = []; let m; while ((m = re.exec(s)) && out.length < n) { const a = Math.max(0, m.index - before), b = Math.min(s.length, m.index + m[0].length + after); out.push('…' + s.slice(a, b).replace(/[|\n\r]+/g, ' ').trim() + '…'); if (re.lastIndex === 0) break; } return out; };
// keep only CSS rules whose selector classes all occur in the shipped HTML (Tailwind escapes like .md\:grid-cols-3 handled).
// Rules without classes (body, a:hover, @font-face, keyframe steps) are kept. This separates "shipped" CSS from "applied" CSS.
export function appliedCss(css, classSet) {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@(?:media|supports|layer|container)[^{]*\{/g, '');
  const kept = [];
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (!sel) continue;
    if (sel.startsWith('@')) { kept.push(`${sel}{${body}}`); continue; }
    const applies = sel.split(',').some(alt => [...alt.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)].map(x => x[1].replace(/\\(.)/g, '$1')).every(c => classSet.has(c)));
    if (applies) kept.push(`${sel}{${body}}`);
  }
  return kept.join('\n');
}
function visibleText(html) {
  return decode(html.replace(/<head\b[\s\S]*?<\/head>/i, ' ').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ').replace(/<template\b[\s\S]*?<\/template>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? (m[1] ?? m[2] ?? m[3]) : null; };
async function get(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 vibecoded-audit (+https://github.com/KreshBack/vibecoded-audit)', accept: 'text/html,text/css,*/*' } });
  return { url: res.url, status: res.status, body: await res.text() };
}
function pageFromHtml(requested, finalUrl, status, html) {
  const title = decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1]).trim();
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(t => /rel=["']?stylesheet/i.test(t)).map(t => attr(t, 'href')).filter(Boolean);
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => attr(m[0], 'src') || '').filter(Boolean);
  return { requested, final: finalUrl, status, redirected: finalUrl !== requested, title, bytes: html.length, html: stripScripts(html), text: visibleText(html) + ' ' + title, inline, links,
    imgs: imgs.length, videos: count(/<video\b/gi, html), stockImgs: imgs.filter(s => /unsplash|pexels|pixabay/i.test(s)).length,
    lang: (html.match(/<html[^>]*\blang=["']?([a-zA-Z-]+)/) || [])[1] || null,
    ogImage: /property=["']og:image["']/i.test(html), favicon: /rel=["'](?:shortcut )?icon["']/i.test(html) || /rel=["']icon/i.test(html),
    description: /name=["']description["']/i.test(html), skipLink: /<a\b[^>]*href="#(?:main|content|main-content|hauptinhalt|contenu|contenuto)"/i.test(html) };
}

// ---------------------------------------------------------------- live + offline
async function scanLive() {
  const pages = [], cssSheets = new Map();
  const seen = new Set();
  // --url pages (with optional crawl)
  let queue = [...opt.urls];
  const limit = Math.max(opt.urls.length, 1) + (opt.crawl || 0);
  while (queue.length && pages.length < limit) {
    const u = queue.shift(); if (!u || seen.has(u)) continue; seen.add(u);
    let r; try { r = await get(u); } catch (e) { pages.push({ requested: u, error: String(e.message || e) }); continue; }
    const page = pageFromHtml(u, r.url, r.status, r.body);
    for (const href of page.links) { try { const abs = new URL(href, r.url).href; if (!cssSheets.has(abs) && cssSheets.size < opt.maxCss) cssSheets.set(abs, null); } catch {} }
    pages.push(page);
    if (opt.crawl && pages.length === 1) {
      const origin = new URL(r.url).origin;
      const hrefs = [...r.body.matchAll(/<a\b[^>]*>/gi)].map(m => attr(m[0], 'href')).filter(Boolean);
      for (const h of hrefs) { try { const abs = new URL(h, r.url); if (abs.origin === origin && !/\.(?:png|jpg|svg|pdf|xml)$/i.test(abs.pathname)) { abs.hash = ''; if (!seen.has(abs.href) && queue.length < opt.crawl * 3) queue.push(abs.href); } } catch {} }
    }
  }
  for (const [href] of cssSheets) { try { const r = await get(href); cssSheets.set(href, r.body); } catch { cssSheets.set(href, ''); } }
  // --html files (offline). Linked stylesheets are resolved relative to the file when they exist on disk.
  const localFiles = opt.html.flatMap(p => fs.existsSync(p) ? (fs.statSync(p).isDirectory() ? walk(p, [], /\.html?$/i) : [p]) : (console.error(`--html not found: ${p}`), []));
  for (const f of localFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const page = pageFromHtml(f, f, 200, html);
    for (const href of page.links) { if (/^https?:/i.test(href)) continue; const p = path.resolve(path.dirname(f), href.split('?')[0]); if (fs.existsSync(p) && !cssSheets.has(p)) cssSheets.set(p, fs.readFileSync(p, 'utf8')); }
    pages.push(page);
  }
  const css = [...cssSheets.values()].join('\n') + '\n' + pages.map(p => p.inline || '').join('\n');
  const html = pages.map(p => p.html || '').join('\n');
  const text = pages.map(p => p.text || '').join('\n');
  const classSet = new Set(matches(/class="([^"]*)"/g, html).flatMap(s => s.split(/\s+/)).filter(Boolean));
  const cssApplied = appliedCss(css, classSet);
  // resolve custom properties (var(--x)) so fonts, body background and tell 48 see real values
  const vars = {}; for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)) vars[m[1]] ??= m[2].trim();
  const resolve = s => s.replace(/var\(--([\w-]+)(?:\s*,[^)]*)?\)/g, (all, n) => vars[n] ?? all);
  const cssResolved = resolve(resolve(cssApplied));
  const firstFamily = f => f.split(',')[0].replace(/["'\\]/g, '').trim();
  const fonts = uniqTop(matches(/font-family:\s*([^;}]{1,60})/gi, cssResolved).map(firstFamily).filter(f => !/^var\(|^inherit$|^monospace$|^sans-serif$|^serif$|^system-ui$/i.test(f)), 8);
  const fontFaces = uniqTop(matches(/@font-face\{[^}]*?font-family:\s*([^;}]+)/gi, css).map(firstFamily), 8);
  const radii = uniqTop(matches(/border-radius:\s*([^;}]{1,20})/gi, cssResolved), 8);
  const bodyBg = matches(/body\{[^}]*?background(?:-color)?:\s*([^;}]+)/gi, cssResolved).join(' | ') || '(not set in CSS, check html class)';
  return { pages, css, cssApplied, cssResolved, classCount: classSet.size, html, text, sheets: [...cssSheets.entries()].map(([k, v]) => ({ href: k, bytes: (v || '').length })), fonts, fontFaces, radii, bodyBg,
    titleEmDash: pages.filter(p => /—/.test(p.title || '')).length, noTitle: pages.filter(p => !p.error && !p.title).length };
}

// ---------------------------------------------------------------- source
const EXT = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.cjs', '.css', '.scss', '.html', '.vue', '.svelte', '.astro', '.json', '.md', '.mdx']);
const SKIP_DIR = new Set(['node_modules', '.next', '.nuxt', 'dist', 'build', 'out', 'coverage', '.git', '__tests__', '.turbo', '.vercel', 'storybook-static']);
function walk(dir, files = [], only = null) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of ents) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(path.join(dir, e.name), files, only); }
    else if (only ? only.test(e.name) : (EXT.has(path.extname(e.name)) && !/\.(?:test|spec)\.[jt]sx?$/.test(e.name) && !/lock/.test(e.name))) files.push(path.join(dir, e.name));
  }
  return files;
}
function scanSrc() {
  const files = [...opt.src, ...opt.messages].flatMap(d => fs.existsSync(d) ? (fs.statSync(d).isDirectory() ? walk(d) : [d]) : []);
  const per = {}; let loadingFiles = 0;
  for (const f of files) {
    if (/(?:^|[\\/])loading\.(?:tsx|jsx|js|ts|vue|svelte)$/.test(f)) loadingFiles++;
    let s; try { if (fs.statSync(f).size > 2_000_000) continue; s = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const t of TELLS) {
      if (!t.src) continue;
      const n = count(t.src, s); if (!n) continue;
      const rec = per[t.id] ||= { n: 0, files: new Set(), samples: [] };
      rec.n += n; rec.files.add(f);
      if (t.families || t.words) rec.samples.push(...matches(t.src, s));
    }
  }
  return { files: files.length, per, loadingFiles };
}

// ---------------------------------------------------------------- report
const isHardId = id => Number.isInteger(id) && id >= 1 && id <= 30;
async function main() {
  const live = opt.urls.length || opt.html.length ? await scanLive() : null;
  const src = opt.src.length || opt.messages.length ? scanSrc() : null;
  const rows = [];
  for (const t of TELLS) {
    const row = { id: t.id, sev: t.sev, tell: t.tell };
    if (live) {
      const parts = [], ev = [];
      let total = 0;
      if (t.custom) { const r = t.custom(live); total += r.n; parts.push(r.note); }
      if (t.html) { const n = count(t.html, live.html); total += n; parts.push(`html ${n}`); if (n) ev.push(...snippets(t.html, live.html, 1, 40, 10)); }
      if (t.css) { const n = count(t.css, live.cssApplied), all = count(t.css, live.css); total += n; parts.push(`css ${n}${all !== n ? ` (shipped ${all})` : ''}`); if (n) ev.push(...snippets(t.css, live.cssApplied, 2, 70, 0)); }
      if (t.text) { const n = count(t.text, live.text); total += n; parts.push(`text ${n}`); if (n) ev.push(...snippets(t.text, live.text, 2, 30, 30)); }
      row.live = parts.join(' · ');
      if (t.families && total) row.live += ` · families: ${uniqTop(matches(t.html, live.html), 16)}`;
      if (t.words && total) row.live += ` · ${uniqTop(matches(t.text, live.text), 10)}`;
      if (t.id === 9) row.live += ` · title em dash on ${live.titleEmDash}/${live.pages.length} pages`;
      if (t.id === 21 && src) row.live += ` · loading files ${src.loadingFiles}`;
      if (ev.length) row.live += ` · e.g. ${ev.map(e => `"${e}"`).join(' ')}`;
      row.liveVerdict = !parts.length ? '' : t.inverse ? (total === 0 ? (t.ssrOnly ? 'not in SSR HTML, verify in a browser' : 'HIT (missing)') : 'ok') : (total === 0 ? 'pass' : 'HIT?');
    }
    if (t.manual) { row.live = t.manual; row.liveVerdict = 'manual review'; }
    if (src && t.src) {
      const r = src.per[t.id];
      row.src = r ? `${r.n} in ${r.files.size} files` : '0';
      if (r && (t.families || t.words)) row.src += ` · ${uniqTop(r.samples, 12)}`;
    }
    rows.push(row);
  }
  const hardHits = rows.filter(r => isHardId(r.id) && /^HIT/.test(r.liveVerdict || '')).map(r => r.id);
  const anyHits = rows.filter(r => /^HIT/.test(r.liveVerdict || '')).map(r => r.id);

  let text;
  if (opt.json) {
    text = JSON.stringify({ live: live && { pages: live.pages.map(({ html, text, inline, links, ...p }) => p), sheets: live.sheets, cssBytes: live.css.length, cssAppliedBytes: live.cssApplied.length, fonts: live.fonts, fontFaces: live.fontFaces, radii: live.radii, bodyBg: live.bodyBg, noTitle: live.noTitle }, src: src && { files: src.files, loadingFiles: src.loadingFiles }, rows, hardHits, anyHits }, null, 2);
  } else {
    const out = [];
    if (live) {
      out.push(`## Live: ${live.pages.length} page(s), ${live.sheets.length} stylesheet(s), ${Math.round(live.sheets.reduce((a, s) => a + s.bytes, 0) / 1024)} KB CSS`);
      for (const p of live.pages) out.push(p.error ? `- ${p.requested} → ERROR ${p.error}` : `- ${p.requested}${p.redirected ? ` → **${p.final}**` : ''} [${p.status}] "${p.title}" · ${p.imgs} img (${p.stockImgs} stock), ${p.videos} video · lang=${p.lang} og:image=${p.ogImage ? 'yes' : 'NO'} favicon=${p.favicon ? 'yes' : 'NO'} description=${p.description ? 'yes' : 'NO'} skip-link=${p.skipLink ? 'yes' : 'no'}`);
      out.push(`- CSS estimate for these pages: ~${Math.round(live.cssApplied.length / 1024)} KB of ${Math.round(live.css.length / 1024)} KB shipped (${Math.round(100 * live.cssApplied.length / Math.max(1, live.css.length))}%), ${live.classCount} distinct classes in HTML. Class-based estimate only; validate browser coverage before removing CSS.`);
      if (live.noTitle) out.push(`- **${live.noTitle} page(s) have no <title>**`);
      out.push(`- fonts applied: ${live.fonts || '(none found)'} · @font-face: ${live.fontFaces || '(none)'}`);
      out.push(`- border-radius values (applied): ${live.radii || '(none)'}`);
      out.push(`- body background: ${live.bodyBg}`);
      for (const s of live.sheets) out.push(`- css ${Math.round(s.bytes / 1024)} KB ${s.href}`);
      if (opt.text) for (const p of live.pages) if (!p.error) out.push(`\n### text ${p.final}\n${p.text.slice(0, opt.text)}${p.text.length > opt.text ? ' …' : ''}`);
      out.push('');
    }
    if (src) out.push(`## Source: ${src.files} files scanned, ${src.loadingFiles} loading.* route files\n`);
    out.push(`| # | Sev | Tell | Live | Live verdict | Source |`, `|---|---|---|---|---|---|`);
    for (const r of rows) out.push(`| ${r.id} | ${r.sev} | ${r.tell} | ${r.live ?? ''} | ${r.liveVerdict ?? ''} | ${r.src ?? ''} |`);
    out.push('', `Hard hits (tells 1–30): ${hardHits.length ? hardHits.join(', ') : 'none'}. All hits: ${anyHits.length ? anyHits.join(', ') : 'none'}.`);
    out.push('Live verdict is mechanical: HIT? = pattern reached the shipped DOM/CSS, read the evidence before calling it. Source counts are debt unless they also appear live. Tells the scanner cannot see (fake testimonials, real product demo, 3 equal pricing cards, palette judgment, hover intent, rule-of-three rhythm) need the manual pass in SKILL.md.');
    text = out.join('\n');
  }
  if (opt.out) fs.writeFileSync(opt.out, text + '\n', 'utf8'); else console.log(text);
  if (opt.out && !opt.json) console.log(`report written to ${opt.out}: ${hardHits.length} hard hit(s), ${anyHits.length} total`);
  if (live && (!live.pages.length || live.pages.some(p => p.error || p.status >= 400))) process.exit(2);
  if (opt.failOn === 'hard' && hardHits.length) process.exit(1);
  if (opt.failOn === 'any' && anyHits.length) process.exit(1);
}
if (isMain) main().catch(e => { console.error(e); process.exit(2); });
