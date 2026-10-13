import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function DropZone({
  onFiles,
  children,
  className = '',
  compact = false,
}: {
  onFiles: (files: FileList | File[] | null) => void;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''} ${className}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
      {children ?? (
        <div className="dropzone-inner">
          <span className="dropzone-emoji">🖼️</span>
          <strong>点击或拖拽图片到这里</strong>
          <span className="dropzone-sub">支持多选 / 粘贴 / 1–16 张 · 全部本地处理</span>
        </div>
      )}
    </div>
  );
}
