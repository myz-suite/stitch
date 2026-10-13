import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

export interface PreviewCanvasProps {
  /** Natural size of the generated image, in px. */
  width: number;
  height: number;
  /** Paint the image into `ctx` at `scale` (image px -> backing px). */
  draw: (ctx: CanvasRenderingContext2D, scale: number) => void;
  canvasRef?: RefObject<HTMLCanvasElement>;
  onPointerDown?: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel?: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onDoubleClick?: () => void;
  canvasStyle?: React.CSSProperties;
  /** Extra class on the fixed-height viewport. */
  stageClassName?: string;
  empty?: boolean;
}

const MAX_BACKING_EDGE = 16000;
/** Never blow a tiny image up more than this on "fit" (keeps it honest and crisp). */
const MAX_FIT_UPSCALE = 3;

/**
 * A fixed-height preview viewport. The generated image is *contain*-fitted inside it
 * (so the layout never jumps and the whole result is always visible), with a
 * 适应 / 1:1 toggle for inspecting at native pixel size.
 */
export function PreviewCanvas({
  width,
  height,
  draw,
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
  canvasStyle,
  stageClassName = '',
  empty = false,
}: PreviewCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [fit, setFit] = useState(true);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setBox({ w: Math.max(1, w), h: Math.max(1, h) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewScale = useMemo(() => {
    if (!box.w || !box.h || width <= 0 || height <= 0) return 0;
    if (!fit) return 1;
    return Math.min(box.w / width, box.h / height, MAX_FIT_UPSCALE);
  }, [box, width, height, fit]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || viewScale <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let backing = viewScale * dpr;
    const longest = Math.max(width, height);
    if (longest * backing > MAX_BACKING_EDGE) backing = MAX_BACKING_EDGE / longest;
    const bw = Math.max(1, Math.round(width * backing));
    const bh = Math.max(1, Math.round(height * backing));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    canvas.style.width = `${(width * viewScale).toFixed(2)}px`;
    canvas.style.height = `${(height * viewScale).toFixed(2)}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    draw(ctx, backing);
    // `draw` is intentionally re-run every render; painting is idempotent.
  }, [width, height, viewScale, draw, ref]);

  const scaled = viewScale > 0;
  const pct = Math.round(viewScale * 100);

  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="preview-dims">
          {width}×{height} px
          {scaled ? <em className="preview-zoom-pct">{pct}%</em> : null}
        </span>
        <div className="preview-zoom">
          <button
            type="button"
            className={`stage-tool ${fit ? 'is-active' : ''}`}
            onClick={() => setFit(true)}
          >
            适应
          </button>
          <button
            type="button"
            className={`stage-tool ${!fit ? 'is-active' : ''}`}
            onClick={() => setFit(false)}
          >
            1:1
          </button>
        </div>
      </div>
      <div className={`stage ${stageClassName}`} ref={stageRef}>
        {empty ? (
          <div className="stage-blank">还没有内容</div>
        ) : (
          <div
            className="stage-view"
            style={
              scaled
                ? { width: width * viewScale, height: height * viewScale }
                : undefined
            }
          >
            <canvas
              ref={ref}
              className="stage-canvas"
              style={canvasStyle}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onDoubleClick={onDoubleClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
