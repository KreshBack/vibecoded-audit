# Vibecoded tells — reference

Tells 1–30 are the viral "30 reasons your site looks vibecoded (give this to claude/chatgpt)" list that circulated on TikTok in 2026 (creator credit welcome, open an issue). 31–49 were added because they show up repeatedly in AI-generated sites and are cheap to detect. `scan.mjs` implements the mechanical part; the **Judgment** column says what a human (or you, reading the evidence) still has to decide.

Legend for Detect: `html` = class attributes and hrefs of the shipped page, `css` = rules retained by the class-name heuristic (not browser-computed styles), `text` = visible text plus `<title>`, `src` = source tree, `manual` = needs eyes or a browser.

## The original 30

| # | Tell | Why it reads as generated | Detect | Judgment | Fix direction |
|---|---|---|---|---|---|
| 1 | harsh gradients | default "from-X-500 to-Y-500" hero backgrounds, two saturated hues | html `bg-gradient-to-*`, css `linear-gradient(` | masks (`-webkit-mask:linear-gradient(#fff 0 0)`), 1px grid lines and low-alpha edge highlights are not this tell | one flat brand color, or a photograph |
| 2 | lucide icons | the default icon set of every starter; identical strokes on every card | html `class="lucide"`, src `from 'lucide-react'` | any icon library used as decoration counts; icons used as controls (menu, close, search) are fine | typographic glyphs (`+`, `→`, `✳`), numbers, or none |
| 3 | pure white background | `#fff` body with gray-200 borders is the unstyled default | css `body{background:#fff}`, html `bg-white` | check the body rule that applies, not every `bg-white` | tinted paper (`#F6F5F0`, `#FAF8F5`), or a committed dark ground |
| 4 | rainbow coloring | one hue per feature card, five hues per page | html/src hue families used | more than 3 hue families across marketing pages = tell | one accent, neutrals tinted toward the brand hue |
| 5 | drop shadows | `shadow-md` on every card | html `shadow-*`, css `box-shadow` | one or two intentional shadows (a lifted object, a menu) are fine | 1px rules, flat surfaces, paper stacking |
| 6 | 3 feature cards in a row | heading + paragraph + three equal cards, the template rhythm | html `grid-cols-3`, css `repeat(3,` | footers, nav menus and data tables also use 3 columns; the tell is equal *feature* cards under a heading | asymmetric grid, stacked list, one big + two small, editorial numbering |
| 7 | emojis | in headings, bullets, feature icons | text + src emoji ranges | dingbats used as designed glyphs (`✳`, `✦`) are not emojis | words, glyphs, real icons |
| 8 | liquid glass | `backdrop-blur` + `bg-white/30` cards over gradients | html `backdrop-blur`, css `backdrop-filter` | a blurred sticky header alone is weak evidence | solid surfaces |
| 9 | em dashes | LLM copy fingerprint; also in `<title>` and meta | text + title `—`, src messages | count only strings that reach the DOM: the active i18n namespace, metadata defaults, alt text | commas, colons, full stops, or a pipe in titles |
| 10 | Inter / Geist / Space Grotesk | the default fonts of Next, Vercel and Tailwind templates (Roboto too) | css `font-family`, html Google Fonts link, src `next/font/google` | Inter as a body face on a product UI is acceptable; on a brand site it is the tell | self-hosted face with character, one display + one text face |
| 11 | colored left stripe | `border-l-4 border-blue-500` callouts and cards | html `border-l-*`, css `border-left: 3-8px solid` | hand-written CSS trips it just as often as Tailwind; blockquotes in prose are borderline | top rule, indent, background tint |
| 12 | fake testimonials | quotes from "Sarah Chen, Head of Marketing" with stock avatars | html/src `testimonial`, text "what our customers say", the stock-name list (Sarah Chen, Alex Rodriguez, Michael Chen, David Kim, John Doe …) | these are illustrative name patterns, not evidence that a real person or quote is fake; verify provenance | remove, or replace with one verifiable quote |
| 13 | bento grids | Apple-style mixed-span tiles for features | html `bento`, `row-span-*` | | linear sections |
| 14 | terminal window | fake `$ npm install` box on a non-dev product | html `font-mono`, `terminal` | code blocks on a developer product are fine | screenshot of the real product |
| 15 | "it's not x, it's y" | LLM headline template ("It's not a to-do list. It's a second brain.") | text regex, src messages | also "not just X, but Y" | say what it is |
| 16 | checkmark bullets | `✓` or CheckCircle before every feature | html check icons, text `✓✔` | one comparison table with checks is fine | plain list, `+` or `–`, numbered |
| 17 | 3 pricing tiers | Free / Pro / Enterprise in three equal cards, middle one highlighted | text price tokens; manual on the pricing page | four tiers in a 3-column grid is the same tell | one clear price, or a table |
| 18 | no real product demos | hero shows a stock photo or an illustration, never the product | html img sources (stock hosts), manual: does any image show the product? | a screenshot of an empty or placeholder UI does not count | one real screenshot, an embedded live sample, a 20-second video |
| 19 | soft corner radius | `rounded-xl` / 12–24px on everything | html `rounded-lg+`, css `border-radius ≥ 12px` | `rounded-full` on avatars is fine | radius 0 to 4px, or one deliberate large radius |
| 20 | purple and black | `#7c3aed` on `#0a0a0a`, the AI-startup uniform | html purple/violet/indigo classes, css purple hexes | | brand hue with a tinted neutral |
| 21 | no skeleton loaders | spinner or "Loading..." text; layout jumps | html `animate-pulse`/`skeleton`, src `loading.*` route files | client-only skeletons are invisible to curl: read the code or use a browser | skeletons shaped like the content |
| 22 | radial orbs | blurred colored circles floating behind the hero | html `blur-2xl/3xl`, css `filter:blur(40px+)` | | remove |
| 23 | dot grids | `radial-gradient(circle at 1px 1px …)` background texture | css dot pattern; `23b` reports 1px line grids as the related texture | a Swiss line grid can be a deliberate brand device; still say so in the report | photograph, flat color |
| 24 | sparkle icons | ✨ or `Sparkles` next to anything "AI" | html/text/src | | remove |
| 25 | animated arrows | `→` sliding right on hover on every link | html `group-hover:translate-x`, css `:hover{translateX` | | static arrow or none |
| 26 | no TOS | footer without terms | html terms/AGB/conditions href | absence is a review prompt; applicability depends on the site | review applicable requirements |
| 27 | no privacy policy | footer without privacy link | html privacy/Datenschutz/confidentialite/informativa href | absence is a review prompt; an imprint is not a privacy policy | review applicable requirements |
| 28 | hover animations | `hover:scale-105`, `hover:-translate-y-1 hover:shadow-lg` on cards | html hover classes, css `:hover{transform` | one restrained lift on buttons is fine; on every card it is the tell | color or underline change only |
| 29 | neon colors | `#00ff`, lime-400, cyan-400 accents | html/css | | desaturate |
| 30 | basic pastel colors | `bg-blue-100`, `bg-green-50` tag and card fills | html `bg-*-50/100/200` | tinted neutrals derived from the brand hue are fine | two-tone: ink + paper |

