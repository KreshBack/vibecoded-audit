# vibecoded-audit

Does your site look vibecoded? Inspect fetched HTML, page text and relevant CSS for **49 design tells**, with evidence you can review and a separate column for source-code matches.

**Zero runtime dependencies. One Node.js scanner. CLI, CI and an agent skill.**

```bash
git clone https://github.com/KreshBack/vibecoded-audit.git
cd vibecoded-audit
node scan.mjs --html fixtures/vibecoded.html
```

Or install the skill into your coding agent:

```bash
npx skills add KreshBack/vibecoded-audit
```

Requires Node.js 18 or newer; CI tests Node.js 22 and 24. This release is distributed through GitHub, not the npm registry.

## What makes it useful

- **Inspect the shipped page.** Follow redirects and compare fetched HTML with optional source files, so unused components do not become live findings.
- **Reduce CSS noise.** Keep rules whose selector classes appear in the fetched HTML. This is an estimate, not browser-computed styling or a coverage measurement.
- **Show the evidence.** Read per-tell counts, snippets, metadata and affected URLs instead of relying on an unexplained score.
- **Use the same checklist with an agent.** The skill adds layout, product-demo and testimonial checks that regular expressions cannot settle.

A `HIT?` is a review prompt. A gradient, font choice or common name does not prove that a site was AI-generated or that a testimonial is fake.

## Run an audit

From the cloned repository:

```bash
# Fetch a page and follow up to 8 same-origin links from its first page.
node scan.mjs --url https://your-site.example/ --crawl 8 --text 800

# Inspect a local HTML file or build directory without making network requests.
node scan.mjs --html ./dist

# Add source and translation files; their matches stay in a separate column.
node scan.mjs --url https://your-site.example/ --src ./src --messages ./messages

# Machine-readable evidence.
node scan.mjs --html fixtures/vibecoded.html --json

# Fail on a core checklist match and save the Markdown report.
node scan.mjs --html ./dist --fail-on hard --out report.md
```

Paths are relative to your working directory. Use `node /path/to/skill/scan.mjs` with the actual installation path when auditing another project; quote paths containing spaces.

| Flag | Purpose |
|---|---|
| `--url <url>` | Fetch a page; repeat for multiple entry points |
| `--html <file-or-directory>` | Inspect local HTML and linked local CSS |
| `--crawl N` | Follow up to N additional same-origin links from the first fetched page |
| `--text N` | Include up to N characters of page text |
| `--src <path>`, `--messages <path>` | Include source or translation files |
| `--json` | Print structured evidence |
| `--out <file>` | Save the report |
| `--fail-on none\|hard\|any` | Choose whether findings fail the command; default `none` |
| `--max-css N` | Limit fetched linked stylesheets; default 12 |

Exit codes: **0** completed without a configured failure, **1** matching findings, **2** invalid input or a failed page scan. The default does not fail on design findings. Requests time out after 15 seconds each.

## Read the results

The report contains rows **1–49**, plus related texture row **23b**. Some rows are mechanical proxies; others explicitly require manual review.

| Example row | Meaning |
|---|---|
| 1: harsh gradients, `HIT?` | Review the matched classes or CSS snippet |
| 18: stock image hosts, `pass` | No stock-host match; a real product demo still needs visual verification |
| 21: skeleton loaders, `HIT (missing)` | No marker in the fetched HTML; check dynamic loading states |
| 41: default or missing metadata | Review the listed missing fields or default title |
| 45: rule of three rhythm, `manual review` | Inspect the layout in a browser |
| 46: dead design layer, `manual review` | Confirm with actual browser coverage before deleting CSS |
| 47: generic FAQ accordion | A match is evidence of the pattern, not a verdict on the content |

`hard` means the original checklist rows 1–30, not severity or certainty. `any` also includes mechanically flagged extended rows. Manual-review rows do not automatically fail CI. Use a report-only audit first if your site intentionally uses these patterns.

## The checklist

