// Renders a single page to a canvas via pdf.js. Three modes:
//  - 'plain' : canvas only (thumbnails)
//  - 'read'  : canvas + selectable/searchable text layer
//  - 'edit'  : canvas + interactive editing text layer + object layer
//
// When the page has edits, it renders the *baked* result (same engine as
// export) so the preview is pixel-accurate. Image-only pages offer OCR.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorDoc, LinkEdit, ObjectDelete, PageRef, SourceDoc, TextEdit } from '../core/types';
import { getPdfjsDoc, renderPage, renderBytes } from '../core/render';
import { extractRuns, projectRun, type PdfRun } from '../core/text';
import { extractImages, projectRect, type PageObject } from '../core/objects';
import { bakePage } from '../core/bake';
import { hasOcr, ocrPage } from '../core/ocr';
import { TextLayer, type RunItem } from './TextLayer';
import { ReadTextLayer } from './ReadTextLayer';
import { ObjectLayer, type ObjItem } from './ObjectLayer';

type Mode = 'plain' | 'read' | 'edit';

interface Props {
  page: PageRef;
  source: SourceDoc;
  scale: number;
  index: number;
  mode?: Mode;
  dark?: boolean;
  doc?: EditorDoc;
  onEdit?: (edit: TextEdit, originalText: string) => void;
  onLink?: (edit: LinkEdit, originalUrl: string) => void;
  onDeleteObject?: (obj: ObjectDelete) => void;
  onRestoreObject?: (id: string) => void;
  matchedRunIds?: Set<string>;
  activeRunId?: string | null;
}

export function PageView({
  page, source, scale, index, mode = 'plain', dark, doc,
  onEdit, onLink, onDeleteObject, onRestoreObject, matchedRunIds, activeRunId,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfRuns, setPdfRuns] = useState<PdfRun[]>([]);
  const [ocrRuns, setOcrRuns] = useState<PdfRun[] | null>(null);
  const [objects, setObjects] = useState<PageObject[]>([]);
  const [vpTransform, setVpTransform] = useState<number[] | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const withText = mode === 'read' || mode === 'edit';

  const edits = doc?.edits ?? {};
  const linkEdits = doc?.linkEdits ?? {};
  const objectDeletes = doc?.objectDeletes ?? {};

  // This page's edits — also a re-render signal when they change.
  const editSig = useMemo(() => {
    const f = <T extends { pageId: string }>(m: Record<string, T>) => Object.values(m).filter((e) => e.pageId === page.id);
    return JSON.stringify([f(edits), f(linkEdits), f(objectDeletes)]);
  }, [edits, linkEdits, objectDeletes, page.id]);
  const hasEdits = editSig !== '[[],[],[]]';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdf = await getPdfjsDoc(source.id, source.bytes);
      if (cancelled || !canvasRef.current) return;

      if (doc && hasEdits) {
        const bytes = await bakePage(doc, page);
        if (cancelled || !canvasRef.current) return;
        if (bytes) await renderBytes(bytes, canvasRef.current, scale, page.rotation);
        else await renderPage(pdf, page.pageIndex, canvasRef.current, scale, page.rotation);
      } else {
        await renderPage(pdf, page.pageIndex, canvasRef.current, scale, page.rotation);
      }

      if (!withText) {
        setPdfRuns([]); setOcrRuns(null); setObjects([]); setVpTransform(null);
        return;
      }
      const pdfPage = await pdf.getPage(page.pageIndex + 1);
      const rotation = (((pdfPage.rotate || 0) + page.rotation) % 360 + 360) % 360;
      const viewport = pdfPage.getViewport({ scale, rotation });
      const runs = await extractRuns(pdf, source.id, page.pageIndex);
      if (cancelled) return;
      setVpTransform(viewport.transform);
      setPdfRuns(runs);
      if (runs.length === 0 && hasOcr(source.id, page.pageIndex)) setOcrRuns(await ocrPage(pdf, source.id, page.pageIndex));
      else setOcrRuns(null);
      setObjects(mode === 'edit' ? await extractImages(pdf, source.id, page.pageIndex) : []);
    })();
    return () => { cancelled = true; };
  }, [source.id, source.bytes, page.pageIndex, page.rotation, scale, withText, mode, editSig]);

  const recognize = useCallback(async () => {
    setOcrBusy(true);
    try {
      const pdf = await getPdfjsDoc(source.id, source.bytes);
      setOcrRuns(await ocrPage(pdf, source.id, page.pageIndex));
    } finally {
      setOcrBusy(false);
    }
  }, [source.id, source.bytes, page.pageIndex]);

  const activeRuns = pdfRuns.length ? pdfRuns : ocrRuns ?? [];
  const items: RunItem[] = useMemo(
    () => (vpTransform ? activeRuns.map((run) => ({ run, box: projectRun(run, { transform: vpTransform }) })) : []),
    [activeRuns, vpTransform],
  );
  const objItems: ObjItem[] = useMemo(
    () => (vpTransform ? objects.map((obj) => ({ obj, box: projectRect(obj.rect, vpTransform) })) : []),
    [objects, vpTransform],
  );
  const deletedIds = useMemo(() => new Set(Object.values(objectDeletes).map((d) => d.id)), [objectDeletes]);

  // Sample the background color just outside a CSS box (for redact blending).
  const sampleBg = useCallback((box: { left: number; top: number; width: number; height: number }): [number, number, number] => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return [1, 1, 1];
    const dpr = cv.width / (cv.clientWidth || 1);
    const ring = 5;
    const pts: [number, number][] = [];
    for (const x of [box.left, box.left + box.width / 2, box.left + box.width]) {
      pts.push([x, box.top - ring], [x, box.top + box.height + ring]);
    }
    for (const y of [box.top, box.top + box.height / 2, box.top + box.height]) {
      pts.push([box.left - ring, y], [box.left + box.width + ring, y]);
    }
    let r = 0, g = 0, b = 0, n = 0;
    for (const [x, y] of pts) {
      const px = Math.round(x * dpr);
      const py = Math.round(y * dpr);
      if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
      const d = ctx.getImageData(px, py, 1, 1).data;
      r += d[0]; g += d[1]; b += d[2]; n++;
    }
    return n ? [r / n / 255, g / n / 255, b / n / 255] : [1, 1, 1];
  }, []);

  const needsOcr = withText && vpTransform != null && pdfRuns.length === 0 && !ocrRuns && !ocrBusy;

  return (
    <div className={`page-wrap ${dark ? 'night' : ''}`} data-page={index + 1}>
      <canvas ref={canvasRef} className="page-canvas" />
      {mode === 'edit' && onEdit && onLink && (
        <TextLayer items={items} pageId={page.id} edits={edits} linkEdits={linkEdits} onEdit={onEdit} onLink={onLink} />
      )}
      {mode === 'edit' && onDeleteObject && (
        <ObjectLayer
          items={objItems}
          deletedIds={deletedIds}
          onDelete={(item) => onDeleteObject({ id: item.obj.id, pageId: page.id, rect: item.obj.rect, bgColor: sampleBg(item.box) })}
          onRestore={(id) => onRestoreObject?.(id)}
        />
      )}
      {mode === 'read' && (
        <ReadTextLayer items={items} matchedRunIds={matchedRunIds ?? new Set()} activeRunId={activeRunId ?? null} />
      )}
      {mode === 'plain' && <span className="page-num">{index + 1}</span>}

      {needsOcr && <button className="ocr-cta" onClick={recognize}>🔍 Recognize text (OCR)</button>}
      {ocrBusy && <div className="ocr-busy">Recognizing text…</div>}
    </div>
  );
}
