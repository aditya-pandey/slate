// Interactive text layer drawn over a rendered page. Each detected run becomes
// a clickable box; clicking opens an inline editor with a floating formatting
// toolbar. Edited runs are previewed (cover original + new styled text),
// mirroring what the exporter bakes in.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PdfRun, CssBox } from '../core/text';
import { runRect } from '../core/text';
import type { FontFamily, LinkEdit, TextEdit, TextStyle } from '../core/types';
import { FormatToolbar } from './FormatToolbar';
import { IconLink } from './icons';

export interface RunItem {
  run: PdfRun;
  box: CssBox;
}

interface Props {
  items: RunItem[];
  pageId: string;
  edits: Record<string, TextEdit>;
  linkEdits: Record<string, LinkEdit>;
  onEdit: (edit: TextEdit, originalText: string) => void;
  onLink: (edit: LinkEdit, originalUrl: string) => void;
}

/** CSS font-family stack for a chosen family (falling back to the detected name). */
function familyStack(family: FontFamily, detectedName: string): string {
  const f =
    family === 'auto'
      ? /times|serif|roman|georgia|garamond|book antiqua/.test(detectedName.toLowerCase())
        ? 'serif'
        : /courier|mono|consol|menlo/.test(detectedName.toLowerCase())
          ? 'mono'
          : 'sans'
      : family;
  if (f === 'serif') return 'Georgia, "Times New Roman", serif';
  if (f === 'mono') return 'Menlo, Consolas, monospace';
  return 'Helvetica, Arial, sans-serif';
}

/** Turn a TextStyle into CSS for the live editor / preview. */
function styleCss(style: TextStyle, detectedName: string, cssPxPerPt: number): React.CSSProperties {
  return {
    fontFamily: familyStack(style.family, detectedName),
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    fontSize: style.fontSize * cssPxPerPt,
  };
}

/** Initial style for a run, seeded from the detected font (or a prior edit). */
function seedStyle(run: PdfRun, prior?: TextEdit): TextStyle {
  if (prior) return prior.style;
  const n = run.fontName.toLowerCase();
  return {
    family: 'auto',
    bold: /bold|black|heavy|semibold|extrabold/.test(n),
    italic: /italic|oblique/.test(n),
    underline: false,
    fontSize: Math.round(run.fontSize),
  };
}

export function TextLayer({ items, pageId, edits, linkEdits, onEdit, onLink }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [style, setStyle] = useState<TextStyle | null>(null);
  const [link, setLink] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const editingItem = items.find((it) => it.run.id === editingId) ?? null;

  const commit = useCallback(() => {
    if (!editingItem || !style) return;
    const { run } = editingItem;
    const edit: TextEdit = {
      runId: run.id,
      pageId,
      x: run.transform[4],
      y: run.transform[5],
      width: run.width,
      fontSize: run.fontSize,
      fontName: run.fontName,
      newText: draft,
      style,
      bgColor: run.ocrBg,
      textColor: run.ocrColor,
    };
    // Treat as an edit only if text or style actually changed.
    const unchanged =
      draft === run.str &&
      style.family === 'auto' &&
      style.bold === /bold|black|heavy|semibold|extrabold/.test(run.fontName.toLowerCase()) &&
      style.italic === /italic|oblique/.test(run.fontName.toLowerCase()) &&
      !style.underline &&
      Math.round(style.fontSize) === Math.round(run.fontSize);
    onEdit(unchanged ? { ...edit, newText: run.str } : edit, unchanged ? draft : run.str);

    // Commit the link independently of the text.
    const rect = runRect(run);
    onLink({ runId: run.id, pageId, rect, url: link.trim() }, run.link ?? '');

    setEditingId(null);
    setStyle(null);
  }, [editingItem, style, draft, link, pageId, onEdit, onLink]);

  // Delete the run's text (cover the original, draw nothing).
  const deleteRun = useCallback(() => {
    if (!editingItem) return;
    const { run } = editingItem;
    onEdit(
      {
        runId: run.id, pageId, x: run.transform[4], y: run.transform[5], width: run.width,
        fontSize: run.fontSize, fontName: run.fontName, newText: '',
        style: style ?? seedStyle(run), bgColor: run.ocrBg, textColor: run.ocrColor,
      },
      run.str,
    );
    setEditingId(null);
    setStyle(null);
  }, [editingItem, style, pageId, onEdit]);

  // Commit when the user clicks anywhere outside the active editor.
  useEffect(() => {
    if (!editingId) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) commit();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editingId, commit]);

  // The toolbar positions itself relative to the clicked word, which can sit
  // anywhere on the page — including right at a narrow phone's edge. Nudge it
  // back fully on-screen after it renders, instead of letting it clip off.
  useEffect(() => {
    if (!editingId) return;
    const toolbar = wrapRef.current?.querySelector<HTMLElement>('.fmt-toolbar');
    if (!toolbar) return;
    toolbar.style.transform = '';
    const rect = toolbar.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
    if (rect.left + shift < margin) shift = margin - rect.left;
    if (shift) toolbar.style.transform = `translateX(${shift}px)`;
  }, [editingId]);

  const open = (item: RunItem) => {
    const prior = edits[item.run.id];
    setDraft(prior ? prior.newText : item.run.str);
    setStyle(seedStyle(item.run, prior));
    const priorLink = linkEdits[item.run.id];
    setLink(priorLink ? priorLink.url : (item.run.link ?? ''));
    setEditingId(item.run.id);
  };

  return (
    <div className="text-layer">
      {items.map(({ run, box }) => {
        const cssPxPerPt = run.fontSize ? box.fontSize / run.fontSize : 1;
        const edited = edits[run.id];
        const baseStyle: React.CSSProperties = {
          left: box.left,
          top: box.top,
          height: box.fontSize * 1.3,
          minWidth: box.width,
          transform: box.angle ? `rotate(${box.angle}rad)` : undefined,
          transformOrigin: 'left top',
        };

        const effectiveLink = run.id in linkEdits ? linkEdits[run.id].url : (run.link ?? '');

        if (editingId === run.id && style) {
          return (
            <div key={run.id} ref={wrapRef} className="run-edit-wrap" style={baseStyle}>
              <FormatToolbar
                style={style}
                onChange={(patch) => setStyle((s) => (s ? { ...s, ...patch } : s))}
                link={link}
                onLink={setLink}
                onDelete={deleteRun}
              />
              <input
                autoFocus
                className="run-input"
                style={styleCss(style, run.fontName, cssPxPerPt)}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setStyle(null);
                  }
                }}
              />
            </div>
          );
        }

        // The baked canvas already shows the real edited pixels, so the run box
        // is just an interaction target. Edited runs get a subtle marker.
        const deletedMark = edited && !edited.newText;
        return (
          <div
            key={run.id}
            className={`run ${edited ? 'edited' : ''} ${deletedMark ? 'removed' : ''} ${effectiveLink ? 'has-link' : ''}`}
            style={baseStyle}
            title={effectiveLink ? `🔗 ${effectiveLink} — click to edit` : `${run.fontName} · ${Math.round(run.fontSize)}px — click to edit`}
            onClick={() => open({ run, box })}
          >
            {effectiveLink ? <span className="run-link-badge"><IconLink size={9} /></span> : null}
          </div>
        );
      })}
    </div>
  );
}