**Original 30:** gradients, Lucide icons, pure white backgrounds, rainbow palettes, drop shadows, three feature cards, emojis, glass effects, em dashes, common starter fonts, colored left stripes, testimonials, bento grids, terminal windows, contrast-template copy, checkmark bullets, pricing tiers, product demos, rounded corners, purple accents, skeleton loaders, glow blobs, dot grids, sparkles, animated arrows, terms links, privacy links, hover animations, neon and pastel colors.

**Extended 31–49:** generic CTAs, gradient text, icon tiles, logo clouds, statistics, AI-style vocabulary in EN/DE/FR/IT, default UI tokens, gray palettes, dead links, placeholders, metadata, centered text, broad transitions, cookie-consent markers, repetitive section rhythm, unused-looking CSS, FAQs, cream/serif/sage styling and template section order.

[Read the detection methods, judgment notes and known false positives](patterns.md).

## Use it as an agent skill

The repository root contains [SKILL.md](SKILL.md), the scanner and its reference checklist. The agent follows a fixed report contract and adds the manual checks.

```bash
# Discover the skill without installing it.
npx skills add KreshBack/vibecoded-audit --list

# Install using the interactive agent selector.
npx skills add KreshBack/vibecoded-audit

# Claude Code: manual installation alternative.
git clone https://github.com/KreshBack/vibecoded-audit.git ~/.claude/skills/vibecoded-audit
```

For other agents, use their supported skill directory or the installer above. Ask your agent: **"Use vibecoded-audit to review this website: https://your-site.example/"**

## CI example

Audit a successful preview deployment with the published GitHub release:

```yaml
name: design audit
on: [deployment_status]
permissions:
  contents: read
jobs:
  audit:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: KreshBack/vibecoded-audit
          ref: v0.1.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Audit preview
        env:
          PREVIEW_URL: ${{ github.event.deployment_status.target_url }}
        run: node scan.mjs --url "$PREVIEW_URL" --crawl 6 --fail-on hard --out report.md
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vibecoded-report
          path: report.md
          if-no-files-found: ignore
```

## Limits and data handling

- The scanner fetches HTML; it does not execute JavaScript. Dynamic UI, hidden elements and post-hydration content need browser verification.
- CSS matching uses class names, not element relationships, media-query evaluation or the cascade. Shared bundles and dynamic classes can look unused. Do not delete CSS based on the estimate alone.
- Source scanning uses regular expressions, not an AST. No legal, accessibility or security compliance verdict is produced. Missing cookie or policy markers are review prompts.
- There is no analytics service, telemetry upload or API key. URL mode requests the supplied pages, discovered same-origin pages and linked stylesheets, which may use third-party hosts. Local HTML/source mode reads files locally.
- Reports can contain your URLs, text, code snippets and local paths. Review reports before sharing them or publishing CI artifacts. Run against sites and local files you are authorized to inspect.

## Development

```bash
npm test
npm pack --dry-run
```

The fixtures are fictional test pages. Tests cover expected matches, a clean baseline, the CSS filter, complete checklist numbering, metadata, manual-review rows and invalid-input exit codes.

## Related work and credits

Similar projects exist. This tool focuses on fetched-page evidence, CSS filtering and the same checklist across CLI, CI and agent review.

- [vibecoded-design-tells](https://github.com/JCarterJohnson/vibecoded-design-tells): Reddit-derived research and companion audit skills. Its published findings inform the severity hints here; this repository does not independently reproduce that study.
- [anti-vibecoded-ui](https://github.com/yasircs4/anti-vibecoded-ui): a complementary skill for product-specific design reviews.
- [Agent Skills](https://agentskills.io/specification): the interoperable skill format.

The original 30-item checklist was adapted from the "30 reasons your site looks vibecoded" list shared on TikTok in 2026. The original creator has not been identified; attribution corrections are welcome through an issue. The extended checklist and scanner are maintained here.

[MIT license](LICENSE). Copyright 2026 KreshBack.
