// Find-in-document bar (⌘F). Live match count + prev/next, wired to the
// viewer's cross-page search.

import { useEffect, useRef } from 'react';
import type { ViewerApi } from '../state/useViewer';
import { IconChevronUp, IconChevronDown, IconClose } from './icons';

export function SearchBar({ view }: { view: ViewerApi }) {
  const { query, setQuery, matches, activeMatch, goToMatch, setSearchOpen } = view;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="searchbar">
      <input
        ref={inputRef}
        className="search-input"
        placeholder="Find in document"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') goToMatch(activeMatch + (e.shiftKey ? -1 : 1));
          if (e.key === 'Escape') setSearchOpen(false);
        }}
      />
      <span className="search-count">{query ? `${matches.length ? activeMatch + 1 : 0} / ${matches.length}` : ''}</span>
      <button title="Previous (⇧⏎)" disabled={!matches.length} onClick={() => goToMatch(activeMatch - 1)}>
        <IconChevronUp size={14} />
      </button>
      <button title="Next (⏎)" disabled={!matches.length} onClick={() => goToMatch(activeMatch + 1)}>
        <IconChevronDown size={14} />
      </button>
      <button title="Close (Esc)" onClick={() => setSearchOpen(false)}>
        <IconClose size={13} />
      </button>
    </div>
  );
}
