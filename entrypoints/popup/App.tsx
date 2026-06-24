import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG, type StudioConfig } from '@/lib/studio/messages';

const STORAGE_KEY = 'studioConfig';

function App() {
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    browser.storage.sync.get(STORAGE_KEY).then((stored) => {
      setConfig({ ...DEFAULT_CONFIG, ...(stored[STORAGE_KEY] as Partial<StudioConfig> | undefined) });
    });
  }, []);

  function update(patch: Partial<StudioConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    void browser.storage.sync.set({ [STORAGE_KEY]: next });
  }

  return (
    <div style={{ padding: 16, minWidth: 240 }}>
      <h1 style={{ fontSize: 16 }}>Studio Performance</h1>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={config.showCtrHundredths}
          onChange={(e) => update({ showCtrHundredths: e.target.checked })}
        />
        CTR hundredths (2 decimals)
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={config.showApvHundredths}
          onChange={(e) => update({ showApvHundredths: e.target.checked })}
        />
        APV hundredths (2 decimals)
      </label>
    </div>
  );
}

export default App;
