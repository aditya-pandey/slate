// Detect page objects (currently images) so the user can select & delete them.
// We walk pdf.js's operator list, tracking the current transform matrix; at each
// image-paint op the matrix maps the unit square to the image's box in PDF
// user space.

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Rect } from './types';

export interface PageObject {
  id: string;
  /** Box in PDF user space (lower-left origin). */
  rect: Rect;
}

const cache = new Map<string, PageObject[]>();

function apply(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export async function extractImages(
  doc: PDFDocumentProxy,
  sourceId: string,
  pageIndex: number,
): Promise<PageObject[]> {
  const key = `${sourceId}:${pageIndex}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const page = await doc.getPage(pageIndex + 1);
  const ops = await page.getOperatorList();
  const OPS = pdfjs.OPS;

  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const objects: PageObject[] = [];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as number[];
    if (fn === OPS.save) stack.push(m);
    else if (fn === OPS.restore) m = stack.pop() ?? m;
    else if (fn === OPS.transform) m = pdfjs.Util.transform(m, args);
    else if (
      fn === OPS.paintImageXObject ||
      fn === OPS.paintImageMaskXObject ||
      fn === OPS.paintImageXObjectRepeat ||
      fn === OPS.paintInlineImageXObject
    ) {
      const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 1, 1), apply(m, 0, 1)];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      const width = Math.max(...xs) - x;
      const height = Math.max(...ys) - y;
      if (width > 2 && height > 2) objects.push({ id: `img:${key}#${objects.length}`, rect: { x, y, width, height } });
    }
  }

  cache.set(key, objects);
  return objects;
}

/** Project a PDF-space rect into the CSS-pixel box of a viewport. */
export function projectRect(rect: Rect, viewportTransform: number[]): { left: number; top: number; width: number; height: number } {
  const a = apply(viewportTransform, rect.x, rect.y);
  const b = apply(viewportTransform, rect.x + rect.width, rect.y + rect.height);
  return { left: Math.min(a[0], b[0]), top: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]) };
}
