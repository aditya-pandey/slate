// Framework-agnostic domain types for the PDF editor core.
// The UI layer (React today, possibly Tauri later) depends on these,
// never the other way around.

/** A loaded source PDF file, kept in memory so nothing is uploaded. */
export interface SourceDoc {
  id: string;
  name: string;
  /** Original bytes, preserved untouched for export via pdf-lib. */
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * One page in the working document. Pages reference a source + original
 * index, so combine / reorder / delete / rotate are all just edits to an
 * ordered list of these — no pixels copied until export.
 */
export interface PageRef {
  id: string;
  sourceId: string;
  /** 0-based index into the source document. */
  pageIndex: number;
  /** Extra clockwise rotation applied on top of the page's own, in degrees. */
  rotation: 0 | 90 | 180 | 270;
}

/** Font family choice for an edit. 'auto' keeps the detected family. */
export type FontFamily = 'auto' | 'sans' | 'serif' | 'mono';

/** User-controllable formatting applied to an edited run. */
export interface TextStyle {
  family: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Font size in PDF points. */
  fontSize: number;
}

/**
 * An in-place text edit. Carries the original run's PDF-space geometry so the
 * exporter can cover the old text and redraw the new string at the same spot,
 * plus the formatting the user chose.
 */
export interface TextEdit {
  runId: string;
  /** PageRef.id this edit belongs to (maps to one output page). */
  pageId: string;
  /** Original baseline origin in PDF units. */
  x: number;
  y: number;
  /** Original run advance width and font size, PDF units. */
  width: number;
  fontSize: number;
  /** Detected PostScript font name of the original run. */
  fontName: string;
  /** Replacement text. */
  newText: string;
  /** Chosen formatting. */
  style: TextStyle;
  /** Cover color (0-1 rgb). Defaults to white when absent (normal PDFs). */
  bgColor?: [number, number, number];
  /** Text color (0-1 rgb). Defaults to black when absent. */
  textColor?: [number, number, number];
}

/** A rectangle in PDF user space (lower-left origin). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An edit to the hyperlink on a run. A link is a separate annotation, so this
 * is tracked independently of text edits. An empty `url` means "remove link".
 */
export interface LinkEdit {
  runId: string;
  pageId: string;
  /** Where the link sits, PDF units (normally the run's box). */
  rect: Rect;
  /** Target URL; '' removes the link. */
  url: string;
}

/** A deleted page object (e.g. an image), redacted by covering its box. */
export interface ObjectDelete {
  id: string;
  pageId: string;
  rect: Rect;
  /** Cover color (0-1 rgb); defaults to white. */
  bgColor?: [number, number, number];
}

export interface EditorDoc {
  sources: Record<string, SourceDoc>;
  pages: PageRef[];
  /** Text edits, keyed by runId. */
  edits: Record<string, TextEdit>;
  /** Link edits, keyed by runId. */
  linkEdits: Record<string, LinkEdit>;
  /** Deleted objects, keyed by object id. */
  objectDeletes: Record<string, ObjectDelete>;
}
