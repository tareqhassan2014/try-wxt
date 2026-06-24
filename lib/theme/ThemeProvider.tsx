import * as React from 'react';
import type { SurfaceTheme } from './resolvers';

export function ThemeProvider({
  surface,
  target,
  children,
}: {
  surface: SurfaceTheme;
  target: HTMLElement;
  children?: React.ReactNode;
}) {
  React.useEffect(() => {
    const apply = () => {
      target.classList.toggle('dark', surface.read() === 'dark');
    };
    apply();
    return surface.observe(apply);
  }, [surface, target]);

  return <>{children}</>;
}
