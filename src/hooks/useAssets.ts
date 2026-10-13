import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetItem } from '../types';
import { fileToAsset, releaseAsset } from '../core/imageUtils';

const MAX_IMAGES = 16;

export interface UseAssets {
  assets: AssetItem[];
  busy: boolean;
  error: string | null;
  addFiles: (files: FileList | File[] | null) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
  move: (from: number, to: number) => void;
  swap: (a: number, b: number) => void;
  replaceAll: (assets: AssetItem[]) => void;
}

export function useAssets(): UseAssets {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  useEffect(() => {
    return () => {
      assetsRef.current.forEach(releaseAsset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const loaded: AssetItem[] = [];
      for (const file of list) {
        try {
          // eslint-disable-next-line no-await-in-loop
          loaded.push(await fileToAsset(file));
        } catch (err) {
          setError(err instanceof Error ? err.message : '图片读取失败');
        }
      }
      setAssets((prev) => [...prev, ...loaded].slice(0, MAX_IMAGES));
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setAssets((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) releaseAsset(target);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAssets((prev) => {
      prev.forEach(releaseAsset);
      return [];
    });
  }, []);

  const move = useCallback((from: number, to: number) => {
    setAssets((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const swap = useCallback((a: number, b: number) => {
    setAssets((prev) => {
      if (a === b || a < 0 || b < 0 || a >= prev.length || b >= prev.length) return prev;
      const next = prev.slice();
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }, []);

  const replaceAll = useCallback((next: AssetItem[]) => {
    setAssets((prev) => {
      prev.forEach(releaseAsset);
      return next.slice(0, MAX_IMAGES);
    });
  }, []);

  return { assets, busy, error, addFiles, remove, clear, move, swap, replaceAll };
}
