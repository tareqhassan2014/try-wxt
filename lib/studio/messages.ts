export interface StudioConfig {
  showCtrHundredths: boolean;
  showApvHundredths: boolean;
}

export const DEFAULT_CONFIG: StudioConfig = {
  showCtrHundredths: true,
  showApvHundredths: true,
};

export const CONFIG_MESSAGE_TYPE = 'newstudio:config' as const;

export interface ConfigMessage {
  type: typeof CONFIG_MESSAGE_TYPE;
  config: StudioConfig;
}

export function buildConfigMessage(config: StudioConfig): ConfigMessage {
  return { type: CONFIG_MESSAGE_TYPE, config };
}

export function readConfigMessage(e: MessageEvent): StudioConfig | null {
  if (e.origin !== location.origin) return null;
  const data = e.data as Partial<ConfigMessage> | undefined;
  if (!data || data.type !== CONFIG_MESSAGE_TYPE) return null;
  const c = data.config;
  if (!c || typeof c.showCtrHundredths !== 'boolean' || typeof c.showApvHundredths !== 'boolean') {
    return null;
  }
  return { showCtrHundredths: c.showCtrHundredths, showApvHundredths: c.showApvHundredths };
}
