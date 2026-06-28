// Text extraction + font detection for in-place editing.
//
// pdf.js reports every text run in PDF user space (origin bottom-left, y up),
// independent of how we render it. We extract that once per page (geometry +
// resolved font name), and separately project a run into CSS pixels for the
// clickable overlay. The PDF-space numbers are what pdf-lib needs at export.

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** One editable text run, in PDF user-space units (unscaled). */
export interface PdfRun {
  id: string;
  str: string;
  /** Text matrix [a,b,c,d,e,f]; e,f are the baseline origin in PDF units. */
  transform: number[];
  /** Advance width of the run, in PDF units. */
  width: number;
  /** Resolved PostScript font name, e.g. "Helvetica-Bold". */
  fontName: string;
  /** Derived font size in PDF units. */
  fontSize: number;
  /** URL if an existing Link annotation covers this run. */
  link?: string;
  /** For OCR runs: sampled background color (0-1 rgb) to cover with. */
  ocrBg?: [number, number, number];
  /** For OCR runs: sampled text color (0-1 rgb) to redraw with. */
  ocrColor?: [number, number, number];
}

/** Bounding box of a run in PDF user space (lower-left origin). */
export function runRect(run: PdfRun): { x: number; y: number; width: number; height: number } {
  const fs = run.fontSize;
  return { x: run.transform[4], y: run.transform[5] - fs * 0.25, width: run.width, height: fs * 1.2 };
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** A run projected into the CSS-pixel box of the rendered canvas. */
export interface CssBox {
  left: number;
  top: number;
  width: number;
  fontSize: number;
  /** Rotation of the run, radians (0 for normal horizontal text). */
  angle: number;
}

const runCache = new Map<string, PdfRun[]>();

function cacheKey(sourceId: string, pageIndex: number) {
  return `${sourceId}:${pageIndex}`;
}

/**
 * Extract editable text runs for a page (cached). Whitespace-only items are
 * dropped — there's nothing to click. Font names are resolved from pdf.js's
 * font registry (the raw item.fontName is an internal id like "g_d0_f1").
 */
export async function extractRuns(
  doc: PDFDocumentProxy,
  sourceId: string,
  pageIndex: number,
): Promise<PdfRun[]> {
  const key = cacheKey(sourceId, pageIndex);
  const cached = runCache.get(key);
  if (cached) return cached;

  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();

  // Link annotations: rectangles + URLs that sit over the text.
  const annotations = await page.getAnnotations();
  const links = (annotations as any[])
    .filter((a) => a.subtype === 'Link' && (a.url || a.unsafeUrl))
    .map((a) => {
      const [x1, y1, x2, y2] = a.rect as number[];
      return {
        url: (a.url || a.unsafeUrl) as string,
        rect: { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) },
      };
    });

  const runs: PdfRun[] = [];
  for (const item of content.items as any[]) {
    if (!('str' in item) || !item.str.trim()) continue;
    const t: number[] = item.transform;
    const fontSize = Math.hypot(t[0], t[1]);

    let fontName: string = item.fontName ?? 'unknown';
    try {
      if (page.commonObjs.has(item.fontName)) {
        const f = page.commonObjs.get(item.fontName);
        if (f?.name) fontName = f.name;
      }
    } catch {
      /* font not resolvable — fall back to the internal id */
    }

    const run: PdfRun = {
      id: `${key}#${runs.length}`,
      str: item.str,
      transform: t,
      width: item.width,
      fontName,
      fontSize,
    };
    if (links.length) {
      const box = runRect(run);
      const hit = links.find((l) => overlaps(box, l.rect));
      if (hit) run.link = hit.url;
    }
    runs.push(run);
  }

  runCache.set(key, runs);
  return runs;
}

/** Project a PDF-space run into the CSS-pixel coordinates of a viewport. */
export function projectRun(run: PdfRun, viewport: { transform: number[] }): CssBox {
  const tx = pdfjs.Util.transform(viewport.transform, run.transform);
  const fontSize = Math.hypot(tx[2], tx[3]);
  const angle = Math.atan2(tx[1], tx[0]);
  // viewport scale relative to PDF units = how much the run width grows.
  const scale = Math.hypot(viewport.transform[0], viewport.transform[1]);
  return {
    left: tx[4],
    top: tx[5] - fontSize, // tx[5] is the baseline; box top is one em up
    width: run.width * scale,
    fontSize,
    angle,
  };
}
