import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing';
import App from './App';

afterEach(cleanup);

beforeEach(() => {
  fakeBrowser.reset();
});

describe('popup settings', () => {
  it('renders both precision toggles defaulting on', async () => {
    render(<App />);
    const ctr = await screen.findByLabelText(/ctr hundredths/i);
    const apv = screen.getByLabelText(/apv hundredths/i);
    expect((ctr as HTMLInputElement).checked).toBe(true);
    expect((apv as HTMLInputElement).checked).toBe(true);
  });

  it('persists a toggle change to storage', async () => {
    render(<App />);
    const ctr = await screen.findByLabelText(/ctr hundredths/i);
    fireEvent.click(ctr);
    await waitFor(async () => {
      const stored = await fakeBrowser.storage.sync.get('studioConfig');
      expect((stored as Record<string, unknown>).studioConfig).toEqual({
        showCtrHundredths: false,
        showApvHundredths: true,
      });
    });
  });
});
