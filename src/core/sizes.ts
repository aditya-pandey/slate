// Page-size lookup (at scale 1, in PDF points) used to lay out the virtualized
// scroller before pages are actually rendered. Cached per source+page.

import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface Size {
  width: number;
  height: number;
}

const cache = new Map<string, Size>();

export async function getPageSize(
  doc: PDFDocumentProxy,
  sourceId: string,
  pageIndex: number,
  extraRotation = 0,
): Promise<Size> {
  const key = `${sourceId}:${pageIndex}:${extraRotation}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const page = await doc.getPage(pageIndex + 1);
  const rotation = (((page.rotate || 0) + extraRotation) % 360 + 360) % 360;
  const vp = page.getViewport({ scale: 1, rotation });
  const size: Size = { width: vp.width, height: vp.height };
  cache.set(key, size);
  return size;
}
