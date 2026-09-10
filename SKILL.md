---
name: vibecoded-audit
description: Use when asked whether a website, landing page or app UI "looks vibecoded", AI-generated, templated, "like every SaaS site", or when auditing a site against the "30 reasons your site looks vibecoded" list, or as a pre-launch / post-redesign design check. Works on a live URL, a source tree (Next, React, Tailwind, Astro, Vue, plain HTML), or both.
license: MIT
metadata:
  version: "0.1.0"
  author: KreshBack
  repository: https://github.com/KreshBack/vibecoded-audit
---

# Vibecoded Audit

## Overview

A fixed checklist of 30 tells (plus 19 extended) scored against **what a visitor receives**. The scanner inspects fetched HTML and estimates relevant CSS from class names; it does not execute JavaScript or compute browser styles. Confirm findings in context before assigning a verdict. Repo-only hits are debt, not failures. `scan.mjs` counts; `patterns.md` judges.

The list is fixed on purpose: an audit that picks its own tells picks the ones that pass.

## When to use

- "Does this look vibecoded / AI-made / templated / like every SaaS site?"
- "Check it against the 30-point list"
- Before a launch or after a redesign. Not for backend work, not a UX flow review.

## Procedure

1. **Scan once**, every known public entry URL, crawl and page text on. Resolve `<skill-directory>` to this skill's actual installation directory and quote the resulting path when it contains spaces:
   ```bash
   node <skill-directory>/scan.mjs --url https://site.tld/ --url https://site.tld/pricing --crawl 8 --text 800 --src ./src --messages ./messages
   ```
   `--src` / `--messages` only when a source tree exists. `--json` for machine output, `--html ./dist` for a built site without a server, `--fail-on hard` for CI. Node 18+, no dependencies. Do not re-grep the source by hand afterwards; the scanner already did.
2. **Read the header first:** redirect map (what is hidden), applied-vs-shipped CSS share, pages without `<title>` / `og:image` / `lang` / favicon, applied fonts and radii, body background, then the page texts.
3. **Fill the report contract.** Rows 1 to 30 always, 31 to 49 where there is evidence. Values: `pass`, `hit`, `partial`, `n/a` (with the reason: "redirects to /paused", "no pricing page").
4. **Manual pass** (`patterns.md`, section "Manual pass") for 6, 12, 17, 18, 45 and the palette and motion calls. Client-rendered UI (cookie banner, modals) is invisible to curl: read the component or use a browser.
5. **Fix list:** one row per `hit` and `partial`, file and line, effort, sorted by how visible it is to a visitor.

## Report contract

```
Verdict: <N hard + M soft of 30> (live). Extended tells with evidence: <ids>. Source debt: <K tells present only in unreachable code>.
Routes: <redirect map from the header>
Header findings: <title / og:image / lang / favicon / CSS share, only the ones that fail>

| # | Tell | Live | Evidence |
| 1..30, every row | | pass / hit / partial / n/a | counts + one snippet or file:line |
| 31..49 | | | only rows with evidence |

Structural finding: <one paragraph when a dead layer, a redirect map or a shared template explains many rows>

| Prio | Tell | Change | Where | Effort |
| one row per hit/partial | | | file:line | minutes / hours |
```

## Verdict rules

- A tell that reaches the DOM is a `hit` regardless of intent. If a design spec documents it, write `hit, intentional per DESIGN.md §7` and keep the row.
- Redirected or paused routes go into source debt and the structural finding, never into `pass`.
- Inverse tells (21 skeletons, 26 terms, 27 privacy, 41 metadata, 44 cookie) fire on **absence**. They must be checked; "not checked" is not a value.
- Custom CSS trips tells too: `border-left:4px solid` in a hand-written stylesheet is tell 11 exactly as `border-l-4` is.
- A scanner `HIT?` becomes a `hit` only after reading the snippet. Masks, 1px grid lines and footer columns are the listed false positives.
- **Tell 6:** `repeat(3,` or `grid-cols-3` on a content section plus three sibling headings in that page's text = `hit`. Navigation menus and footers are not.
- **Tell 18:** scanner row 18 is a stock-host proxy only. `pass` needs a pixel on the page that shows the product. A photo collage, a wordmark, an illustration or a stock photo is a `hit`.
- **Tell 21:** only `loading.*` route files and skeletons that render on crawled routes count. Skeleton components in unreachable legacy code are debt, and the row is a `hit`.

## Common mistakes (seen in test runs)

| Mistake | Correction |
|---|---|
| Invents a 14-item list, mostly things that pass, verdicts "not vibecoded" | 30 rows, fixed order, no omissions |
| Samples three pages by hand, misses the redirect map | `--crawl`, read the route lines in the header |
| Repo hits counted as failures, or live hits waved off as "non-visitor-facing" | DOM / applied CSS = live, repo = debt; both reported, in separate places |
| "No `<title>`, probably streamed later" | The header names the pages; the fix is in that page's metadata export |
| Skips terms, privacy, og:image, skeletons because nothing was "found" | Inverse tells: absence is the finding |
| Passes 18 because no Unsplash URL was found | Proxy is not the tell; look for the product |
| Passes 21 citing skeleton files in paused routes | Crawled routes only |
| Leaves 6 as "content unverified" | The page text is in the output with `--text` |
| Fix rows without file paths | Every row names the file, and the line when known |

## Files

- `scan.mjs` — the scanner. `node scan.mjs --help` for flags.
- `patterns.md` — all 49 tells with why, detection, judgment, fix direction, manual pass, known false positives.

Related: `avoid-ai-writing` for copy that trips 9, 15, 36; `impeccable` for the redesign after the audit.
