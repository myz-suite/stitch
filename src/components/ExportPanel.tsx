import { useMemo, useState } from 'react';
import { IconCopy, IconDownload } from './Icons';
import { Button, Segmented, Slider } from './ui';
import {
  DEFAULT_EXPORT,
  EXPORT_FORMATS,
  isLossy,
  resolveExportScale,
  saveRendered,
  copyRendered,
} from '../core/export';
import type { RenderFn } from '../core/export';

export function ExportPanel({
  getCanvas,
  width,
  height,
  filenameBase,
  disabled,
}: {
  getCanvas: RenderFn;
  width: number;
  height: number;
  filenameBase: string;
  disabled?: boolean;
}) {
  const [settings, setSettings] = useState(DEFAULT_EXPORT);
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const resolved = useMemo(
    () => resolveExportScale(width, height, settings.scale),
    [width, height, settings.scale],
  );

  async function run(kind: 'save' | 'copy') {
    if (disabled) return;
    setWorking(true);
    setStatus(null);
    try {
      const result =
        kind === 'save'
          ? await saveRendered(getCanvas, settings, width, height, filenameBase)
          : await copyRendered(getCanvas, settings, width, height);
      const dims = `${result.width}×${result.height}`;
      setStatus(
        (kind === 'save' ? `已保存 ${dims}` : `已复制到剪贴板 ${dims}`) +
          (result.clamped ? '（已按浏览器上限缩放）' : ''),
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '导出失败');
    } finally {
      setWorking(false);
      setTimeout(() => setStatus(null), 4000);
    }
  }

  return (
    <div className="export-panel">
      <div className="export-row">
        <span className="export-label">格式</span>
        <Segmented
          size="sm"
          value={settings.format}
          options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
          onChange={(format) => setSettings((s) => ({ ...s, format }))}
        />
      </div>
      <div className="export-row">
        <span className="export-label">倍率</span>
        <Segmented
          size="sm"
          value={String(settings.scale)}
          options={[
            { value: '0.5', label: '0.5×' },
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
          ]}
          onChange={(scale) => setSettings((s) => ({ ...s, scale: Number(scale) }))}
        />
      </div>
      {isLossy(settings.format) ? (
        <Slider
          label="质量"
          min={0.4}
          max={1}
          step={0.02}
          value={settings.quality}
          onChange={(quality) => setSettings((s) => ({ ...s, quality }))}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      ) : null}
      <p className="export-dims">
        输出 <strong>{resolved.width}×{resolved.height}</strong> px
        {resolved.clamped ? <em className="export-warn">（已限制）</em> : null}
      </p>
      <div className="export-actions">
        <Button variant="primary" block disabled={disabled || working} icon={<IconDownload />} onClick={() => run('save')}>
          {working ? '处理中…' : '保存图片'}
        </Button>
        <Button disabled={disabled || working} icon={<IconCopy />} onClick={() => run('copy')}>
          复制
        </Button>
      </div>
      {status ? <p className="export-status">{status}</p> : null}
    </div>
  );
}
