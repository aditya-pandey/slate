// Organize mode: a grid of page thumbnails with drag-to-reorder, rotate, and
// delete. Uses native HTML5 drag-and-drop to stay dependency-free.

import { useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import { PageView } from './PageView';

export function PagesPanel({ editor }: { editor: EditorApi }) {
  const { doc, movePage, deletePage, rotatePage } = editor;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="pages-panel">
      {doc.pages.map((page, i) => {
        const source = doc.sources[page.sourceId];
        if (!source) return null;
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
            <PageView page={page} source={source} scale={0.28} index={i} />
            <div className="thumb-tools">
              <button title="Rotate left" onClick={() => rotatePage(page.id, -1)}>⟲</button>
              <button title="Rotate right" onClick={() => rotatePage(page.id, 1)}>⟳</button>
              <button title="Delete page" className="danger" onClick={() => deletePage(page.id)}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
