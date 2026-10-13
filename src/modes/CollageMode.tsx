import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetItem } from '../types';
import { getLayouts } from '../core/layouts';
import type { Cell, Layout } from '../core/layouts';
import { drawImageCover, get2d, makeCanvas, roundRectPath } from '../core/imageUtils';
import { AssetTray } from '../components/AssetTray';
import { DropZone } from '../components/DropZone';
import { ExportPanel } from '../components/ExportPanel';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { Button, ColorField, Panel, Segmented, Slider, Toggle } from '../components/ui';
import { IconSparkle, IconSwap } from '../components/Icons';

export interface CellTransform {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface CollageConfig {
  ratio: '1:1' | '4:5' | '3:4' | '9:16' | '16:9' | '4:3' | '3:2' | 'original';
  baseSize: number;
  spacing: number;
  margin: number;
  radius: number;
  background: string;
  layoutId: string;
  cells: CellTransform[];
}

const DEFAULT_CONFIG: CollageConfig = {
  ratio: '1:1',
  baseSize: 1440,
  spacing: 16,
  margin: 24,
  radius: 24,
  background: '#0e0f13',
  layoutId: '',
  cells: [],
};

const RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
};

interface Geom {
  W: number;
  H: number;
  rects: { x: number; y: number; w: number; h: number }[];
}

function buildGeom(assets: AssetItem[], cfg: CollageConfig, layout: Layout): Geom {
  const ratio =
    cfg.ratio === 'original' && assets[0]
      ? assets[0].width / assets[0].height
      : RATIOS[cfg.ratio] ?? 1;
  let W: number;
  let H: number;
  if (ratio >= 1) {
    W = cfg.baseSize;
    H = Math.round(cfg.baseSize / ratio);
  } else {
    H = cfg.baseSize;
    W = Math.round(cfg.baseSize * ratio);
  }
  const inner = {
    x: cfg.margin,
    y: cfg.margin,
    w: W - cfg.margin * 2,
    h: H - cfg.margin * 2,
  };
  const rects = layout.map((c: Cell) => ({
    x: inner.x + c.x * inner.w + cfg.spacing / 2,
    y: inner.y + c.y * inner.h + cfg.spacing / 2,
    w: Math.max(1, c.w * inner.w - cfg.spacing),
    h: Math.max(1, c.h * inner.h - cfg.spacing),
  }));
  return { W, H, rects };
}

