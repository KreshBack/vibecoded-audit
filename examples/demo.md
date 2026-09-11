# Example audit

Generated from the bundled fictional fixtures. This is an excerpt of a 49-row checklist, not a design score or proof of AI authorship.

```bash
npm run demo
```

The deliberately generic fixture produces **29 core matches** and **44 total matches to review**. Its scan status is **limited**.

- Coverage note: Remote or embedded stylesheet omitted in offline mode. (https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap)

## 1. harsh gradients

**HIT?**

```text
html 2 · css 1 · e.g. "…tion id="hero" class="text-center py-24 bg-gradient-to-r from-purp…" "…der-radius: 16px; } .neon{ color: #39ff14; } .hero-title{ background: linear-gradient(…"
```

**Next step:** Review the gradient in context; remove it only if it does not serve the design.

## 39. dead links (href="#")

**HIT?**

```text
html 7 · e.g. "…max-w-7xl mx-auto text-slate-600">   <a href="#" class="fo…"
```

**Next step:** Replace placeholder hrefs with working destinations or the appropriate button action.

## 41. default or missing metadata

**HIT?**

```text
fixtures/vibecoded.html: default title, og:image, lang, favicon, description
```

**Next step:** Write a specific title and description; set the language, favicon and social preview.

## 45. rule of three rhythm

**manual review**

```text
Count section items in a browser; HTML counts alone cannot establish the layout.
```

**Next step:** Inspect the rendered layout. A regular expression cannot judge section rhythm.

The separate clean fixture produces **0 core matches**. These are different fictional pages, not a measured before/after redesign. A zero count does not certify design quality, accessibility or legal compliance.

## Try the full reports

```bash
node scan.mjs --html fixtures/vibecoded.html
node scan.mjs --html fixtures/clean.html
node scan.mjs --url https://your-site.example/ --text 800
```

See [the README](../README.md) for installation, limitations and CI usage.
