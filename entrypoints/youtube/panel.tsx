import { useEffect, useRef, useState } from 'react';
import type { ToggleState } from './toggleState';
import { isOutsidePanelClick } from './outsideClick';
import './panel.css';

export function Panel({ state }: { state: ToggleState }) {
  const [open, setOpen] = useState(state.get());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => state.subscribe(setOpen), [state]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (isOutsidePanelClick(event.composedPath(), panelRef.current)) {
        state.set(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, state]);

  if (!open) return null;

  return (
    <div ref={panelRef} className="yt-panel" role="dialog" aria-label="Panel">
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