## Extended tells

| # | Tell | Why | Detect | Judgment | Fix direction |
|---|---|---|---|---|---|
| 31 | generic CTA copy | "Get started" / "Learn more" / "Start for free" | text | | verbs that name the action ("Find a business", "Submit a profile") |
| 32 | gradient text | `bg-clip-text text-transparent` headline | html, css `background-clip:text` | | solid ink, one accent word in the brand color |
| 33 | icon tile above heading | rounded square with tinted background and an icon over every card title | html `flex h-12 w-12 items-center justify-center rounded-*` | | number, glyph, or nothing |
| 34 | "trusted by" logo cloud | grey logo row with no customers behind it | text | real customers with permission are fine | remove until true |
| 35 | unsourced stat counters | "10k+ users", "99.9% uptime", "50+ countries" | text | | real numbers with a date, or none |
| 36 | AI copy vocabulary (EN/DE/FR/IT) | seamless, effortless, unlock, elevate, empower, "whether you're X or Y", "your journey", streamline, leverage. DE: nahtlos, mühelos, revolutionieren, "egal ob Sie", ganzheitlich, massgeschneidert. FR: sans effort, révolutionner, "que vous soyez", sur mesure. IT: senza sforzo, rivoluzionare, "che tu sia", su misura | text + src word list | use the `avoid-ai-writing` skill for the rewrite | concrete nouns and verbs |
| 37 | default shadcn / Tailwind tokens | `bg-background text-foreground text-muted-foreground`, `--radius:0.5rem`, `--background:0 0% 100%` unchanged | html, css | | retheme the tokens or replace the components |
| 38 | default gray palette | zinc/slate/gray/neutral everywhere | html | small counts in forms are fine | neutrals tinted toward the brand hue |
| 39 | dead links | `href="#"`, social icons to nowhere, footer columns of placeholders | html | | remove or wire up |
| 40 | placeholder copy | lorem ipsum, "coming soon", "under construction", Acme | text | one honest "in development" note is not this tell; six sections of "coming soon" are | ship less, say more |
| 41 | default or missing metadata | no `<title>`, "Create Next App", missing `og:image`, missing `lang`, default favicon | scanner page lines | a missing `og:image` breaks link previews in WhatsApp and LinkedIn; a missing `<title>` is an SEO bug | set title template, og image per page, favicon, lang |
| 42 | text-center everywhere | every section centered, `max-w-7xl mx-auto px-4` rhythm | html `text-center` count | | left-aligned editorial grid |
| 43 | transition-all / hover:scale-105 | the two most copied Tailwind hover lines | html | | see 28 |
| 44 | cookie consent | missing banner in CH/EU with non-essential cookies | html `cookie` (SSR only) | HTML cannot determine legal compliance or cookie use. Client-rendered banners are invisible to the scanner | inspect actual storage, tracking and applicable requirements |
| 45 | rule of three rhythm | every section = heading + paragraph + exactly three items, repeated | manual: count sections and items | | vary counts: one, two, five, a list |
| 46 | dead design layer shipped | old templates, CSS bundles, icon deps still ship but are hidden by redirects | scanner "css applied vs shipped" line; route map | the estimate is not browser coverage; shared bundles, responsive states and dynamic classes can explain unused-looking rules | delete the legacy routes, CSS and deps |
| 47 | FAQ accordion | five generic questions nobody asked | text, html `<details>` | | answer real questions in the copy |
| 48 | "tasteful default" | cream/paper background + serif display font + sage or olive accent: the 2026 replacement for purple-on-black, now the default of every "editorial" prompt (flagged by the Reddit study below) | css: all three present in applied CSS | one or two of the three is a choice; all three together is the new template. Ask what makes this site's look specific to this business | keep the palette only if you can name the reason; otherwise change one axis (type, accent, or texture) |
| 49 | template section order | Hero → Features → Pricing → Testimonials → FAQ → CTA, in that order, with those ids or class names | html ids/classes, longest canonical run ≥ 4 | a pricing page legitimately has pricing; the tell is the full marketing-template sequence on one page | order sections by the visitor's question, not by the template |

