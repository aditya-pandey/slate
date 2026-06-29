// Full-screen empty state + drag-and-drop intake. The first thing a user sees.

import { useRef, useState } from 'react';
import { Logo } from './Logo';

interface Props {
  onFiles: (files: FileList | File[]) => void;
}

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
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
      onClick={() => inputRef.current?.click()}
    >
      <div className="dropzone-inner">
        <div className="dropzone-logo"><Logo size={40} /></div>
        <h1>Drop a PDF or image here</h1>
        <p>or click to choose a file. Images become a PDF page automatically.</p>
        <p className="muted">Everything stays on your device — nothing is uploaded.</p>
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
