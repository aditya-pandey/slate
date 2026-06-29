// PDF.js rendering layer. Loads source PDFs and rasterizes individual pages
// to a canvas. Kept separate from export logic (pdf-lib) on purpose.

import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Cache the loading task (not just the document) so we can fully tear it down
// — destroy() lives on the task and aborts the worker too.
const taskCache = new Map<string, PDFDocumentLoadingTask>();

/**
 * Get (and cache) a pdf.js document for some source bytes. We hand pdf.js a
 * copy of the bytes because it may detach/transfer the buffer to its worker,
 * and the original must stay intact for pdf-lib export.
 */
export function getPdfjsDoc(sourceId: string, bytes: Uint8Array): Promise<PDFDocumentProxy> {
  let task = taskCache.get(sourceId);
  if (!task) {
    task = pdfjs.getDocument({ data: bytes.slice() });
    taskCache.set(sourceId, task);
  }
  return task.promise;
}

export function forgetPdfjsDoc(sourceId: string): void {
  const task = taskCache.get(sourceId);
  taskCache.delete(sourceId);
  task?.destroy().catch(() => {});
}

export interface RenderResult {
  width: number;
  height: number;
}

// pdf.js refuses to run two render() passes on the same canvas concurrently —
// when a caller re-renders before the previous pass finished (e.g. a
// thumbnail's scale changing right after mount, once its real column width
// is measured), the first pass would otherwise still be painting partial/
// stale content into a canvas that's meanwhile been resized for the new
// pass, leaving most of it blank. Track the in-flight task per canvas and
// cancel it first so only the latest render ever actually paints.
const activeRenders = new WeakMap<HTMLCanvasElement, RenderTask>();

async function cancelPriorRender(canvas: HTMLCanvasElement): Promise<void> {
  const prior = activeRenders.get(canvas);
  if (!prior) return;
  try {
    prior.cancel();
    await prior.promise;
  } catch {
    // Expected: a cancelled render task rejects its promise.
  }
}

/** Render page 0 of a transient PDF (e.g. a baked single-page preview). */
export async function renderBytes(
  bytes: Uint8Array,
  canvas: HTMLCanvasElement,
  scale: number,
  extraRotation = 0,
): Promise<RenderResult> {
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  try {
    return await renderPage(doc, 0, canvas, scale, extraRotation);
  } finally {
    task.destroy().catch(() => {});
  }
}

/**
 * Render one page into a canvas at the given CSS scale, accounting for
 * device pixel ratio so it stays crisp. `extraRotation` is added to the
 * page's intrinsic rotation.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number,
  extraRotation = 0,
): Promise<RenderResult> {
  await cancelPriorRender(canvas);

  const page = await doc.getPage(pageIndex + 1); // pdf.js is 1-based
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rotation = (((page.rotate || 0) + extraRotation) % 360 + 360) % 360;
  const viewport = page.getViewport({ scale: scale * dpr, rotation });

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${viewport.width / dpr}px`;
  canvas.style.height = `${viewport.height / dpr}px`;

  const task = page.render({ canvas, canvasContext: ctx, viewport });
  activeRenders.set(canvas, task);
  try {
    await task.promise;
  } catch (err) {
    // A later renderPage() call on this same canvas cancelled us — benign;
    // that newer call is the one whose paint should actually land.
    if (!(err instanceof pdfjs.RenderingCancelledException)) throw err;
  } finally {
    if (activeRenders.get(canvas) === task) activeRenders.delete(canvas);
  }
  return { width: viewport.width / dpr, height: viewport.height / dpr };
}
