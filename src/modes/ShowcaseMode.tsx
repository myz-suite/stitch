import { useMemo, useState } from 'react';
import type { AssetItem } from '../types';
import { composeShowcase, DEFAULT_SHOWCASE, SHOWCASE_SIZES } from '../core/showcase';
import type { ShowcaseParams, ShowcaseTemplate } from '../core/showcase';
import { AssetTray } from '../components/AssetTray';
import { DropZone } from '../components/DropZone';
import { ExportPanel } from '../components/ExportPanel';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { ColorField, Panel, Segmented, Select, Slider, TextInput, Toggle } from '../components/ui';

const GRADIENTS: { from: string; to: string; angle: number }[] = [
  { from: '#5b8cff', to: '#7c5cff', angle: 135 },
  { from: '#ff7a59', to: '#ff3d81', angle: 135 },
  { from: '#12c2e9', to: '#26d0ce', angle: 135 },
  { from: '#f7971e', to: '#ffd200', angle: 135 },
  { from: '#232526', to: '#414345', angle: 135 },
  { from: '#11998e', to: '#38ef7d', angle: 135 },
  { from: '#fdfbfb', to: '#ebedee', angle: 135 },
  { from: '#fc466b', to: '#3f5efb', angle: 135 },
];

export function ShowcaseMode({
  assets,
  onAdd,
  onRemove,
  onMove,
  onSwap,
}: {
  assets: AssetItem[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onSwap: (a: number, b: number) => void;
}) {
  const [params, setParams] = useState<ShowcaseParams>(DEFAULT_SHOWCASE);
  const [selected, setSelected] = useState<number | null>(null);

  const size = SHOWCASE_SIZES.find((s) => s.id === params.sizeId) ?? SHOWCASE_SIZES[0];

  const set = (patch: Partial<ShowcaseParams>) => setParams((p) => ({ ...p, ...patch }));

  // Order assets so the "selected" one is drawn first / centered when relevant.
  const orderedAssets = useMemo(() => {
    if (selected === null) return assets;
    const next = assets.slice();
    const [item] = next.splice(selected, 1);
    next.unshift(item);
    return next;
  }, [assets, selected]);

  return (
    <div className="mode">
      <div className="mode-main">
        {assets.length === 0 ? (
          <div className="stage-empty">
            <DropZone onFiles={onAdd} />
            <div className="tips">
              <h3>App Store 展示图</h3>
              <ol>
                <li>选择目标尺寸（iPhone / iPad / Google Play / 社交卡片）。</li>
                <li>添加 1–3 张截图，自动套上设备边框并排版。</li>
                <li>填写标题与副标题，调整背景渐变与配色。</li>
                <li>导出即成可上传的商店展示图。</li>
              </ol>
            </div>
          </div>
        ) : (
          <PreviewCanvas
            width={size.w}
            height={size.h}
            draw={(ctx, scale) => {
              const rendered = composeShowcase(orderedAssets, params, scale);
              ctx.drawImage(rendered, 0, 0);
            }}
          />
        )}
      </div>

      <aside className="mode-side">
        <AssetTray
          assets={assets}
          onAdd={onAdd}
          onRemove={onRemove}
          onMove={onMove}
          selectable
          selectedIndex={selected}
          onSelect={setSelected}
          onSwap={onSwap}
        />
        <p className="muted-note">点选缩略图可把它排到最前面（主展示位）。</p>

        <Panel title="尺寸与模板">
          <Select
            value={params.sizeId}
            options={SHOWCASE_SIZES.map((s) => ({ value: s.id, label: s.label }))}
            onChange={(sizeId) => set({ sizeId })}
          />
          <Segmented
            value={params.template}
            options={[
              { value: 'single', label: '单机' },
              { value: 'duo', label: '双机' },
              { value: 'trio', label: '三机' },
            ]}
            onChange={(v) => set({ template: v as ShowcaseTemplate })}
          />
        </Panel>

        <Panel title="文案">
          <TextInput label="标题" value={params.title} placeholder="例如：让截图更好看" onChange={(title) => set({ title })} />
          <TextInput label="副标题" value={params.subtitle} placeholder="例如：一键生成展示图" onChange={(subtitle) => set({ subtitle })} />
          <Slider
            label="文字大小"
            min={0.5}
            max={1.6}
            step={0.02}
            value={params.titleScale}
            onChange={(titleScale) => set({ titleScale })}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <ColorField label="文字颜色" value={params.textColor} onChange={(textColor) => set({ textColor })} />
        </Panel>

        <Panel title="背景">
          <Segmented
            size="sm"
            value={params.bgStyle}
            options={[
              { value: 'gradient', label: '渐变' },
              { value: 'solid', label: '纯色' },
            ]}
            onChange={(v) => set({ bgStyle: v as ShowcaseParams['bgStyle'] })}
          />
          <div className="swatches">
            {GRADIENTS.map((g, i) => (
              <button
                key={i}
                type="button"
                className="swatch"
                style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                onClick={() => set({ bgFrom: g.from, bgTo: g.to, bgAngle: g.angle, bgStyle: 'gradient' })}
              />
            ))}
          </div>
          <ColorField label="背景起点" value={params.bgFrom} onChange={(bgFrom) => set({ bgFrom })} />
          {params.bgStyle === 'gradient' ? (
            <>
              <ColorField label="背景终点" value={params.bgTo} onChange={(bgTo) => set({ bgTo })} />
              <Slider
                label="渐变角度"
                min={0}
                max={360}
                value={params.bgAngle}
                onChange={(bgAngle) => set({ bgAngle })}
                format={(v) => `${v}°`}
              />
            </>
          ) : null}
        </Panel>

        <Panel title="设备">
          <Toggle label="设备边框" checked={params.frame} onChange={(frame) => set({ frame })} />
          {params.frame ? (
            <ColorField label="边框颜色" value={params.frameColor} onChange={(frameColor) => set({ frameColor })} />
          ) : null}
          <Toggle label="投影" checked={params.shadow} onChange={(shadow) => set({ shadow })} />
          <Slider
            label="设备大小"
            min={0.4}
            max={1.15}
            step={0.01}
            value={params.deviceScale}
            onChange={(deviceScale) => set({ deviceScale })}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <Slider
            label="屏幕圆角"
            min={0}
            max={0.14}
            step={0.002}
            value={params.radius}
            onChange={(radius) => set({ radius })}
            format={(v) => `${v.toFixed(3)}`}
          />
          <Slider
            label="间距"
            min={0.8}
            max={1.2}
            step={0.01}
            value={params.spacing}
            onChange={(spacing) => set({ spacing })}
            format={(v) => `${v.toFixed(2)}×`}
          />
        </Panel>

        {assets.length > 0 ? (
          <Panel title="导出">
            <ExportPanel
              getCanvas={(scale) => composeShowcase(orderedAssets, params, scale)}
              width={size.w}
              height={size.h}
              filenameBase={`showcase-${size.id}`}
            />
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
