// Read-mode text layer: invisible, positioned real text over the canvas so the
// user can select & copy, plus highlight boxes for find matches. (Editing uses
// the separate, clickable TextLayer instead.)

import type { RunItem } from './TextLayer';

interface Props {
  items: RunItem[];
  matchedRunIds: Set<string>;
  activeRunId: string | null;
}

export function ReadTextLayer({ items, matchedRunIds, activeRunId }: Props) {
  return (
    <div className="read-layer">
      {items.map(({ run, box }) => {
        const matched = matchedRunIds.has(run.id);
        const pos: React.CSSProperties = {
          left: box.left,
          top: box.top,
          height: box.fontSize * 1.2,
          fontSize: box.fontSize,
          lineHeight: `${box.fontSize * 1.2}px`,
          transform: box.angle ? `rotate(${box.angle}rad)` : undefined,
          transformOrigin: 'left top',
        };
        return (
          <span key={run.id} className="sel-run" style={pos}>
            {matched && (
              <span
                className={`hl ${run.id === activeRunId ? 'active' : ''}`}
                style={{ width: box.width || undefined }}
              />
            )}
            {run.str}
          </span>
        );
      })}
    </div>
  );
}
