import * as React from 'react';

interface ShadowRootValue {
  container: HTMLElement | null;
  host: HTMLElement | null;
}

const ShadowRootContext = React.createContext<ShadowRootValue>({
  container: null,
  host: null,
});

export function ShadowRootProvider({
  container,
  host,
  children,
}: {
  container: HTMLElement;
  host: HTMLElement;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ container, host }), [container, host]);
  return (
    <ShadowRootContext.Provider value={value}>
      {children}
    </ShadowRootContext.Provider>
  );
}

export function useShadowRoot(): ShadowRootValue {
  return React.useContext(ShadowRootContext);
}
