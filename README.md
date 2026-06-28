# PDF Editor

A fast, private, **open-source** PDF editor that runs entirely in your browser.
No accounts, no ads, no uploads — your files never leave your device.

> Status: **early v1** — page tools and combine are working; in-place text
> editing is in progress (see the roadmap).

## What it does

- **Edit existing text in place** — click a word, retype it, font auto-matched _(in progress)_
- **Add** text, images, and signatures on top of a page _(planned)_
- **Combine** multiple PDFs — drag them in, they merge in order
- **Organize pages** — reorder by drag, rotate, delete
- **Download** — assembled fully client-side

## Why another PDF editor?

Existing tools either cost money, bury you in 30+ features, or upload your
documents to a server. This one does a small number of things well, keeps the
UI to a single screen, and runs 100% locally.

## Tech

| Layer | Choice |
|-------|--------|
| UI | React + TypeScript + Vite |
| Rendering | [pdf.js](https://github.com/mozilla/pdf.js) |
| Page ops / export | [pdf-lib](https://github.com/Hopding/pdf-lib) |
| Text/font editing | MuPDF / PDFium (wasm) — _engine being finalized_ |

All PDF logic lives in `src/core/` (framework-agnostic TypeScript) so the same
core can later back a desktop build (Tauri) with no rewrite.

```
src/
  core/        # pure TS + wasm — no React. Load, render, edit, export.
  state/       # React hook over the core (single source of truth)
  components/  # thin UI: dropzone, page view, organize grid
  App.tsx      # one-canvas shell
```

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

## Roadmap

- [x] Render, combine, organize (reorder / rotate / delete), export
- [ ] Overlay tools: add text / image / signature
- [ ] In-place text editing: select run → edit with embedded font
- [ ] Font matching & substitution (Font Replacement dialog)
- [ ] Paragraph reflow for length-changing edits
- [ ] Desktop build (Tauri)

## License

[MIT](./LICENSE) — do anything, just keep the notice.
