// Virtualized continuous scroller: lays out all pages by measured size but only
// mounts the canvases near the viewport, so a 300-page PDF stays smooth.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import type { ViewerApi } from '../state/useViewer';
import { PAD } from '../state/useViewer';
import { PageView } from './PageView';

interface Props {
  editor: EditorApi;
  view: ViewerApi;
  mode: 'read' | 'edit';
}

export function Viewer({ editor, view, mode }: Props) {
  const { doc } = editor;
  const { layout, containerRef, scale, dark, matchedRunIds, activeRunId, setCurrentPage, zoomBy } = view;
  const [range, setRange] = useState<[number, number]>([0, 4]);
  const raf = useRef(0);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const bottom = top + el.clientHeight;
    const over = el.clientHeight; // one screen of overscan each way
    let first = -1;
    let last = -1;
    let current = 0;
    for (let i = 0; i < layout.tops.length; i++) {
      const t = layout.tops[i];
      const b = t + layout.heights[i];
      if (b > top - over && t < bottom + over) {
        if (first === -1) first = i;
        last = i;
      }
      if (t <= top + el.clientHeight * 0.35) current = i;
    }
    if (first === -1) first = 0;
    if (last === -1) last = 0;
    setRange([first, last]);
    setCurrentPage(current);
  }, [layout, containerRef, setCurrentPage]);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      recompute();
    });
  }, [recompute]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  // Ctrl/Cmd + wheel zooms the PDF only. Must be a native, NON-passive listener:
  // React's onWheel is passive, so its preventDefault() is ignored and the
  // browser zooms the whole page instead. Anchor the zoom on the cursor.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      // Keep the point under the cursor fixed while scaling.
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left + el.scrollLeft;
      const cy = e.clientY - rect.top + el.scrollTop;
      zoomBy(factor);
      requestAnimationFrame(() => {
        el.scrollLeft = cx * factor - (e.clientX - rect.left);
        el.scrollTop = cy * factor - (e.clientY - rect.top);
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [containerRef, zoomBy]);

  const [first, last] = range;
  const visible = [];
  for (let i = first; i <= last && i < doc.pages.length; i++) visible.push(i);

  return (
    <div className="viewer" ref={containerRef} onScroll={onScroll}>
      <div className="viewer-canvas" style={{ height: layout.total }}>
        {visible.map((i) => {
          const page = doc.pages[i];
          const source = doc.sources[page.sourceId];
          if (!source) return null;
          return (
            <div
              key={page.id}
              className="vpage"
              style={{ top: layout.tops[i], width: layout.widths[i], height: layout.heights[i] }}
            >
              <PageView
                page={page}
                source={source}
                scale={scale}
                index={i}
                mode={mode}
                dark={dark}
                doc={doc}
                onEdit={editor.editRun}
                onLink={editor.editLink}
                onDeleteObject={editor.deleteObject}
                onRestoreObject={editor.restoreObject}
                matchedRunIds={matchedRunIds}
                activeRunId={activeRunId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PAD };
