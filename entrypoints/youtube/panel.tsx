import { useEffect, useState } from 'react';
import type { ToggleState } from './toggleState';
import './panel.css';

export function Panel({ state }: { state: ToggleState }) {
  const [open, setOpen] = useState(state.get());

  useEffect(() => state.subscribe(setOpen), [state]);

  if (!open) return null;

  return (
    <div className="yt-panel" role="dialog" aria-label="Panel">
      <header className="yt-panel__header">
        <span className="yt-panel__title">My Panel</span>
        <button
          className="yt-panel__close"
          onClick={() => state.set(false)}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <div className="yt-panel__body" />
    </div>
  );
}
