import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ShadowRootProvider, useShadowRoot } from './ShadowRootContext';

afterEach(cleanup);

function Probe({ onValue }: { onValue: (v: ReturnType<typeof useShadowRoot>) => void }) {
  onValue(useShadowRoot());
  return null;
}

describe('ShadowRootContext', () => {
  it('provides the container and host', () => {
    const container = document.createElement('div');
    const host = document.createElement('div');
    let captured: ReturnType<typeof useShadowRoot> | null = null;
    render(
      <ShadowRootProvider container={container} host={host}>
        <Probe onValue={(v) => (captured = v)} />
      </ShadowRootProvider>,
    );
    expect(captured).toEqual({ container, host });
  });

  it('defaults to nulls with no provider', () => {
    let captured: ReturnType<typeof useShadowRoot> | null = null;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toEqual({ container: null, host: null });
  });
});
