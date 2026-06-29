import { useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import { PageView } from './PageView';

export function CollectionView({ editor }: { editor: EditorApi }) {
  const { doc, movePage, moveDocument, deletePage, deleteDocument, rotatePage } = editor;
  
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

  return (
    <div className="collection-view">
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
              <div className="doc-drag-handle">☰</div>
              <span className="doc-index">{String(docIndex + 1).padStart(2, '0')}</span>
              <div className="doc-info">
                <span className="doc-name">{source.name}</span>
                <span className="doc-pages-badge">{sourcePages.length} pages</span>
              </div>
              <button
                className="doc-delete-btn"
                title="Remove document"
                onClick={() => deleteDocument(sourceId)}
              >
                ✕
              </button>
            </div>

            <div className="page-strip">
              {sourcePages.length === 0 ? (
                <div className="empty-strip-message">No pages remaining in this document.</div>
              ) : (
                <div className="page-strip-inner">
                  {sourcePages.map(({ p: page, idx: globalIndex }) => (
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
                        <PageView page={page} source={source} scale={0.24} index={globalIndex} />
                      </div>
                      <div className="thumb-tools">
                        <button title="Rotate left" onClick={() => rotatePage(page.id, -1)}>⟲</button>
                        <button title="Rotate right" onClick={() => rotatePage(page.id, 1)}>⟳</button>
                        <button title="Delete page" className="danger" onClick={() => deletePage(page.id)}>✕</button>
                      </div>
                      <div className="collection-page-number">{globalIndex + 1}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
