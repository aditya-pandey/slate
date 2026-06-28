// Single-page "bake": produce a 1-page PDF with a page's edits applied, so the
// viewer can render the *real* result (pixel-identical to export) instead of a
// faked preview. Reuses the exact same apply logic as the full exporter.

import { PDFDocument } from 'pdf-lib';
import type { SourceDoc, PageRef, EditorDoc } from './types';
import { applyPageEdits, groupEdits, makeFontEmbedder } from './document';

/**
 * Bake one page's edits into standalone PDF bytes. Returns null when the page
 * has no edits (caller should just render the original).
 */
export async function bakePage(doc: EditorDoc, ref: PageRef): Promise<Uint8Array | null> {
  const set = groupEdits(doc)(ref.id);
  if (!set.texts.length && !set.links.length && !set.deletes.length) return null;

  const src: SourceDoc | undefined = doc.sources[ref.sourceId];
  if (!src) return null;

  const out = await PDFDocument.create();
  const srcDoc = await PDFDocument.load(src.bytes, { updateMetadata: false });
  const [copied] = await out.copyPages(srcDoc, [ref.pageIndex]);
  await applyPageEdits(out, copied, set, makeFontEmbedder(out));
  out.addPage(copied);
  return out.save();
}
