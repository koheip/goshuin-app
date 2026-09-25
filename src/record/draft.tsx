import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { GoshuinKind, PlaceKind } from '@/db/types';
import { today } from '@/lib/dates';

export type DraftShrine = { id: string; name: string; kind: PlaceKind };

export type DraftGoshuin = {
  key: string;
  // 縮小・再圧縮済みの一時ファイル。保存時にドキュメントフォルダへ移す
  tempUri: string;
  kind: GoshuinKind;
  fee: string;
};

export type Draft = {
  shrine: DraftShrine | null;
  goshuin: DraftGoshuin[];
  visitedOn: string;
  weather: string | null;
  companions: string;
  omikuji: string;
  memo: string;
};

function emptyDraft(): Draft {
  return {
    shrine: null,
    goshuin: [],
    visitedOn: today(),
    weather: null,
    companions: '',
    omikuji: '',
    memo: '',
  };
}

type DraftContextValue = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  updateGoshuin: (key: string, patch: Partial<DraftGoshuin>) => void;
  reset: () => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

// 記録の3ステップの間だけ入力内容を保持する
export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const value = useMemo<DraftContextValue>(
    () => ({
      draft,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      updateGoshuin: (key, patch) =>
        setDraft((d) => ({
          ...d,
          goshuin: d.goshuin.map((g) => (g.key === key ? { ...g, ...patch } : g)),
        })),
      reset: () => setDraft(emptyDraft()),
    }),
    [draft],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft は DraftProvider の内側で使ってください');
  return ctx;
}
