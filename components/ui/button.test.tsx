import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Filter</Button>);
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
  });

  it('applies the ghost variant class', () => {
    render(<Button variant="ghost">Filter</Button>);
    const btn = screen.getByRole('button', { name: 'Filter' });
    expect(btn.className).toContain('hover:bg-accent');
  });

  it('renders as a child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'link' })).toBeTruthy();
  });
});
