import { useRef, useState } from 'react';
import type { AssetItem } from '../types';
import { IconPlus, IconTrash, IconSwap } from './Icons';

export function AssetTray({
  assets,
  onAdd,
  onRemove,
  onMove,
  selectable = false,
  selectedIndex = null,
  onSelect,
  onSwap,
}: {
  assets: AssetItem[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  selectable?: boolean;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  onSwap?: (a: number, b: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div className="tray">
      <div className="tray-scroll">
        <button type="button" className="tray-add" onClick={() => inputRef.current?.click()}>
          <IconPlus width={18} height={18} />
          <span>添加</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onAdd(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className={`tray-item ${dragOver === index ? 'is-target' : ''} ${
              selectedIndex === index ? 'is-selected' : ''
            }`}
            draggable
            onClick={() => {
              if (!selectable) return;
              onSelect?.(selectedIndex === index ? null : index);
            }}
            onDragStart={() => {
              dragFrom.current = index;
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(index);
            }}
            onDragLeave={() => setDragOver((v) => (v === index ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const from = dragFrom.current;
              dragFrom.current = null;
              if (from == null || from === index) return;
              if (selectable && onSwap) onSwap(from, index);
              else onMove(from, index);
            }}
            onDragEnd={() => {
              dragFrom.current = null;
              setDragOver(null);
            }}
          >
            <img src={asset.url} alt={asset.name} draggable={false} />
            <span className="tray-index">{index + 1}</span>
            <button
              type="button"
              className="tray-remove"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(asset.id);
              }}
            >
              <IconTrash width={14} height={14} />
            </button>
            {selectable && selectedIndex === index ? (
              <span className="tray-swap-badge">
                <IconSwap width={12} height={12} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {selectable ? (
        <p className="tray-hint">
          {selectedIndex === null ? '点选一张图片，再点另一张可交换位置' : '再点一张即可交换位置'}
        </p>
      ) : (
        <p className="tray-hint">拖动缩略图可调整顺序</p>
      )}
    </div>
  );
}