function paintCollage(
  ctx: CanvasRenderingContext2D,
  assets: AssetItem[],
  cfg: CollageConfig,
  geom: Geom,
  scale: number,
  selected: number | null,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  if (cfg.background) {
    ctx.fillStyle = cfg.background;
    ctx.fillRect(0, 0, geom.W, geom.H);
  }
  geom.rects.forEach((r, i) => {
    const asset = assets[i];
    const t = cfg.cells[i] ?? { offsetX: 0.5, offsetY: 0.5, zoom: 1 };
    ctx.save();
    roundRectPath(ctx, r.x, r.y, r.w, r.h, cfg.radius);
    ctx.clip();
    if (asset) {
      drawImageCover(ctx, asset.image, asset.width, asset.height, r.x, r.y, r.w, r.h, {
        offsetX: t.offsetX,
        offsetY: t.offsetY,
        zoom: t.zoom,
      });
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
    if (selected === i) {
      ctx.save();
      ctx.strokeStyle = '#5b8cff';
      ctx.lineWidth = Math.max(2, geom.W * 0.004);
      roundRectPath(ctx, r.x, r.y, r.w, r.h, cfg.radius);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}

export function CollageMode({
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
  const [config, setConfig] = useState<CollageConfig>(DEFAULT_CONFIG);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ cell: number; x: number; y: number } | null>(null);

  const layouts = useMemo(
    () => getLayouts(Math.max(1, assets.length)),
    [assets.length],
  );

  const layout = layouts[Math.min(layoutIndex, layouts.length - 1)]?.cells ?? [{ x: 0, y: 0, w: 1, h: 1 }];

  // Keep transforms aligned with the number of images.
  useEffect(() => {
    setConfig((c) => {
      const cells = assets.map(
        (_, i) => c.cells[i] ?? { offsetX: 0.5, offsetY: 0.5, zoom: 1 },
      );
      return { ...c, cells };
    });
    setSelected((s) => (s !== null && s >= assets.length ? null : s));
  }, [assets.length]);

  useEffect(() => {
    setLayoutIndex((i) => Math.min(i, layouts.length - 1));
  }, [layouts.length]);

  const geom = useMemo(() => buildGeom(assets, config, layout), [assets, config, layout]);

  const drawPreview = (ctx: CanvasRenderingContext2D, scale: number) => {
    paintCollage(ctx, assets, config, geom, scale, selected);
  };

  const pointToCell = (clientX: number, clientY: number): { index: number; local: { x: number; y: number } } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * geom.W;
    const sy = ((clientY - rect.top) / rect.height) * geom.H;
    for (let i = 0; i < geom.rects.length; i += 1) {
      const r = geom.rects[i];
      if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) {
        return { index: i, local: { x: sx - r.x, y: sy - r.y } };
      }
    }
    return null;
  };

  const updateCell = (index: number, patch: Partial<CellTransform>) => {
    setConfig((c) => {
      const cells = c.cells.slice();
      const cur = cells[index] ?? { offsetX: 0.5, offsetY: 0.5, zoom: 1 };
      cells[index] = { ...cur, ...patch };
      return { ...c, cells };
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = pointToCell(e.clientX, e.clientY);
    if (!hit) return;
    setSelected(hit.index);
    dragRef.current = { cell: hit.index, x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const r = geom.rects[drag.cell];
    if (!r) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const dCanvasX = ((e.clientX - drag.x) / rect.width) * geom.W;
    const dCanvasY = ((e.clientY - drag.y) / rect.height) * geom.H;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const cur = config.cells[drag.cell] ?? { offsetX: 0.5, offsetY: 0.5, zoom: 1 };
    updateCell(drag.cell, {
      offsetX: Math.max(0, Math.min(1, cur.offsetX - dCanvasX / r.w)),
      offsetY: Math.max(0, Math.min(1, cur.offsetY - dCanvasY / r.h)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const selectedCell = selected !== null ? config.cells[selected] : null;

  return (
    <div className="mode">
      <div className="mode-main">
        {assets.length === 0 ? (
          <div className="stage-empty">
            <DropZone onFiles={onAdd} />
            <div className="tips">
              <h3>拼图布局</h3>
              <ol>
                <li>添加 1–16 张图片，自动套用网格布局。</li>
                <li>点选某个格子后拖动可平移画面，用滑块缩放。</li>
                <li>在下方缩略图里点选两张可交换顺序。</li>
                <li>调整边距、圆角、间距与背景后导出。</li>
              </ol>
            </div>
          </div>
        ) : (
          <PreviewCanvas
            width={geom.W}
            height={geom.H}
            draw={drawPreview}
            canvasRef={canvasRef}
            canvasStyle={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => {
              if (selected !== null) updateCell(selected, { offsetX: 0.5, offsetY: 0.5, zoom: 1 });
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

        <Panel title="布局">
          <div className="layout-grid">
            {layouts.map((l, i) => (
              <button
                key={l.id}
                type="button"
                className={`layout-thumb ${i === Math.min(layoutIndex, layouts.length - 1) ? 'is-active' : ''}`}
                title={l.label}
                onClick={() => setLayoutIndex(i)}
              >
                {l.cells.map((c, ci) => (
                  <span
                    key={ci}
                    style={{
                      left: `${c.x * 100}%`,
                      top: `${c.y * 100}%`,
                      width: `${c.w * 100}%`,
                      height: `${c.h * 100}%`,
                    }}
                  />
                ))}
              </button>
            ))}
          </div>
          <div className="seg-row-label">画布比例</div>
          <Segmented
            size="sm"
            wrap
            value={config.ratio}
            options={[
              { value: '1:1', label: '1:1' },
              { value: '4:5', label: '4:5' },
              { value: '3:4', label: '3:4' },
              { value: '9:16', label: '9:16' },
              { value: '16:9', label: '16:9' },
              { value: '4:3', label: '4:3' },
              { value: '3:2', label: '3:2' },
              { value: 'original', label: '原始' },
            ]}
            onChange={(ratio) => setConfig((c) => ({ ...c, ratio: ratio as CollageConfig['ratio'] }))}
          />
          <div className="seg-row-label">输出长边</div>
          <Segmented
            size="sm"
            value={String(config.baseSize)}
            options={[
              { value: '1080', label: '1080' },
              { value: '1440', label: '1440' },
              { value: '2160', label: '2160' },
              { value: '2880', label: '2880' },
            ]}
            onChange={(v) => setConfig((c) => ({ ...c, baseSize: Number(v) }))}
          />
        </Panel>

        <Panel title="样式">
          <Slider
            label="间距"
            min={0}
            max={120}
            value={config.spacing}
            onChange={(spacing) => setConfig((c) => ({ ...c, spacing }))}
            format={(v) => `${v}px`}
          />
          <Slider
            label="外边距"
            min={0}
            max={160}
            value={config.margin}
            onChange={(margin) => setConfig((c) => ({ ...c, margin }))}
            format={(v) => `${v}px`}
          />
          <Slider
            label="圆角"
            min={0}
            max={120}
            value={config.radius}
            onChange={(radius) => setConfig((c) => ({ ...c, radius }))}
            format={(v) => `${v}px`}
          />
          <Toggle
            label="透明背景"
            checked={config.background === ''}
            onChange={(v) => setConfig((c) => ({ ...c, background: v ? '' : '#0e0f13' }))}
          />
          {config.background !== '' ? (
            <ColorField
              label="背景色"
              value={config.background}
              onChange={(background) => setConfig((c) => ({ ...c, background }))}
            />
          ) : null}
        </Panel>

        {selected !== null && selectedCell ? (
          <Panel title={`第 ${selected + 1} 张 · 调整`}>
            <Slider
              label="缩放"
              min={1}
              max={4}
              step={0.02}
              value={selectedCell.zoom}
              onChange={(zoom) => updateCell(selected, { zoom })}
              format={(v) => `${v.toFixed(2)}×`}
            />
            <Slider
              label="水平位置"
              min={0}
              max={1}
              step={0.01}
              value={selectedCell.offsetX}
              onChange={(offsetX) => updateCell(selected, { offsetX })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="垂直位置"
              min={0}
              max={1}
              step={0.01}
              value={selectedCell.offsetY}
              onChange={(offsetY) => updateCell(selected, { offsetY })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Button
              icon={<IconSparkle width={15} height={15} />}
              onClick={() => updateCell(selected, { offsetX: 0.5, offsetY: 0.5, zoom: 1 })}
            >
              重置这一格
            </Button>
          </Panel>
        ) : null}

        {assets.length > 1 ? (
          <Panel title="顺序" defaultOpen={false}>
            <p className="muted-note">在缩略图中点选两张即可交换；也可拖动排序。</p>
            <div className="order-actions">
              <Button
                icon={<IconSwap width={15} height={15} />}
                onClick={() => setConfig((c) => ({ ...c, cells: c.cells.slice().reverse() }))}
              >
                反转移换
              </Button>
            </div>
          </Panel>
        ) : null}

        {assets.length > 0 ? (
          <Panel title="导出">
            <ExportPanel
              getCanvas={(scale) => {
                const canvas = makeCanvas(geom.W * scale, geom.H * scale);
                const ctx = get2d(canvas);
                paintCollage(ctx, assets, config, geom, scale, null);
                return canvas;
              }}
              width={geom.W}
              height={geom.H}
              filenameBase="collage"
            />
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
