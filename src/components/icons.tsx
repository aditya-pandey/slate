// A small hand-drawn icon set (stroke-based, currentColor) — replaces emoji
// glyphs, which render inconsistently across platforms and read as a
// placeholder rather than a designed UI. Every icon shares the same
// viewBox/stroke weight so the set feels like one family.

interface IconProps {
  size?: number;
}

function base(children: React.ReactNode, size = 17) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconMenu = ({ size }: IconProps) =>
  base(
    <>
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </>,
    size,
  );

export const IconSearch = ({ size }: IconProps) =>
  base(
    <>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <line x1="16.3" y1="16.3" x2="12.6" y2="12.6" />
    </>,
    size,
  );

export const IconMoon = ({ size }: IconProps) =>
  base(<path d="M16.5 12.3A7 7 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8Z" />, size);

export const IconPlus = ({ size }: IconProps) =>
  base(
    <>
      <line x1="10" y1="4" x2="10" y2="16" />
      <line x1="4" y1="10" x2="16" y2="10" />
    </>,
    size,
  );

export const IconMinus = ({ size }: IconProps) => base(<line x1="4" y1="10" x2="16" y2="10" />, size);

export const IconClose = ({ size }: IconProps) =>
  base(
    <>
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </>,
    size,
  );

export const IconPrint = ({ size }: IconProps) =>
  base(
    <>
      <path d="M5.5 7.5V3.5h9v4" />
      <rect x="3" y="7.5" width="14" height="6" rx="1.2" />
      <path d="M5.5 13v3.5h9V13" />
      <line x1="6.5" y1="10" x2="9" y2="10" />
    </>,
    size,
  );

export const IconRotateCcw = ({ size }: IconProps) =>
  base(
    <>
      <path d="M4 10a6 6 0 1 0 1.8-4.3" />
      <path d="M4 3.5v3.2h3.2" />
    </>,
    size,
  );

export const IconRotateCw = ({ size }: IconProps) =>
  base(
    <>
      <path d="M16 10a6 6 0 1 1-1.8-4.3" />
      <path d="M16 3.5v3.2h-3.2" />
    </>,
    size,
  );

export const IconTrash = ({ size }: IconProps) =>
  base(
    <>
      <path d="M4.5 6h11" />
      <path d="M8 6V4.3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6" />
      <path d="M6 6l.7 9.2a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6" />
      <line x1="8.3" y1="8.7" x2="8.6" y2="13.3" />
      <line x1="11.7" y1="8.7" x2="11.4" y2="13.3" />
    </>,
    size,
  );

export const IconLink = ({ size }: IconProps) =>
  base(
    <>
      <path d="M8.3 11.7 11.7 8.3" />
      <path d="M9 5.2 10.3 4a3 3 0 0 1 4.3 4.3l-1.2 1.3" />
      <path d="M11 14.8 9.7 16a3 3 0 0 1-4.3-4.3l1.2-1.3" />
    </>,
    size,
  );

export const IconUndo = ({ size }: IconProps) =>
  base(
    <>
      <path d="M5 8.5h7.5a3.5 3.5 0 1 1 0 7H10" />
      <path d="M5 8.5 8 5.5" />
      <path d="M5 8.5 8 11.5" />
    </>,
    size,
  );

export const IconChevronUp = ({ size }: IconProps) => base(<path d="M5 12 10 7l5 5" />, size);
export const IconChevronDown = ({ size }: IconProps) => base(<path d="M5 8l5 5 5-5" />, size);

export const IconFilePdf = ({ size }: IconProps) =>
  base(
    <>
      <path d="M6 3.5h5l3 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M11 3.5v3h3" />
      <line x1="7.2" y1="11.2" x2="12.8" y2="11.2" />
      <line x1="7.2" y1="13.6" x2="12.8" y2="13.6" />
    </>,
    size,
  );

export const IconFileImage = ({ size }: IconProps) =>
  base(
    <>
      <rect x="3.2" y="4" width="13.6" height="12" rx="1.5" />
      <circle cx="7.3" cy="8" r="1.2" />
      <path d="M4 14.8l3.8-3.8 2.7 2.7 2.6-2.6L16.8 14.8" />
    </>,
    size,
  );

export const IconLock = ({ size }: IconProps) =>
  base(
    <>
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </>,
    size,
  );

export const IconGithub = ({ size = 17 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M10 1.5a8.5 8.5 0 0 0-2.69 16.57c.43.08.59-.18.59-.41 0-.2-.01-.86-.01-1.56-2.17.4-2.73-.53-2.91-1.01-.1-.25-.52-1.01-.88-1.21-.3-.16-.74-.56-.01-.57.68-.01 1.17.63 1.33.89.78 1.31 2.02.94 2.51.71.08-.56.31-.94.57-1.16-1.98-.22-4.05-.99-4.05-4.39 0-.97.35-1.76.91-2.38-.09-.22-.4-1.13.09-2.35 0 0 .75-.24 2.45.91a8.4 8.4 0 0 1 4.46 0c1.7-1.15 2.45-.91 2.45-.91.49 1.22.18 2.13.09 2.35.56.62.91 1.4.91 2.38 0 3.41-2.08 4.17-4.06 4.39.32.28.6.82.6 1.66 0 1.2-.01 2.16-.01 2.46 0 .23.16.5.59.41A8.5 8.5 0 0 0 10 1.5Z"
    />
  </svg>
);

export const IconEdit = ({ size }: IconProps) =>
  base(
    <>
      <path d="M12.4 4.1 15.9 7.6 6.9 16.6 3 17.5l.9-3.9Z" />
      <line x1="11" y1="5.5" x2="14.5" y2="9" />
    </>,
    size,
  );

export const IconLayers = ({ size }: IconProps) =>
  base(
    <>
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
      <path d="M7.5 16.5h9V7.5" />
    </>,
    size,
  );

export const IconGrid = ({ size }: IconProps) =>
  base(
    <>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1" />
    </>,
    size,
  );

export const IconScan = ({ size }: IconProps) =>
  base(
    <>
      <path d="M4 7V5.2A1.2 1.2 0 0 1 5.2 4H7" />
      <path d="M13 4h1.8A1.2 1.2 0 0 1 16 5.2V7" />
      <path d="M16 13v1.8a1.2 1.2 0 0 1-1.2 1.2H13" />
      <path d="M7 16H5.2A1.2 1.2 0 0 1 4 14.8V13" />
      <line x1="5.5" y1="10" x2="14.5" y2="10" />
    </>,
    size,
  );

export const IconDownload = ({ size }: IconProps) =>
  base(
    <>
      <path d="M10 3v9" />
      <path d="M6.3 8.7 10 12.4l3.7-3.7" />
      <path d="M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1" />
    </>,
    size,
  );

export const IconArchive = ({ size }: IconProps) =>
  base(
    <>
      <rect x="3.5" y="3.5" width="13" height="3.5" rx="0.8" />
      <path d="M4.3 7v7.7a1.3 1.3 0 0 0 1.3 1.3h8.8a1.3 1.3 0 0 0 1.3-1.3V7" />
      <line x1="8.5" y1="9.8" x2="11.5" y2="9.8" />
    </>,
    size,
  );

export const IconGrip = ({ size }: IconProps) =>
  base(
    <>
      <circle cx="7" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>,
    size,
  );
