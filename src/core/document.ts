// Document-level operations: loading source files, combining, and exporting.
// Page ops (reorder/delete/rotate) are plain array edits done in the store;
// here we only need load + export.

import { PDFDocument, PDFArray, PDFDict, PDFName, PDFString, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { PDFFont, PDFObject, PDFPage } from 'pdf-lib';
import type { EditorDoc, FontFamily, LinkEdit, ObjectDelete, PageRef, Rect, SourceDoc, TextEdit, TextStyle } from './types';
import { uid } from './ids';

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Apply link edits to a copied page: drop any existing Link annotation that
 * overlaps an edited run (we're redefining it), then add fresh Link annotations
 * for edits with a non-empty URL. Untouched links pass through unchanged.
 */
function applyLinks(page: PDFPage, doc: PDFDocument, links: LinkEdit[]): void {
  const ctx = doc.context;
  const existing = page.node.Annots();
  const kept: PDFObject[] = [];

  if (existing instanceof PDFArray) {
    for (let i = 0; i < existing.size(); i++) {
      const ref = existing.get(i);
      const dict = ctx.lookupMaybe(ref, PDFDict);
      const subtype = dict?.get(PDFName.of('Subtype'));
      const isLink = subtype instanceof PDFName && subtype.asString() === '/Link';
      if (isLink) {
        const rectArr = dict?.lookupMaybe(PDFName.of('Rect'), PDFArray);
        if (rectArr) {
          const n = rectArr.asArray().map((v: any) => Number(v?.asNumber?.() ?? v));
          const r: Rect = {
            x: Math.min(n[0], n[2]),
            y: Math.min(n[1], n[3]),
            width: Math.abs(n[2] - n[0]),
            height: Math.abs(n[3] - n[1]),
          };
          if (links.some((l) => rectsOverlap(r, l.rect))) continue; // drop & replace
        }
      }
      kept.push(ref);
    }
  }

  for (const l of links) {
    if (!l.url) continue; // empty url = removed
    const annot = ctx.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [l.rect.x, l.rect.y, l.rect.x + l.rect.width, l.rect.y + l.rect.height],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(l.url) },
    });
    kept.push(ctx.register(annot));
  }

  page.node.set(PDFName.of('Annots'), ctx.obj(kept));
}

/** Infer serif/sans/mono from a detected PostScript font name. */
function inferFamily(psName: string): Exclude<FontFamily, 'auto'> {
  const n = psName.toLowerCase();
  if (/times|serif|roman|georgia|minion|garamond|book antiqua/.test(n)) return 'serif';
  if (/courier|mono|consol|menlo/.test(n)) return 'mono';
  return 'sans';
}

/**
 * Resolve a chosen style + detected font into one of the 14 standard fonts.
 * v1 font matching — keeps family and weight/style. (Later: embed metric-
 * compatible TTFs, then arbitrary fonts, for exact matches.)
 */
