// Collapsible left panel with two tabs: page thumbnails and the document
// outline (table of contents). Both jump the scroller to a page.

import { useEffect, useState } from 'react';
import type { EditorApi } from '../state/useEditor';
import type { ViewerApi } from '../state/useViewer';
import { getPdfjsDoc } from '../core/render';
import { getOutline, resolveDest, type OutlineNode } from '../core/outline';
import { PageView } from './PageView';

export function Sidebar({ editor, view }: { editor: EditorApi; view: ViewerApi }) {
  const { doc } = editor;
  const { sidebarTab, setSidebarTab, scrollToPage, currentPage, sizes } = view;
  const [outline, setOutline] = useState<OutlineNode[]>([]);

  // Load outline from the first source (combined docs share one panel for now).
  useEffect(() => {
    const first = doc.pages[0] && doc.sources[doc.pages[0].sourceId];
    if (!first) return;
    let cancelled = false;
    (async () => {
      const pdf = await getPdfjsDoc(first.id, first.bytes);
      const o = await getOutline(pdf);
      if (!cancelled) setOutline(o);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.pages, doc.sources]);

  const jumpToDest = async (dest: unknown) => {
    const first = doc.sources[doc.pages[0].sourceId];
    const pdf = await getPdfjsDoc(first.id, first.bytes);
    const idx = await resolveDest(pdf, dest);
    if (idx != null) scrollToPage(idx);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button className={sidebarTab === 'thumbnails' ? 'on' : ''} onClick={() => setSidebarTab('thumbnails')}>
          Pages
        </button>
        <button
          className={sidebarTab === 'outline' ? 'on' : ''}
          onClick={() => setSidebarTab('outline')}
          disabled={!outline.length}
          title={outline.length ? '' : 'No outline in this document'}
        >
          Outline
        </button>
      </div>

      {sidebarTab === 'thumbnails' ? (
        <div className="sidebar-body thumbs">
          {doc.pages.map((page, i) => {
            const source = doc.sources[page.sourceId];
            const size = sizes[page.id];
            if (!source) return null;
            const thumbScale = size ? 132 / size.width : 0.2;
            return (
              <button
                key={page.id}
                className={`thumb-item ${i === currentPage ? 'current' : ''}`}
                onClick={() => scrollToPage(i)}
              >
                <PageView page={page} source={source} scale={thumbScale} index={i} mode="plain" />
                <span className="thumb-n">{i + 1}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="sidebar-body outline">
          <OutlineTree nodes={outline} onJump={jumpToDest} depth={0} />
        </div>
      )}
    </aside>
  );
}

function OutlineTree({
  nodes,
  onJump,
  depth,
}: {
  nodes: OutlineNode[];
  onJump: (dest: unknown) => void;
  depth: number;
}) {
  return (
    <ul className="outline-list">
      {nodes.map((n, i) => (
        <li key={i}>
          <button className="outline-item" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => onJump(n.dest)}>
            {n.title}
          </button>
          {n.items.length > 0 && <OutlineTree nodes={n.items} onJump={onJump} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
