import { useEffect, useRef, useState } from 'react';
import type { ToggleState } from './toggleState';
import { isOutsidePanelClick } from './outsideClick';
import { PANEL_BUTTON_ID } from './button';
import { computePanelPosition } from './panelPosition';
import { readYouTubeTheme } from './panelTheme';
import './panel.css';

export function Panel({ state }: { state: ToggleState }) {
  const [open, setOpen] = useState(state.get());
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [theme, setTheme] = useState(readYouTubeTheme());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => state.subscribe(setOpen), [state]);

  useEffect(() => {
    const sync = () => setTheme(readYouTubeTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dark'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const btn = document.getElementById(PANEL_BUTTON_ID);
      if (btn) {
        setPos(computePanelPosition(btn.getBoundingClientRect(), window.innerWidth));
      }
    };
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

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
    <div
      ref={panelRef}
      className="yt-panel"
      data-theme={theme}
      role="dialog"
      aria-label="Panel"
      style={pos ? { top: pos.top, left: pos.left, right: 'auto' } : undefined}
    >
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
