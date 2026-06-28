// Viewer state shared between the top bar (controls) and the Viewer (scroller):
// zoom/fit, dark mode, sidebar, find, page sizes, and scroll position.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorDoc } from '../core/types';
import { getPdfjsDoc } from '../core/render';
import { getPageSize, type Size } from '../core/sizes';
import { extractRuns } from '../core/text';
import { hasOcr, ocrPage } from '../core/ocr';

export const GAP = 16;
export const PAD = 24;
const DEFAULT_SIZE: Size = { width: 612, height: 792 }; // US Letter, until measured

export type FitMode = 'width' | 'page' | 'actual' | 'custom';
export type SidebarTab = 'thumbnails' | 'outline';

export interface SearchMatch {
  pageIndex: number;
  runId: string;
  /** Distance from the page's top edge, in PDF points. */
  ptFromTop: number;
}

export interface ViewLayout {
  tops: number[];
  widths: number[];
  heights: number[];
  total: number;
}

export function useViewer(doc: EditorDoc) {
  const [scale, setScale] = useState(1.1);
  const [fit, setFit] = useState<FitMode>('width');
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('thumbnails');
  const [currentPage, setCurrentPage] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});

  // Measure every page (cheap — no rendering) so the scroller has real heights.
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

  const layout = useMemo<ViewLayout>(() => {
    const tops: number[] = [];
    const widths: number[] = [];
    const heights: number[] = [];
    let y = PAD;
    for (const p of doc.pages) {
      const s = sizes[p.id] ?? DEFAULT_SIZE;
      const w = s.width * scale;
      const h = s.height * scale;
      tops.push(y);
      widths.push(w);
      heights.push(h);
      y += h + GAP;
    }
    return { tops, widths, heights, total: y - GAP + PAD };
  }, [doc.pages, sizes, scale]);

  const scrollToOffset = useCallback((top: number) => {
    containerRef.current?.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const scrollToPage = useCallback(
    (i: number) => {
      if (i < 0 || i >= layout.tops.length) return;
      scrollToOffset(layout.tops[i] - PAD);
    },
    [layout, scrollToOffset],
  );

  /** Apply a fit mode, computing a uniform scale from the current page + container. */
  const applyFit = useCallback(
    (mode: FitMode) => {
      setFit(mode);
      const el = containerRef.current;
      const p = doc.pages[currentPage];
      const s = p ? sizes[p.id] : undefined;
      if (!el || !s) return;
      if (mode === 'actual') setScale(1);
      else if (mode === 'width') setScale((el.clientWidth - PAD * 2) / s.width);
      else if (mode === 'page')
        setScale(Math.min((el.clientWidth - PAD * 2) / s.width, (el.clientHeight - PAD * 2) / s.height));
    },
    [doc.pages, sizes, currentPage],
  );

  const zoomBy = useCallback((factor: number) => {
    setFit('custom');
    setScale((s) => Math.min(6, Math.max(0.2, +(s * factor).toFixed(3))));
  }, []);

  // Re-fit on container resize when in a fit mode.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (fit === 'width' || fit === 'page') applyFit(fit);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, applyFit]);

  // Recompute fit once page sizes become available.
  useEffect(() => {
    if (fit === 'width' || fit === 'page') applyFit(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes]);

  // Find: scan every page's text for the query (debounced).
  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setActiveMatch(0);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const q = query.toLowerCase();
      const found: SearchMatch[] = [];
      for (let i = 0; i < doc.pages.length; i++) {
        const p = doc.pages[i];
        const src = doc.sources[p.sourceId];
        if (!src) continue;
        const pdf = await getPdfjsDoc(src.id, src.bytes);
        if (cancelled) return;
        let runs = await extractRuns(pdf, src.id, p.pageIndex);
        // Include OCR'd text on image pages that have already been recognized.
        if (runs.length === 0 && hasOcr(src.id, p.pageIndex)) runs = await ocrPage(pdf, src.id, p.pageIndex);
        const pageH = (sizes[p.id] ?? DEFAULT_SIZE).height;
        for (const r of runs) {
          if (r.str.toLowerCase().includes(q)) {
            found.push({ pageIndex: i, runId: r.id, ptFromTop: pageH - (r.transform[5] + r.fontSize) });
          }
        }
      }
      if (!cancelled) {
        setMatches(found);
        setActiveMatch(0);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, doc.pages, doc.sources, sizes]);

  const goToMatch = useCallback(
    (idx: number) => {
      if (!matches.length) return;
      const i = ((idx % matches.length) + matches.length) % matches.length;
      setActiveMatch(i);
      const m = matches[i];
      scrollToOffset(layout.tops[m.pageIndex] - PAD + m.ptFromTop * scale - 80);
    },
    [matches, layout, scale, scrollToOffset],
  );

  const matchedRunIds = useMemo(() => new Set(matches.map((m) => m.runId)), [matches]);
  const activeRunId = matches[activeMatch]?.runId ?? null;

  return {
    scale, fit, dark, sidebarOpen, sidebarTab, currentPage,
    searchOpen, query, matches, activeMatch, matchedRunIds, activeRunId,
    sizes, layout, containerRef,
    setScale, setDark, setSidebarOpen, setSidebarTab, setCurrentPage,
    setSearchOpen, setQuery, applyFit, zoomBy, scrollToPage, goToMatch,
  };
}

export type ViewerApi = ReturnType<typeof useViewer>;
