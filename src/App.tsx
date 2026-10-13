import { useEffect, useState } from 'react';
import type { Mode } from './types';
import { useAssets } from './hooks/useAssets';
import { ScreenshotMode } from './modes/ScreenshotMode';
import { CollageMode } from './modes/CollageMode';
import { ShowcaseMode } from './modes/ShowcaseMode';
import { Segmented } from './components/ui';
import { IconGrid, IconPhone, IconStack, IconTrash } from './components/Icons';

const MODE_STORAGE = 'stitch-web:mode';

export default function App() {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_STORAGE) : null;
    return saved === 'collage' || saved === 'showcase' || saved === 'screenshot'
      ? (saved as Mode)
      : 'screenshot';
  });
  const { assets, busy, error, addFiles, remove, clear, move, swap } = useAssets();

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // Global paste-to-import.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.files;
      if (items && items.length > 0) {
        void addFiles(items);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark">◨</span>
          <span className="brand-name">Stitch Web</span>
        </div>
        <div className="appbar-center">
          <Segmented
            size="sm"
            value={mode}
            options={[
              { value: 'screenshot', label: '截图拼接', icon: <IconStack width={15} height={15} /> },
              { value: 'collage', label: '拼图', icon: <IconGrid width={15} height={15} /> },
              { value: 'showcase', label: '展示图', icon: <IconPhone width={15} height={15} /> },
            ]}
            onChange={(m) => setMode(m as Mode)}
          />
        </div>
        <div className="appbar-right">
          {assets.length > 0 ? (
            <button type="button" className="ghost-btn" onClick={clear} title="清空全部图片">
              <IconTrash width={16} height={16} />
              <span>清空</span>
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {busy ? <div className="banner banner-info">正在读取图片…</div> : null}

      <main className="app-main">
        {mode === 'screenshot' ? (
          <ScreenshotMode assets={assets} onAdd={addFiles} onRemove={remove} onMove={move} />
        ) : mode === 'collage' ? (
          <CollageMode assets={assets} onAdd={addFiles} onRemove={remove} onMove={move} onSwap={swap} />
        ) : (
          <ShowcaseMode assets={assets} onAdd={addFiles} onRemove={remove} onMove={move} onSwap={swap} />
        )}
      </main>

      <footer className="appfoot">
        <span>本地处理 · 图片不上传 · 参考 ekibun/Stitch 设计</span>
      </footer>
    </div>
  );
}
