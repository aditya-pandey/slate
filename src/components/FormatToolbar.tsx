// Floating formatting toolbar shown while editing a text run. Buttons use
// onMouseDown + preventDefault so clicking them never blurs the text input.

import { useState } from 'react';
import type { FontFamily, TextStyle } from '../core/types';
import { IconMinus, IconPlus, IconLink, IconTrash, IconClose } from './icons';

interface Props {
  style: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
  link: string;
  onLink: (url: string) => void;
  onDelete: () => void;
}

const FAMILIES: { value: FontFamily; label: string }[] = [
  { value: 'auto', label: 'Original' },
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

export function FormatToolbar({ style, onChange, link, onLink, onDelete }: Props) {
  const stop = (e: React.MouseEvent) => e.preventDefault(); // keep input focused
  const [linkOpen, setLinkOpen] = useState(!!link);

  return (
    <div className="fmt-toolbar" onMouseDown={stop}>
      <select
        className="fmt-font"
        value={style.family}
        onChange={(e) => onChange({ family: e.target.value as FontFamily })}
      >
        {FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <span className="fmt-sep" />

      <div className="fmt-size">
        <button onMouseDown={stop} onClick={() => onChange({ fontSize: Math.max(4, style.fontSize - 1) })}>
          <IconMinus size={12} />
        </button>
        <span>{Math.round(style.fontSize)}</span>
        <button onMouseDown={stop} onClick={() => onChange({ fontSize: Math.min(200, style.fontSize + 1) })}>
          <IconPlus size={12} />
        </button>
      </div>

      <span className="fmt-sep" />

      <button
        className={`fmt-btn ${style.bold ? 'on' : ''}`}
        title="Bold"
        onMouseDown={stop}
        onClick={() => onChange({ bold: !style.bold })}
        style={{ fontWeight: 700 }}
      >
        B
      </button>
      <button
        className={`fmt-btn ${style.italic ? 'on' : ''}`}
        title="Italic"
        onMouseDown={stop}
        onClick={() => onChange({ italic: !style.italic })}
        style={{ fontStyle: 'italic' }}
      >
        I
      </button>
      <button
        className={`fmt-btn ${style.underline ? 'on' : ''}`}
        title="Underline"
        onMouseDown={stop}
        onClick={() => onChange({ underline: !style.underline })}
        style={{ textDecoration: 'underline' }}
      >
        U
      </button>

      <span className="fmt-sep" />

      <button
        className={`fmt-btn ${link || linkOpen ? 'on' : ''}`}
        title="Link"
        onMouseDown={stop}
        onClick={() => setLinkOpen((v) => !v)}
      >
        <IconLink size={13} />
      </button>

      <button className="fmt-btn fmt-del" title="Delete text" onMouseDown={stop} onClick={onDelete}>
        <IconTrash size={13} />
      </button>

      {linkOpen && (
        <div className="fmt-link-row" onMouseDown={(e) => e.stopPropagation()}>
          <input
            className="fmt-link-input"
            type="url"
            placeholder="https://example.com"
            value={link}
            onChange={(e) => onLink(e.target.value)}
          />
          {link && (
            <button className="fmt-link-clear" title="Remove link" onMouseDown={stop} onClick={() => onLink('')}>
              <IconClose size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
