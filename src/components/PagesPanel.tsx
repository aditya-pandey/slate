// Organize mode: a grid of page thumbnails with drag-to-reorder, rotate, and
// delete. Uses native HTML5 drag-and-drop to stay dependency-free.

import { useEffect, useRef, useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import { PageView } from './PageView';
import { getPdfjsDoc } from '../core/render';
import { getPageSize, type Size } from '../core/sizes';
import { IconRotateCcw, IconRotateCw, IconTrash } from './icons';

// .thumb's horizontal padding (10px each side, see styles.css) — subtracted
// from the measured column width to get the canvas's actual content width.
const THUMB_PADDING = 20;
const FALLBACK_SCALE = 0.28;

export function PagesPanel({ editor }: { editor: EditorApi }) {
  const { doc, movePage, deletePage, rotatePage } = editor;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [colWidth, setColWidth] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Native page size (in points) per page, so each thumbnail's scale can be
  // computed to actually fill its grid cell — a fixed scale renders portrait
  // pages and wide landscape slides at wildly different on-screen sizes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, Size> = {};
      for (const p of doc.pages) {
        const src = doc.sources[p.sourceId];
        if (!src) continue;
        const pdf = await getPdfjsDoc(src.id, src.bytes);
        if (cancelled) return;
        next[p.id] = await getPageSize(pdf, src.id, p.pageIndex, p.rotation);
      }
      if (!cancelled) setSizes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.pages, doc.sources]);

  // The grid's auto-fill columns are all the same width, so measuring one
  // thumb tells us every column's available width — re-measured live (like
  // --bar-clear) instead of guessed, so it tracks any screen size or layout.
  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLElement>('.thumb');
    if (!el) return;
    const update = () => setColWidth(el.clientWidth - THUMB_PADDING);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc.pages.length]);

  return (
    <div className="pages-panel" ref={gridRef}>
      {doc.pages.map((page, i) => {
        const source = doc.sources[page.sourceId];
        if (!source) return null;
        const size = sizes[page.id];
        const scale = size && colWidth ? colWidth / size.width : FALLBACK_SCALE;
        return (
          <div
            key={page.id}
            className={`thumb ${overIndex === i ? 'drop-target' : ''} ${dragIndex === i ? 'dragging' : ''}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) movePage(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
          >
            <PageView page={page} source={source} scale={scale} index={i} />
            <div className="thumb-tools">
              <button title="Rotate left" onClick={() => rotatePage(page.id, -1)}><IconRotateCcw size={14} /></button>
              <button title="Rotate right" onClick={() => rotatePage(page.id, 1)}><IconRotateCw size={14} /></button>
              <button title="Delete page" className="danger" onClick={() => deletePage(page.id)}><IconTrash size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