function pickStandardFont(style: TextStyle, detectedName: string): StandardFonts {
  const family = style.family === 'auto' ? inferFamily(detectedName) : style.family;
  const { bold, italic } = style;

  if (family === 'serif') {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (family === 'mono') {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/** Read a File into a SourceDoc + its initial PageRefs (in original order). */
export async function loadSource(file: File): Promise<{ source: SourceDoc; pages: PageRef[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  // pdf-lib parse gives us a reliable page count and validates the file.
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = doc.getPageCount();
  const sourceId = uid();

  const source: SourceDoc = { id: sourceId, name: file.name, bytes, pageCount };
  const pages: PageRef[] = Array.from({ length: pageCount }, (_, i) => ({
    id: uid(),
    sourceId,
    pageIndex: i,
    rotation: 0,
  }));
  return { source, pages };
}

/**
 * Build the final PDF from the working document: walk the ordered page list,
 * copy each referenced page from its source, apply added rotation. Runs fully
 * client-side. Returns bytes ready to download.
 */
export async function exportPdf(doc: EditorDoc): Promise<Uint8Array> {
  const out = await PDFDocument.create();

  // Load each source once, lazily.
  const srcCache = new Map<string, PDFDocument>();
  const loadSrc = async (s: SourceDoc) => {
    let d = srcCache.get(s.id);
    if (!d) {
      d = await PDFDocument.load(s.bytes, { updateMetadata: false });
      srcCache.set(s.id, d);
    }
    return d;
  };

  const byPage = groupEdits(doc);
  const embedFont = makeFontEmbedder(out);

  for (const ref of doc.pages) {
    const src = doc.sources[ref.sourceId];
    if (!src) continue;
    const srcDoc = await loadSrc(src);
    const [copied] = await out.copyPages(srcDoc, [ref.pageIndex]);

    await applyPageEdits(out, copied, byPage(ref.id), embedFont);

    if (ref.rotation) {
      const current = copied.getRotation().angle;
      copied.setRotation(degrees((current + ref.rotation) % 360));
    }
    out.addPage(copied);
  }

  return out.save();
}

export interface PageEditSet {
  texts: TextEdit[];
  links: LinkEdit[];
  deletes: ObjectDelete[];
}

export type FontEmbedder = (sf: StandardFonts) => Promise<PDFFont>;

/** A standard-font embedder with a per-document cache. */
export function makeFontEmbedder(out: PDFDocument): FontEmbedder {
  const cache = new Map<StandardFonts, PDFFont>();
  return async (sf) => {
    let f = cache.get(sf);
    if (!f) {
      f = await out.embedFont(sf);
      cache.set(sf, f);
    }
    return f;
  };
}

/** Build a `pageId -> PageEditSet` accessor from the whole document's edits. */
export function groupEdits(doc: EditorDoc): (pageId: string) => PageEditSet {
  const texts = new Map<string, TextEdit[]>();
  const links = new Map<string, LinkEdit[]>();
  const deletes = new Map<string, ObjectDelete[]>();
  const push = <T>(m: Map<string, T[]>, k: string, v: T) => m.set(k, [...(m.get(k) ?? []), v]);
  for (const e of Object.values(doc.edits)) push(texts, e.pageId, e);
  for (const l of Object.values(doc.linkEdits)) push(links, l.pageId, l);
  for (const d of Object.values(doc.objectDeletes)) push(deletes, d.pageId, d);
  return (pageId) => ({ texts: texts.get(pageId) ?? [], links: links.get(pageId) ?? [], deletes: deletes.get(pageId) ?? [] });
}

/**
 * Apply one page's edits onto an already-copied page: redact deleted objects,
 * cover+redraw text edits, then rewrite link annotations. Shared by full export
 * and single-page bake (live preview).
 */
export async function applyPageEdits(
  out: PDFDocument,
  copied: PDFPage,
  set: PageEditSet,
  embedFont: FontEmbedder,
): Promise<void> {
  // 1. Redact deleted objects (cover their box).
  for (const del of set.deletes) {
    copied.drawRectangle({
      x: del.rect.x,
      y: del.rect.y,
      width: del.rect.width,
      height: del.rect.height,
      color: del.bgColor ? rgb(...del.bgColor) : rgb(1, 1, 1),
    });
  }

  // 2. Text edits: cover the original, redraw the new string.
  for (const edit of set.texts) {
    const font = await embedFont(pickStandardFont(edit.style, edit.fontName));
    const size = edit.style.fontSize;
    const pad = edit.fontSize * 0.18;
    const bg = edit.bgColor ? rgb(...edit.bgColor) : rgb(1, 1, 1);
    const fg = edit.textColor ? rgb(...edit.textColor) : rgb(0, 0, 0);
    copied.drawRectangle({
      x: edit.x - pad,
      y: edit.y - edit.fontSize * 0.25,
      width: edit.width + pad * 2,
      height: edit.fontSize * 1.25,
      color: bg,
    });
    if (edit.newText) {
      copied.drawText(edit.newText, { x: edit.x, y: edit.y, size, font, color: fg });
      if (edit.style.underline) {
        const w = font.widthOfTextAtSize(edit.newText, size);
        const uy = edit.y - size * 0.12;
        copied.drawLine({
          start: { x: edit.x, y: uy },
          end: { x: edit.x + w, y: uy },
          thickness: Math.max(0.5, size * 0.06),
          color: fg,
        });
      }
    }
  }

  // 3. Links.
  if (set.links.length) applyLinks(copied, out, set.links);
}

/** Trigger a browser download for exported bytes. */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
