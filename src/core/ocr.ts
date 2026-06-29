// OCR run-source: for image-only pages (no text layer), recognize words with
// Tesseract.js and emit them as PdfRuns so the rest of the pipeline (select,
// search, edit, cover-and-redraw) works unchanged. Runs fully in-browser.
//
// We also sample the background + text color around each word so edits can
// blend into colored pages instead of assuming white/black.

import { createWorker, type Worker } from 'tesseract.js';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfRun } from './text';

const cache = new Map<string, PdfRun[]>();
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) workerPromise = createWorker('eng');
  return workerPromise;
}

export function hasOcr(sourceId: string, pageIndex: number): boolean {
  return cache.has(`${sourceId}:${pageIndex}`);
}

type RGB = [number, number, number];

function px(img: ImageData, x: number, y: number): RGB {
  const cx = Math.max(0, Math.min(img.width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(img.height - 1, Math.round(y)));
  const i = (cy * img.width + cx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/** Estimate background (ring outside the box) and text color (strokes inside). */
function sampleColors(img: ImageData, b: { x0: number; y0: number; x1: number; y1: number }): { bg: RGB; color: RGB } {
  const ring = Math.max(2, (b.y1 - b.y0) * 0.25);
  let br = 0, bgr = 0, bb = 0, bn = 0;
  const sx = Math.max(1, (b.x1 - b.x0) / 12);
  const sy = Math.max(1, (b.y1 - b.y0) / 6);
  for (let x = b.x0; x <= b.x1; x += sx) {
    for (const [, g, bl, r] of [pt(img, x, b.y0 - ring), pt(img, x, b.y1 + ring)]) {
      br += r; bgr += g; bb += bl; bn++;
    }
  }
  for (let y = b.y0; y <= b.y1; y += sy) {
    for (const [, g, bl, r] of [pt(img, b.x0 - ring, y), pt(img, b.x1 + ring, y)]) {
      br += r; bgr += g; bb += bl; bn++;
    }
  }
  const bg: RGB = bn ? [br / bn, bgr / bn, bb / bn] : [255, 255, 255];

  let tr = 0, tg = 0, tb = 0, tn = 0;
  const ix = Math.max(1, (b.x1 - b.x0) / 40);
  const iy = Math.max(1, (b.y1 - b.y0) / 20);
  for (let y = b.y0; y <= b.y1; y += iy) {
    for (let x = b.x0; x <= b.x1; x += ix) {
      const [r, g, bl] = px(img, x, y);
      if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(bl - bg[2]) > 120) {
        tr += r; tg += g; tb += bl; tn++;
      }
    }
  }
  const color: RGB = tn ? [tr / tn, tg / tn, tb / tn] : [0, 0, 0];
  return { bg: norm(bg), color: norm(color) };
}

// helper returning [_, g, b, r] so destructuring in the loop above stays terse
function pt(img: ImageData, x: number, y: number): [number, number, number, number] {
  const [r, g, b] = px(img, x, y);
  return [0, g, b, r];
}
const norm = (c: RGB): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function collectWords(data: any): OcrWord[] {
  if (data.words?.length) return data.words;
  const out: OcrWord[] = [];
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs ?? [])
      for (const line of para.lines ?? [])
        for (const w of line.words ?? []) out.push(w);
  return out;
}

/**
 * Recognize a page's text. Renders the page large for accuracy, runs Tesseract,
 * and converts each word box into a PdfRun in PDF user space (with colors).
 */
export async function ocrPage(
  doc: PDFDocumentProxy,
  sourceId: string,
  pageIndex: number,
): Promise<PdfRun[]> {
  const key = `${sourceId}:${pageIndex}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const page = await doc.getPage(pageIndex + 1);
  const rotation = (((page.rotate || 0) % 360 + 360) % 360);
  const base = page.getViewport({ scale: 1, rotation });
  const pageH = base.height;

  const scale = Math.min(3, 2000 / base.width); // ~2000px wide for good OCR
  const vp = page.getViewport({ scale, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;

  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const runs: PdfRun[] = [];
  for (const w of collectWords(data)) {
    if (!w.text?.trim()) continue;
    const b = w.bbox;
    const x = b.x0 / scale;
    const hPt = (b.y1 - b.y0) / scale;
    const widthPt = (b.x1 - b.x0) / scale;
    const fontSize = hPt;
    // pdf.js baseline origin: bottom-left of text in PDF units (y up).
    const yBaseline = pageH - b.y1 / scale + hPt * 0.2;
    const { bg, color } = sampleColors(img, b);
    runs.push({
      id: `ocr:${key}#${runs.length}`,
      str: w.text,
      transform: [fontSize, 0, 0, fontSize, x, yBaseline],
      width: widthPt,
      fontName: 'OCR',
      fontSize,
      ocrBg: bg,
      ocrColor: color,
    });
  }

  cache.set(key, runs);
  return runs;
}
