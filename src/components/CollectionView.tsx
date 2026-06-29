import { useEffect, useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import { PageView } from './PageView';
import { getPdfjsDoc } from '../core/render';
import { getPageSize, type Size } from '../core/sizes';
import { IconGrip, IconClose, IconRotateCcw, IconRotateCw, IconTrash, IconDownload, IconArchive } from './icons';

// .collection-thumb-wrapper has no extra padding of its own — the canvas IS
// the content height, so this just leaves headroom for varying page sizes
// while keeping every thumbnail in a row the same height (not the same
// fixed scale, which makes portrait and landscape pages wildly different
// sizes side by side).
const TARGET_THUMB_HEIGHT = 170;
const FALLBACK_SCALE = 0.24;

export function CollectionView({ editor }: { editor: EditorApi }) {
  const { doc, movePage, moveDocument, deletePage, deleteDocument, rotatePage, downloadSource, downloadAllZip, busy } = editor;
  const [sizes, setSizes] = useState<Record<string, Size>>({});

  // States for page dragging
  const [dragPageIndex, setDragPageIndex] = useState<number | null>(null);
  const [overPageIndex, setOverPageIndex] = useState<number | null>(null);

  // States for document row dragging
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [overSourceId, setOverSourceId] = useState<string | null>(null);

  // Get source IDs in the order they appear in doc.pages
  const sourceIdsInOrder: string[] = [];
  doc.pages.forEach((p) => {
    if (!sourceIdsInOrder.includes(p.sourceId)) {
      sourceIdsInOrder.push(p.sourceId);
    }
  });
  // Add any sources that have no pages currently
  Object.keys(doc.sources).forEach((id) => {
    if (!sourceIdsInOrder.includes(id)) {
      sourceIdsInOrder.push(id);
    }
  });

  // Native page size per page, so each strip thumbnail can be scaled to a
  // consistent HEIGHT (matching how a real film-strip/contact-sheet reads) —
  // a flat scale renders portrait and landscape pages at very different
  // heights side by side, which looks unintentional.
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

  return (
    <div className="collection-view">
      <div className="collection-toolbar">
        <span className="muted">{sourceIdsInOrder.filter((id) => doc.sources[id]).length} document(s)</span>
        <button className="ghost btn-compact" disabled={busy} onClick={() => downloadAllZip(sourceIdsInOrder)}>
          <span className="btn-icon"><IconArchive size={13} /></span><span className="btn-label">Download all (.zip)</span>
        </button>
      </div>
      {sourceIdsInOrder.map((sourceId, docIndex) => {
        const source = doc.sources[sourceId];
        if (!source) return null;

        // Get pages with their global index in doc.pages
        const sourcePages = doc.pages
          .map((p, idx) => ({ p, idx }))
          .filter((item) => item.p.sourceId === sourceId);

        return (
          <div
            key={sourceId}
            className={`doc-row ${overSourceId === sourceId ? 'doc-drop-target' : ''} ${
              dragSourceId === sourceId ? 'doc-dragging' : ''
            }`}
          >
            <div
              className="doc-header"
              draggable
              onDragStart={() => {
                setDragSourceId(sourceId);
              }}
              onDragOver={(e) => {
                if (dragSourceId && dragSourceId !== sourceId) {
                  e.preventDefault();
                  setOverSourceId(sourceId);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragSourceId && dragSourceId !== sourceId) {
                  moveDocument(dragSourceId, sourceId);
                }
                setDragSourceId(null);
                setOverSourceId(null);
              }}
              onDragEnd={() => {
                setDragSourceId(null);
                setOverSourceId(null);
              }}
            >
              <div className="doc-drag-handle"><IconGrip size={15} /></div>
              <span className="doc-index">{String(docIndex + 1).padStart(2, '0')}</span>
              <div className="doc-info">
                <span className="doc-name">{source.name}</span>
                <span className="doc-pages-badge">{sourcePages.length} pages</span>
              </div>
              <button
                className="doc-icon-btn"
                title="Download this document"
                disabled={busy || sourcePages.length === 0}
                onClick={(e) => { e.stopPropagation(); downloadSource(sourceId); }}
              >
                <IconDownload size={14} />
              </button>
              <button
                className="doc-icon-btn doc-delete-btn"
                title="Remove document"
                onClick={(e) => { e.stopPropagation(); deleteDocument(sourceId); }}
              >
                <IconClose size={13} />
              </button>
            </div>

            <div className="page-strip">
              {sourcePages.length === 0 ? (
                <div className="empty-strip-message">No pages remaining in this document.</div>
              ) : (
                <div className="page-strip-inner">
                  {sourcePages.map(({ p: page, idx: globalIndex }) => {
                    const size = sizes[page.id];
                    const scale = size ? TARGET_THUMB_HEIGHT / size.height : FALLBACK_SCALE;
                    return (
                    <div
                      key={page.id}
                      className={`collection-thumb ${
                        overPageIndex === globalIndex ? 'drop-target' : ''
                      } ${dragPageIndex === globalIndex ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation(); // Avoid triggering doc row drag
                        setDragPageIndex(globalIndex);
                      }}
                      onDragOver={(e) => {
                        if (dragPageIndex !== null) {
                          e.preventDefault();
                          e.stopPropagation();
                          setOverPageIndex(globalIndex);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragPageIndex !== null) {
                          movePage(dragPageIndex, globalIndex);
                        }
                        setDragPageIndex(null);
                        setOverPageIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragPageIndex(null);
                        setOverPageIndex(null);
                      }}
                    >
                      <div className="collection-thumb-wrapper">
                        <PageView page={page} source={source} scale={scale} index={globalIndex} />
                      </div>
                      <div className="thumb-tools">
                        <button title="Rotate left" onClick={() => rotatePage(page.id, -1)}><IconRotateCcw size={13} /></button>
                        <button title="Rotate right" onClick={() => rotatePage(page.id, 1)}><IconRotateCw size={13} /></button>
                        <button title="Delete page" className="danger" onClick={() => deletePage(page.id)}><IconTrash size={13} /></button>
                      </div>
                      <div className="collection-page-number">{globalIndex + 1}</div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
