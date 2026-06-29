# The Slate

A fast, **open-source** PDF editor and viewer that runs entirely in your
browser. No accounts, no ads — your files are never uploaded anywhere.

## What it does

- **View** — smooth virtualized scrolling, zoom/fit, find-in-document, text
  selection, outline + thumbnail sidebar, night mode, print, keyboard nav
- **Edit existing text in place** — click a word, retype it; font matched,
  with size/bold/italic/underline formatting
- **Links** — view, edit, add, or remove hyperlinks on text
- **Delete** — remove text or any image object from a page
- **OCR** — recognize text on scanned/image-only pages, then edit it like any other text
- **Combine** multiple PDFs — drag them in, they merge in order
- **Organize pages** — reorder by drag, rotate, delete
- **Download** — everything assembled fully client-side

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
| OCR | [Tesseract.js](https://github.com/naptha/tesseract.js) |

All PDF logic lives in `src/core/` (framework-agnostic TypeScript) so the same
core can later back a desktop build (Tauri) with no rewrite.

```
src/
  core/        # pure TS — no React. Load, render, edit, OCR, export.
  state/       # React hooks over the core (single source of truth)
  components/  # thin UI: viewer, toolbars, sidebar, organize grid
  App.tsx      # one-canvas shell
```

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

## Desktop app (Mac & Windows)

The same code runs as a native desktop app via [Tauri](https://tauri.app) —
no rewrite, just a native window around the same `dist/` build.

```bash
npm run desktop:dev     # native window, hot-reloading
npm run desktop:build   # .app/.dmg (mac) or .exe/.msi (windows) for your OS
```

Cross-platform installers (Mac + Windows) are built automatically by
[`.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml)
whenever a tag like `v0.2.0` is pushed — it opens a draft GitHub Release with
both installers attached. These builds are unsigned (free), so first launch
needs one extra click past an OS warning: right-click → Open on Mac,
"More info → Run anyway" on Windows.

## Privacy

Your PDF files are processed entirely in your browser/app and are never
uploaded or sent to any server. There is no analytics or tracking of any kind.

## Roadmap

- [x] Viewer: virtualized scroll, zoom/fit, find, selection, outline, dark mode, print
- [x] Combine, organize (reorder / rotate / delete), export
- [x] In-place text editing with font matching & formatting
- [x] Link view/edit/add/remove
- [x] Delete text & image objects
- [x] OCR for scanned/image-only pages
- [x] Desktop build (Tauri) for Mac & Windows
- [ ] Embed real TTF/OTF fonts for exact font matching
- [ ] Paragraph reflow for length-changing edits

## License

[MIT](./LICENSE) — do anything, just keep the notice.
