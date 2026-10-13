import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetItem, Axis, PerImageStitch, Strategy, StitchParams } from '../types';
import { analyzeStitch, autoDetectBars, buildGeometry, composeStitch, paintStitch } from '../core/stitch';
import type { MatchResult } from '../core/matching';
import { AssetTray } from '../components/AssetTray';
import { DropZone } from '../components/DropZone';
import { ExportPanel } from '../components/ExportPanel';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { Button, ColorField, Panel, Segmented, Slider, Toggle } from '../components/ui';
import {
  IconArrowDownUp,
  IconArrowLeftRight,
  IconCrop,
  IconLayers,
  IconSparkle,
  IconStack,
  IconWand,
} from '../components/Icons';

const BASE_PARAMS: StitchParams = {
  axis: 'y',
  strategy: 'crop',
  diffMode: true,
  transition: 64,
  fixedTop: 0,
  fixedBottom: 0,
  gap: 0,
  background: '',
  offsets: [],
  subtitleHeight: 0,
  perImage: [],
};

const STRATEGY_OPTIONS: { value: Strategy; label: string; hint: string }[] = [
  { value: 'crop', label: '无缝裁剪', hint: '计算交叉部分并裁掉，拼成长截图（推荐）' },
  { value: 'blend', label: '过渡混合', hint: '保留少量重叠并做渐变过渡，掩盖色差' },
  { value: 'subtitle', label: '字幕堆叠', hint: '首张完整，后续只保留底部字幕条，堆叠成字幕长图' },
  { value: 'concat', label: '简单串联', hint: '不做分析，直接依次排列' },
];

const STRATEGY_ICON: Record<Strategy, React.ReactNode> = {
  crop: <IconCrop width={16} height={16} />,
  blend: <IconWand width={16} height={16} />,
  subtitle: <IconLayers width={16} height={16} />,
  concat: <IconStack width={16} height={16} />,
};

function defaultPerImage(index: number): PerImageStitch {
  return { mode: index === 0 ? 'full' : 'strip', height: 0, trimTop: 0, trimBottom: 0 };
}