## Severity

The `sev` column in the scanner is a heuristic informed by the ranking in [JCarterJohnson/vibecoded-design-tells](https://github.com/JCarterJohnson/vibecoded-design-tells) (3.2M Reddit posts, 2020–2026): **high** = the tells people name first (default shadcn/Tailwind kit, AI purple, gradients and gradient text, Inter/Geist, emoji as icons, symmetric hero + three feature cards, rounded corners, dark + neon glow); **low** = the meme tells that the data does not support much (bento, glassmorphism, aurora/orbs). Severity orders the fix list; it does not change whether a row is a hit.

## Manual pass (what the scanner cannot see)

- **Real product demo (18):** open the homepage and ask "which pixel shows the product?" Stock photos, wordmarks and illustrations do not count.
- **Testimonials (12), logo cloud (34), stats (35):** for each, ask "can I click through to a person, a company or a source?"
- **Pricing (17):** count the cards and the columns on the pricing page. Three equal cards, middle highlighted, "Most popular" badge = the full tell.
- **Palette (4, 20, 29, 30):** take the applied `body` background, the primary button, the accent and the borders. If they are Tailwind defaults (`blue-600`, `gray-200`, `violet-500`) it is the tell even when the count is low.
- **Motion (25, 28, 43):** hover three cards and three links in a browser. One restrained lift is a choice; a lift on everything is the template.
- **Rhythm (6, 45):** scroll the homepage and count items per section. `3, 3, 3, 3` is the template.
- **Client-rendered UI (21, 44):** cookie banners, skeletons and modals are injected after hydration; curl shows the SSR shell only. Read the component code or use a headless browser (Playwright) for these.

## Known false positives

- `linear-gradient` used as a mask (`-webkit-mask:linear-gradient(#fff 0 0)`), as a 1px grid line, or as a low-alpha edge highlight. The scanner excludes the first two; read the snippet for the third.
- `grid-cols-3` / `repeat(3,` in footers, navigation menus and data tables.
- `font-mono` for code samples on a developer product, or for coordinates and meta labels in an editorial design.
- `cookie` count of 0: absence in HTML alone cannot establish whether consent is required or implemented.
- `Source Sans` or other faces that appear in applied CSS via class-less rules (`code`, `pre`) without being the body face.
- Source counts in general: they measure debt, not what a visitor sees. A repo with 76 gradient uses and a live DOM with 0 is clean today and one redirect away from not being clean (tell 46).
