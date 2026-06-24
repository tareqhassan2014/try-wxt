import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  CONFIG_MESSAGE_TYPE,
  buildConfigMessage,
  readConfigMessage,
} from './messages';

describe('studio messages', () => {
  it('defaults both hundredths flags on', () => {
    expect(DEFAULT_CONFIG).toEqual({ showCtrHundredths: true, showApvHundredths: true });
  });

  it('builds a tagged config message', () => {
    const msg = buildConfigMessage({ showCtrHundredths: false, showApvHundredths: true });
    expect(msg).toEqual({
      type: CONFIG_MESSAGE_TYPE,
      config: { showCtrHundredths: false, showApvHundredths: true },
    });
  });

  it('reads a valid same-origin message', () => {
    const e = {
      origin: location.origin,
      data: buildConfigMessage(DEFAULT_CONFIG),
    } as MessageEvent;
    expect(readConfigMessage(e)).toEqual(DEFAULT_CONFIG);
  });

  it('rejects a cross-origin message', () => {
    const e = {
      origin: 'https://evil.example',
      data: buildConfigMessage(DEFAULT_CONFIG),
    } as MessageEvent;
    expect(readConfigMessage(e)).toBeNull();
  });

  it('rejects a message without the type tag', () => {
    const e = { origin: location.origin, data: { config: DEFAULT_CONFIG } } as MessageEvent;
    expect(readConfigMessage(e)).toBeNull();
  });
});