export function ScreenshotMode({
  assets,
  onAdd,
  onRemove,
  onMove,
}: {
  assets: AssetItem[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [params, setParams] = useState<StitchParams>(BASE_PARAMS);
  const [autoOffsets, setAutoOffsets] = useState<number[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeToken, setAnalyzeToken] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ index: number; startY: number; startX: number; base: number } | null>(null);

  const { axis, strategy, diffMode, fixedTop, fixedBottom } = params;
  const needsAnalysis = strategy === 'crop' || strategy === 'blend';

  const lenOf = (a: AssetItem) => (axis === 'y' ? a.height : a.width);

  // Keep per-image subtitle config aligned with the asset list.
  useEffect(() => {
    if (strategy !== 'subtitle' || assets.length === 0) return;
    setParams((p) => {
      const perImage = assets.map((_, i) => p.perImage[i] ?? defaultPerImage(i));
      const subtitleHeight =
        p.subtitleHeight > 0 ? p.subtitleHeight : Math.max(1, Math.round(lenOf(assets[0]) * 0.15));
      return { ...p, perImage, subtitleHeight };
    });
    setSelected((s) => (s !== null && s >= assets.length ? null : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, axis, strategy]);

  // Analyze scroll offsets whenever the inputs change.
  useEffect(() => {
    let cancelled = false;
    if (assets.length < 2 || !needsAnalysis) {
      setParams((p) => ({ ...p, offsets: new Array(Math.max(0, assets.length - 1)).fill(0) }));
      setAutoOffsets([]);
      setMatches([]);
      setAnalyzed(!needsAnalysis);
      setProgress(null);
      return;
    }
    setProgress({ done: 0, total: assets.length - 1 });
    analyzeStitch(assets, params, (done, total) => {
      if (!cancelled) setProgress({ done, total });
    })
      .then((res) => {
        if (cancelled) return;
        setParams((p) => ({ ...p, offsets: res.offsets }));
        setAutoOffsets(res.offsets);
        setMatches(res.matches);
        setAnalyzed(true);
        setProgress(null);
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, axis, strategy, diffMode, fixedTop, fixedBottom, analyzeToken]);

  const geometry = useMemo(() => buildGeometry(assets, params), [assets, params]);

  const drawPreview = (ctx: CanvasRenderingContext2D, scale: number) => {
    paintStitch(ctx, geometry, params, scale);
    if (selected !== null && geometry.placements[selected]) {
      const pl = geometry.placements[selected];
      ctx.save();
      ctx.strokeStyle = '#5b8cff';
      ctx.lineWidth = Math.max(1.5, 2 / scale);
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.strokeRect(pl.dx, pl.dy, pl.dw, pl.dh);
      ctx.restore();
    }
  };

  const busy = progress !== null;
  const canExport = assets.length > 0 && !busy;

  const updateOffset = (index: number, value: number) => {
    setParams((p) => {
      const offsets = p.offsets.slice();
      offsets[index] = value;
      return { ...p, offsets };
    });
  };

  const patchPerImage = (index: number, patch: Partial<PerImageStitch>) => {
    setParams((p) => {
      const perImage = assets.map((_, i) => p.perImage[i] ?? defaultPerImage(i));
      perImage[index] = { ...perImage[index], ...patch };
      return { ...p, perImage };
    });
  };

  const applyPreset = (kind: 'first-full' | 'all-strip' | 'all-full') => {
    setParams((p) => ({
      ...p,
      perImage: assets.map((_, i) => ({
        ...(p.perImage[i] ?? defaultPerImage(i)),
        mode: kind === 'all-full' ? 'full' : kind === 'all-strip' ? 'strip' : i === 0 ? 'full' : 'strip',
      })),
    }));
  };

  const canvasToContent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * geometry.width,
      y: ((clientY - rect.top) / rect.height) * geometry.height,
    };
  };

  const hitPlacement = (x: number, y: number): number | null => {
    for (let i = geometry.placements.length - 1; i >= 0; i -= 1) {
      const pl = geometry.placements[i];
      if (x >= pl.dx && x <= pl.dx + pl.dw && y >= pl.dy && y <= pl.dy + pl.dh) return i;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (strategy !== 'subtitle') return;
    const pt = canvasToContent(e.clientX, e.clientY);
    if (!pt) return;
    const index = hitPlacement(pt.x, pt.y);
    setSelected(index);
    if (index === null) return;
    const cfg = params.perImage[index] ?? defaultPerImage(index);
    const available =
      lenOf(assets[index]) -
      (cfg.trimTop || 0) -
      (cfg.trimBottom || 0);
    const base =
      cfg.height > 0 ? cfg.height : params.subtitleHeight > 0 ? params.subtitleHeight : Math.round(available * 0.15);
    dragRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      base: Math.max(1, Math.min(available, base)),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cfg = params.perImage[drag.index] ?? defaultPerImage(drag.index);
    const available = lenOf(assets[drag.index]) - (cfg.trimTop || 0) - (cfg.trimBottom || 0);
    const deltaAxis =
      axis === 'y'
        ? ((e.clientY - drag.startY) / rect.height) * geometry.height
        : ((e.clientX - drag.startX) / rect.width) * geometry.width;
    // Dragging toward the start of the axis lengthens the strip.
    const next = Math.max(1, Math.min(available, Math.round(drag.base - deltaAxis)));
    patchPerImage(drag.index, { height: next, mode: 'strip' });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const selectedCfg = selected !== null ? params.perImage[selected] ?? defaultPerImage(selected) : null;

  return (
    <div className="mode">
      <div className="mode-main">
        {assets.length === 0 ? (
          <div className="stage-empty">
            <DropZone onFiles={onAdd} />
            <div className="tips">
              <h3>怎么用</h3>
              <ol>
                <li>添加或粘贴多张图片（支持多选 / 拖拽 / 粘贴）。</li>
                <li><b>长截图</b>：多张有重叠的滚动截图 → 选「无缝裁剪」，自动算出交叉部分拼成长图。</li>
                <li><b>字幕拼接</b>：影视截图 → 选「字幕堆叠」，首张完整，其余只保留底部字幕条。</li>
                <li>在预览里点选一张图片即可单独调整它的字幕高度 / 裁切区域。</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="stage-wrap">
            <PreviewCanvas
              width={geometry.width}
              height={geometry.height}
              draw={drawPreview}
              canvasRef={canvasRef}
              canvasStyle={strategy === 'subtitle' ? { touchAction: 'none', cursor: 'grab' } : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
            {busy ? (
              <div className="stage-overlay">
                <span className="spinner" />
                计算中 {progress ? `${progress.done}/${progress.total}` : ''}…
              </div>
            ) : null}
          </div>
        )}
      </div>

      <aside className="mode-side">
        <AssetTray assets={assets} onAdd={onAdd} onRemove={onRemove} onMove={onMove} />

        <Panel
          title="拼接方式"
          actions={
            needsAnalysis ? (
              <Button
                variant="ghost"
                icon={<IconSparkle width={15} height={15} />}
                disabled={assets.length < 2 || busy}
                onClick={() => setAnalyzeToken((t) => t + 1)}
              >
                重新分析
              </Button>
            ) : null
          }
        >
          <Segmented
            wrap
            value={strategy}
            options={STRATEGY_OPTIONS.map((s) => ({
              value: s.value,
              label: s.label,
              hint: s.hint,
              icon: STRATEGY_ICON[s.value],
            }))}
            onChange={(v) => setParams((p) => ({ ...p, strategy: v as Strategy }))}
          />
          <p className="muted-note">{STRATEGY_OPTIONS.find((s) => s.value === strategy)?.hint}</p>

          <div className="seg-row-label">方向</div>
          <Segmented
            value={axis}
            options={[
              { value: 'y', label: '纵向', icon: <IconArrowDownUp width={16} height={16} /> },
              { value: 'x', label: '横向', icon: <IconArrowLeftRight width={16} height={16} /> },
            ]}
            onChange={(v) => setParams((p) => ({ ...p, axis: v as Axis }))}
          />

          {(strategy === 'concat' || strategy === 'subtitle') ? (
            <Slider
              label="间距"
              min={0}
              max={120}
              value={params.gap}
              onChange={(gap) => setParams((p) => ({ ...p, gap }))}
              format={(v) => `${v}px`}
            />
          ) : null}

          {needsAnalysis ? (
            <Toggle
              label="差值模式"
              hint="忽略跨图完全相同的区域（状态栏 / 贴顶横幅等静态内容），只按滚动内容对齐"
              checked={diffMode}
              onChange={(v) => setParams((p) => ({ ...p, diffMode: v }))}
            />
          ) : null}

          {strategy === 'blend' ? (
            <Slider
              label="过渡宽度"
              min={0}
              max={400}
              step={4}
              value={params.transition}
              onChange={(transition) => setParams((p) => ({ ...p, transition }))}
              format={(v) => `${v}px`}
            />
          ) : null}
        </Panel>

        {strategy === 'subtitle' ? (
          assets.length === 0 ? (
            <Panel title="字幕堆叠">
              <p className="muted-note">
                还没有图片。先添加截图：<b>首张显示完整画面</b>，之后的每张只保留底部字幕条，堆叠成字幕长图。
              </p>
            </Panel>
          ) : (
          <>
            <Panel title="字幕堆叠">
              <div className="preset-row">
                <Button onClick={() => applyPreset('first-full')}>首张完整</Button>
                <Button onClick={() => applyPreset('all-strip')}>全部字幕</Button>
                <Button onClick={() => applyPreset('all-full')}>全部完整</Button>
              </div>
              <Slider
                label="字幕条默认高度"
                min={1}
                max={Math.max(1, Math.round(Math.min(...assets.map((a) => lenOf(a))) * 0.6))}
                value={params.subtitleHeight}
                onChange={(subtitleHeight) =>
                  setParams((p) => ({
                    ...p,
                    subtitleHeight,
                    perImage: assets.map((_, i) => ({ ...(p.perImage[i] ?? defaultPerImage(i)), height: 0 })),
                  }))
                }
                format={(v) => `${v}px ≈ ${Math.round((v / lenOf(assets[0])) * 100)}%`}
              />
              <p className="muted-note">
                默认 15% 高度。首张显示完整画面，之后每张只保留底部字幕条 —— 这就是字幕截图的长图效果。
              </p>
            </Panel>

            <Panel title={`单张调整（${assets.length} 张）`} defaultOpen={assets.length <= 4}>
              {assets.map((asset, i) => {
                const cfg = params.perImage[i] ?? defaultPerImage(i);
                const available = lenOf(asset) - (cfg.trimTop || 0) - (cfg.trimBottom || 0);
                const effective = cfg.height > 0 ? cfg.height : Math.min(available, params.subtitleHeight);
                return (
                  <div key={asset.id} className={`img-row ${selected === i ? 'is-selected' : ''}`} onClick={() => setSelected(i)}>
                    <div className="img-row-head">
                      <span className="img-row-title">
                        <span className="img-row-index">{i + 1}</span>
                        {cfg.mode === 'full' ? '完整画面' : '仅字幕条'}
                      </span>
                      <Segmented
                        size="sm"
                        value={cfg.mode}
                        options={[
                          { value: 'full', label: '完整' },
                          { value: 'strip', label: '字幕' },
                        ]}
                        onChange={(mode) => patchPerImage(i, { mode: mode as 'full' | 'strip' })}
                      />
                    </div>
                    {cfg.mode === 'strip' ? (
                      <Slider
                        label="字幕条高度"
                        min={1}
                        max={Math.max(1, available)}
                        value={effective}
                        onChange={(height) => patchPerImage(i, { height })}
                        format={(v) => `${v}px`}
                      />
                    ) : null}
                    <div className="two-col">
                      <Slider
                        label="裁上"
                        min={0}
                        max={Math.max(1, Math.round(lenOf(asset) * 0.5))}
                        value={cfg.trimTop}
                        onChange={(trimTop) => patchPerImage(i, { trimTop })}
                        format={(v) => `${v}px`}
                      />
                      <Slider
                        label="裁下"
                        min={0}
                        max={Math.max(1, Math.round(lenOf(asset) * 0.5))}
                        value={cfg.trimBottom}
                        onChange={(trimBottom) => patchPerImage(i, { trimBottom })}
                        format={(v) => `${v}px`}
                      />
                    </div>
                    <button
                      type="button"
                      className="link"
                      onClick={() => patchPerImage(i, { height: 0, trimTop: 0, trimBottom: 0 })}
                    >
                      重置这一张
                    </button>
                  </div>
                );
              })}
            </Panel>

            {selected !== null && selectedCfg ? (
              <Panel title={`已选中第 ${selected + 1} 张`}>
                <p className="muted-note">在预览里上下拖动这张图片，即可直接拉长 / 缩短字幕条。</p>
                <Button onClick={() => setSelected(null)}>取消选中</Button>
              </Panel>
            ) : null}
          </>
          )
        ) : null}

        {needsAnalysis && assets.length > 1 ? (
          <Panel title="分段偏移" defaultOpen={false}>
            {matches.length === 0 && !busy ? <p className="muted-note">尚未分析。</p> : null}
            {Array.from({ length: assets.length - 1 }).map((_, i) => {
              const aLen = lenOf(assets[i]);
              const bLen = lenOf(assets[i + 1]);
              const maxOff = Math.max(1, Math.min(aLen, bLen) - 1);
              const value = Math.min(maxOff, Math.max(0, params.offsets[i] ?? 0));
              const overlap = Math.max(0, Math.min(aLen, bLen) - value);
              const overlapPct = Math.round((overlap / Math.min(aLen, bLen)) * 100);
              const m = matches[i];
              return (
                <div key={i} className="pair">
                  <div className="pair-head">
                    <span className="pair-title">
                      {i + 1} → {i + 2}
                    </span>
                    <span className="pair-meta">
                      重叠 {overlapPct}%
                      {m ? (
                        <span
                          className={`conf-dot ${
                            m.confidence > 0.6 ? 'is-good' : m.confidence > 0.3 ? 'is-ok' : 'is-bad'
                          }`}
                          title={`匹配置信度 ${(m.confidence * 100).toFixed(0)}%`}
                        />
                      ) : null}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxOff}
                    value={value}
                    onChange={(e) => updateOffset(i, Number(e.target.value))}
                  />
                  <div className="pair-foot">
                    <span className="mono">{value}px</span>
                    <button
                      type="button"
                      className="link"
                      disabled={autoOffsets[i] == null}
                      onClick={() => updateOffset(i, autoOffsets[i] ?? value)}
                    >
                      重置为自动
                    </button>
                  </div>
                </div>
              );
            })}
          </Panel>
        ) : null}

        {needsAnalysis && assets.length > 1 ? (
          <Panel title="固定栏（高级）" defaultOpen={false}>
            <p className="muted-note">
              每张都相同、只需要保留一次的贴顶 / 贴底区域（状态栏、标题栏、导航栏）。如果是每张都变化的<b>字幕</b>，请改用「字幕堆叠」。
            </p>
            <Slider
              label="顶部固定栏"
              min={0}
              max={Math.max(1, Math.round(Math.min(...assets.map((a) => lenOf(a))) * 0.4))}
              value={fixedTop}
              onChange={(v) => setParams((p) => ({ ...p, fixedTop: v }))}
              format={(v) => `${v}px`}
            />
            <Slider
              label="底部固定栏"
              min={0}
              max={Math.max(1, Math.round(Math.min(...assets.map((a) => lenOf(a))) * 0.4))}
              value={fixedBottom}
              onChange={(v) => setParams((p) => ({ ...p, fixedBottom: v }))}
              format={(v) => `${v}px`}
            />
            <Button
              icon={<IconWand width={15} height={15} />}
              disabled={assets.length < 2}
              onClick={() => {
                const bars = autoDetectBars(assets, axis);
                setParams((p) => ({ ...p, fixedTop: bars.top, fixedBottom: bars.bottom }));
              }}
            >
              自动检测固定栏
            </Button>
          </Panel>
        ) : null}

        <Panel title="画布" defaultOpen={false}>
          <Toggle
            label="透明背景"
            checked={params.background === ''}
            onChange={(v) => setParams((p) => ({ ...p, background: v ? '' : '#ffffff' }))}
          />
          {params.background !== '' ? (
            <ColorField
              label="背景色"
              value={params.background}
              onChange={(background) => setParams((p) => ({ ...p, background }))}
            />
          ) : null}
          {geometry.placements.length > 0 ? (
            <p className="muted-note">
              画布 {geometry.width}×{geometry.height} px · {assets.length} 张
            </p>
          ) : null}
        </Panel>

        {assets.length > 0 ? (
          <Panel title="导出">
            <ExportPanel
              getCanvas={(scale) => composeStitch(geometry, params, scale)}
              width={geometry.width}
              height={geometry.height}
              filenameBase={strategy === 'subtitle' ? 'subtitle-stack' : 'stitch'}
              disabled={!canExport || (needsAnalysis && !analyzed)}
            />
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
