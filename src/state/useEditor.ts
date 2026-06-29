// The single source of truth for the working document. A thin React hook over
// the framework-agnostic core. All mutations are immutable updates so the UI
// re-renders predictably.

import { useCallback, useMemo, useState } from 'react';
import type { EditorDoc, LinkEdit, ObjectDelete, PageRef, TextEdit } from '../core/types';
import { loadSource, exportPdf, downloadBytes } from '../core/document';
import { forgetPdfjsDoc } from '../core/render';

const EMPTY: EditorDoc = { sources: {}, pages: [], edits: {}, linkEdits: {}, objectDeletes: {} };

export function useEditor() {
  const [doc, setDoc] = useState<EditorDoc>(EMPTY);
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // PDFs pass through as-is; PNG/JPEG are wrapped into a one-page PDF by
    // loadSource. Other image types aren't supported by pdf-lib's embedder.
    const supportedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);
    const acceptable = /\.(pdf|png|jpe?g)$/i;
    const list = Array.from(files).filter((f) => supportedTypes.has(f.type) || acceptable.test(f.name));
    if (!list.length) return;
    setBusy(true);
    try {
      for (const file of list) {
        const { source, pages } = await loadSource(file);
        setDoc((d) => ({
          ...d,
          sources: { ...d.sources, [source.id]: source },
          pages: [...d.pages, ...pages],
        }));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  /** Record (or clear) an in-place text edit. Clears when text matches original. */
  const editRun = useCallback((edit: TextEdit, originalText: string) => {
    setDoc((d) => {
      const edits = { ...d.edits };
      if (edit.newText === originalText) delete edits[edit.runId];
      else edits[edit.runId] = edit;
      return { ...d, edits };
    });
  }, []);

  /** Record (or clear) a link edit. Clears when url matches the original. */
  const editLink = useCallback((edit: LinkEdit, originalUrl: string) => {
    setDoc((d) => {
      const linkEdits = { ...d.linkEdits };
      if (edit.url === originalUrl) delete linkEdits[edit.runId];
      else linkEdits[edit.runId] = edit;
      return { ...d, linkEdits };
    });
  }, []);

  /** Delete (or restore) a page object. */
  const deleteObject = useCallback((obj: ObjectDelete) => {
    setDoc((d) => ({ ...d, objectDeletes: { ...d.objectDeletes, [obj.id]: obj } }));
  }, []);

  const restoreObject = useCallback((id: string) => {
    setDoc((d) => {
      const objectDeletes = { ...d.objectDeletes };
      delete objectDeletes[id];
      return { ...d, objectDeletes };
    });
  }, []);

  const movePage = useCallback((from: number, to: number) => {
    setDoc((d) => {
      if (from === to || from < 0 || to < 0 || from >= d.pages.length || to >= d.pages.length) return d;
      const pages = d.pages.slice();
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { ...d, pages };
    });
  }, []);

  const moveDocument = useCallback((fromSourceId: string, toSourceId: string) => {
    setDoc((d) => {
      const fromPages = d.pages.filter((p) => p.sourceId === fromSourceId);
      const otherPages = d.pages.filter((p) => p.sourceId !== fromSourceId);
      const targetIndex = otherPages.findIndex((p) => p.sourceId === toSourceId);
      if (targetIndex === -1) {
        // If target not found (e.g. no pages left for target), append to end
        return { ...d, pages: [...otherPages, ...fromPages] };
      }
      const newPages = [...otherPages];
      newPages.splice(targetIndex, 0, ...fromPages);
      return { ...d, pages: newPages };
    });
  }, []);

  const deletePage = useCallback((id: string) => {
    setDoc((d) => {
      const edits = Object.fromEntries(Object.entries(d.edits).filter(([, e]) => e.pageId !== id));
      const linkEdits = Object.fromEntries(Object.entries(d.linkEdits).filter(([, e]) => e.pageId !== id));
      const objectDeletes = Object.fromEntries(Object.entries(d.objectDeletes).filter(([, e]) => e.pageId !== id));
      return { ...d, pages: d.pages.filter((p) => p.id !== id), edits, linkEdits, objectDeletes };
    });
  }, []);

  const deleteDocument = useCallback((sourceId: string) => {
    setDoc((d) => {
      const sources = { ...d.sources };
      delete sources[sourceId];
      const pages = d.pages.filter((p) => p.sourceId !== sourceId);
      const pageIds = new Set(pages.map((p) => p.id));
      const edits = Object.fromEntries(Object.entries(d.edits).filter(([, e]) => pageIds.has(e.pageId)));
      const linkEdits = Object.fromEntries(Object.entries(d.linkEdits).filter(([, e]) => pageIds.has(e.pageId)));
      const objectDeletes = Object.fromEntries(Object.entries(d.objectDeletes).filter(([, e]) => pageIds.has(e.pageId)));
      forgetPdfjsDoc(sourceId);
      return { ...d, sources, pages, edits, linkEdits, objectDeletes };
    });
  }, []);

  const rotatePage = useCallback((id: string, dir: 1 | -1) => {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === id ? { ...p, rotation: (((p.rotation + dir * 90) % 360) + 360) % 360 as PageRef['rotation'] } : p,
      ),
    }));
  }, []);

  const reset = useCallback(() => {
    setDoc((d) => {
      Object.keys(d.sources).forEach(forgetPdfjsDoc);
      return EMPTY;
    });
  }, []);

  const download = useCallback(async () => {
    if (!doc.pages.length) return;
    setBusy(true);
    try {
      const bytes = await exportPdf(doc);
      downloadBytes(bytes, 'edited.pdf');
    } finally {
      setBusy(false);
    }
  }, [doc]);

  /** Print the assembled PDF via a hidden iframe (with edits applied). */
  const print = useCallback(async () => {
    if (!doc.pages.length) return;
    setBusy(true);
    try {
      const bytes = await exportPdf(doc);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      iframe.src = url;
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
      document.body.appendChild(iframe);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 60000);
    } finally {
      setBusy(false);
    }
  }, [doc]);

  const isEmpty = doc.pages.length === 0;
  const api = useMemo(
    () => ({ doc, busy, isEmpty, addFiles, editRun, editLink, deleteObject, restoreObject, movePage, moveDocument, deletePage, deleteDocument, rotatePage, reset, download, print }),
    [doc, busy, isEmpty, addFiles, editRun, editLink, deleteObject, restoreObject, movePage, moveDocument, deletePage, deleteDocument, rotatePage, reset, download, print],
  );
  return api;
}

export type EditorApi = ReturnType<typeof useEditor>;
