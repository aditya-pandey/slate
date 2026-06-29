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
