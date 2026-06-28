// One-canvas shell: top bar with contextual controls, optional left sidebar,
// and the virtualized viewer (Read/Edit) or the Organize grid.

import { useEffect, useRef, useState } from 'react';
import { useEditor } from './state/useEditor';
import { useViewer } from './state/useViewer';
import { Dropzone } from './components/Dropzone';
import { Viewer } from './components/Viewer';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { PagesPanel } from './components/PagesPanel';
import './styles.css';

type Mode = 'read' | 'edit' | 'organize';

export default function App() {
  const editor = useEditor();
  const view = useViewer(editor.doc);
  const { doc, isEmpty, busy } = editor;
  const [mode, setMode] = useState<Mode>('read');
  const addInput = useRef<HTMLInputElement>(null);
  const isViewer = mode === 'read' || mode === 'edit';

  // Keyboard navigation + ⌘F. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && isViewer) {
        e.preventDefault();
        view.setSearchOpen(true);
        return;
      }
      if (typing || !isViewer) return;
      const el = view.containerRef.current;
      if (!el) return;
      const page = el.clientHeight;
      switch (e.key) {
        case 'ArrowDown': el.scrollBy({ top: 80 }); break;
        case 'ArrowUp': el.scrollBy({ top: -80 }); break;
        case 'PageDown': case ' ': e.preventDefault(); el.scrollBy({ top: page * 0.9, behavior: 'smooth' }); break;
        case 'PageUp': el.scrollBy({ top: -page * 0.9, behavior: 'smooth' }); break;
        case 'Home': el.scrollTo({ top: 0, behavior: 'smooth' }); break;
        case 'End': el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isViewer, view]);

  if (isEmpty) {
    return (
      <div className="app">
        <Dropzone onFiles={editor.addFiles} />
        {busy && <div className="busy-bar" />}
      </div>
    );
  }

  return (
    <div className={`app ${view.dark ? 'app-dark' : ''}`}>
      <header className="topbar">
        {isViewer && (
          <button className="icon-btn" title="Sidebar" onClick={() => view.setSidebarOpen((v) => !v)}>
            ☰
          </button>
        )}
        <div className="brand">PDF Editor</div>

        <div className="segmented">
          <button className={mode === 'read' ? 'on' : ''} onClick={() => setMode('read')}>Read</button>
          <button className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>Edit text</button>
          <button className={mode === 'organize' ? 'on' : ''} onClick={() => setMode('organize')}>Organize</button>
        </div>

        <div className="spacer" />

        {isViewer && (
          <>
            <div className="pagebox">
              <input
                key={view.currentPage}
                className="page-input"
                type="number"
                min={1}
                max={doc.pages.length}
                defaultValue={view.currentPage + 1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') view.scrollToPage(Number((e.target as HTMLInputElement).value) - 1);
                }}
              />
              <span className="muted">/ {doc.pages.length}</span>
            </div>

            <div className="zoom">
              <button onClick={() => view.zoomBy(1 / 1.1)}>−</button>
              <span>{Math.round(view.scale * 100)}%</span>
              <button onClick={() => view.zoomBy(1.1)}>＋</button>
            </div>
            <select className="fit-select" value={view.fit} onChange={(e) => view.applyFit(e.target.value as any)}>
              <option value="custom">Custom</option>
              <option value="width">Fit width</option>
              <option value="page">Fit page</option>
              <option value="actual">100%</option>
            </select>

            <button className="icon-btn" title="Find (⌘F)" onClick={() => view.setSearchOpen(true)}>🔍</button>
            <button
              className={`icon-btn ${view.dark ? 'on' : ''}`}
              title="Night mode"
              onClick={() => view.setDark((v) => !v)}
            >
              ☾
            </button>
          </>
        )}

        <button className="ghost" onClick={() => addInput.current?.click()}>Add PDF</button>
        <button className="icon-btn" title="Print" disabled={busy} onClick={editor.print}>⎙</button>
        <button className="ghost" onClick={editor.reset}>Close</button>
        <button className="primary" disabled={busy} onClick={editor.download}>
          {busy ? 'Working…' : 'Download'}
        </button>
        <input
          ref={addInput} type="file" accept="application/pdf" multiple hidden
          onChange={(e) => e.target.files && editor.addFiles(e.target.files)}
        />
      </header>

      <div className="body">
        {isViewer && view.sidebarOpen && <Sidebar editor={editor} view={view} />}

        <main className="stage" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) editor.addFiles(e.dataTransfer.files); }}>
          {mode === 'organize' ? (
            <PagesPanel editor={editor} />
          ) : (
            <>
              <Viewer editor={editor} view={view} mode={mode} />
              {view.searchOpen && <SearchBar view={view} />}
            </>
          )}
        </main>
      </div>

      {busy && <div className="busy-bar" />}
    </div>
  );
}
