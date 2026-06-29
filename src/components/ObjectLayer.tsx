// Edit-mode overlay for page objects (images): hover to reveal a delete button.
// Deleted objects show a dashed placeholder with an undo button (the baked
// canvas underneath already shows them removed).

import type { PageObject } from '../core/objects';
import { IconClose, IconUndo } from './icons';

export interface ObjItem {
  obj: PageObject;
  box: { left: number; top: number; width: number; height: number };
}

interface Props {
  items: ObjItem[];
  deletedIds: Set<string>;
  onDelete: (item: ObjItem) => void;
  onRestore: (id: string) => void;
}

export function ObjectLayer({ items, deletedIds, onDelete, onRestore }: Props) {
  return (
    <div className="object-layer">
      {items.map((item) => {
        const { obj, box } = item;
        const deleted = deletedIds.has(obj.id);
        const style: React.CSSProperties = { left: box.left, top: box.top, width: box.width, height: box.height };
        if (deleted) {
          return (
            <div key={obj.id} className="obj deleted" style={style}>
              <button className="obj-undo" title="Restore image" onClick={() => onRestore(obj.id)}>
                <IconUndo size={13} /> Undo
              </button>
            </div>
          );
        }
        return (
          <div key={obj.id} className="obj" style={style} title="Image — click to delete">
            <button className="obj-del" title="Delete image" onClick={() => onDelete(item)}>
              <IconClose size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
