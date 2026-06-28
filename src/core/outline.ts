// Document outline (table of contents). pdf.js exposes a tree of items, each
// with a destination we resolve to a 0-based page index on demand.

import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface OutlineNode {
  title: string;
  dest: unknown;
  items: OutlineNode[];
}

export async function getOutline(doc: PDFDocumentProxy): Promise<OutlineNode[]> {
  const raw = await doc.getOutline();
  if (!raw) return [];
  const map = (n: any): OutlineNode => ({ title: n.title, dest: n.dest, items: (n.items ?? []).map(map) });
  return raw.map(map);
}

/** Resolve an outline destination to a 0-based page index, or null. */
export async function resolveDest(doc: PDFDocumentProxy, dest: unknown): Promise<number | null> {
  try {
    let explicit = dest;
    if (typeof dest === 'string') explicit = await doc.getDestination(dest);
    if (!Array.isArray(explicit)) return null;
    const ref = explicit[0];
    if (ref == null) return null;
    const index = await doc.getPageIndex(ref as any);
    return typeof index === 'number' ? index : null;
  } catch {
    return null;
  }
}
