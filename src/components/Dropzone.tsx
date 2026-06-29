// Full-screen empty state. Drag-and-drop works anywhere on screen (a
// forgiving target), but clicking only opens the file picker via the
// explicit "Choose a file" button — not the whole page, which made every
// click (even on a feature card) accidentally open the OS file dialog.

import { useRef, useState } from 'react';
import { SlateMark } from './SlateMark';
import { IconEdit, IconLayers, IconGrid, IconScan, IconFilePdf, IconFileImage, IconLock, IconGithub } from './icons';

interface Props {
  onFiles: (files: FileList | File[]) => void;
}

const FEATURES = [
  { icon: IconEdit, label: 'Edit text', caption: 'Edit, adjust, and retype anywhere' },
  { icon: IconLayers, label: 'Combine', caption: 'Merge multiple PDFs in any order' },
  { icon: IconGrid, label: 'Organize', caption: 'Reorder, rotate, and delete pages' },
  { icon: IconScan, label: 'OCR', caption: 'Edit scanned text easily' },
];

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`empty-shell ${over ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <header className="empty-topbar">
        <div className="brand">
          <SlateMark size={20} />
          <span>The Slate</span>
        </div>
        <a
          className="icon-btn"
          title="View source on GitHub"
          href="https://github.com/aditya-pandey/slate"
          target="_blank"
          rel="noreferrer"
        >
          <IconGithub size={16} />
        </a>
      </header>

      <div className="empty-state">
        <div className="empty-state-inner">
          <div className="hero-mark"><SlateMark size={84} variant="gradient" /></div>
          <h1 className="welcome-h1">Welcome to The Slate</h1>
          <p className="dropzone-tagline">A fast, private PDF editor that runs entirely on your device.</p>

          <div className="dropzone">
            <div className="filetype-row">
              <div className="filetype-icon"><IconFilePdf size={18} /></div>
              <div className="filetype-icon"><IconFileImage size={18} /></div>
            </div>
            <h2>Drop a PDF or image here</h2>
            <p className="muted">or</p>
            <button type="button" className="primary upload-btn" onClick={() => inputRef.current?.click()}>
              Choose a file
            </button>
            <p className="dropzone-footnote">
              <IconLock size={11} /> Your files stay on your device. Nothing is uploaded.
            </p>
          </div>

          <div className="feature-row">
            {FEATURES.map(({ icon: Icon, label, caption }) => (
              <div className="feature-card" key={label}>
                <div className="feature-icon"><Icon size={16} /></div>
                <span className="feature-label">{label}</span>
                <span className="feature-caption">{caption}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}
