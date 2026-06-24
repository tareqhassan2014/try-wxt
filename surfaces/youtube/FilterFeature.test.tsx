import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ShadowRootProvider } from '@/components/overlay/ShadowRootContext';
import { FilterFeature } from './FilterFeature';

afterEach(cleanup);

function renderInShadow() {
  const container = document.createElement('div');
  const host = document.createElement('div');
  document.body.append(container, host);
  return render(
    <ShadowRootProvider container={container} host={host}>
      <FilterFeature />
    </ShadowRootProvider>,
  );
}

describe('FilterFeature', () => {
  it('renders the Filter trigger button', () => {
    renderInShadow();
    expect(screen.getByRole('button', { name: /filter/i })).toBeTruthy();
  });

  it('keeps the panel closed until the trigger is activated', () => {
    renderInShadow();
    // Radix renders content only when open; closed by default.
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
