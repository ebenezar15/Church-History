import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { EntityType } from '../data/schema';

export type Mode = 'light' | 'dark' | 'system';
export type MotionPref = 'full' | 'reduced' | 'system';
export const SCHEMES = [
  { id: 'parchment', name: 'Parchment & Ink', blurb: 'Cream vellum by day, ink-navy by night, gold leaf throughout', swatch: ['#f5eedf', '#0c1424', '#d9ad55'] },
  { id: 'byzantine', name: 'Byzantine', blurb: 'Imperial purple and mosaic gold', swatch: ['#f3eef6', '#120a1c', '#e4b84c'] },
  { id: 'lapis', name: 'Lapis', blurb: 'Ultramarine of illuminated skies', swatch: ['#edf1f8', '#070e20', '#7fa8f5'] },
  { id: 'iona', name: 'Iona', blurb: 'Celtic green and island stone', swatch: ['#edf2ea', '#0a1510', '#74c995'] },
  { id: 'rose', name: 'Rose Window', blurb: 'Stained-glass crimson and cobalt', swatch: ['#faf0ee', '#170a0d', '#f0727c'] },
  { id: 'desert', name: 'Desert Fathers', blurb: 'Coptic terracotta and Nile teal', swatch: ['#f7ede2', '#170f0a', '#ec9663'] },
  { id: 'monastic', name: 'Monastic', blurb: 'Quiet stone, oak and candlelight', swatch: ['#f1f0ec', '#121211', '#cdb68a'] },
] as const;
export type SchemeId = (typeof SCHEMES)[number]['id'];

export interface CompareItem { type: 'tradition' | 'position'; id: string }
export interface Bookmark { type: EntityType; id: string; label: string; note: string; at: number }

interface UiState {
  scheme: SchemeId;
  mode: Mode;
  motion: MotionPref;
  compare: CompareItem[];
  bookmarks: Bookmark[];
  quizScores: Record<string, number>;
  setScheme: (s: SchemeId) => void;
  setMode: (m: Mode) => void;
  setMotion: (m: MotionPref) => void;
  toggleCompare: (item: CompareItem) => void;
  clearCompare: () => void;
  toggleBookmark: (b: Omit<Bookmark, 'note' | 'at'>) => void;
  setNote: (type: EntityType, id: string, note: string) => void;
  setQuizScore: (pathId: string, score: number) => void;
}

/** localStorage can be missing or throw (private mode, blocked storage); never let that break the app. */
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const MAX_COMPARE = 4;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      scheme: 'parchment',
      mode: 'system',
      motion: 'system',
      compare: [],
      bookmarks: [],
      quizScores: {},
      setScheme: (scheme) => set({ scheme }),
      setMode: (mode) => set({ mode }),
      setMotion: (motion) => set({ motion }),
      toggleCompare: (item) =>
        set((s) => {
          const has = s.compare.some((c) => c.type === item.type && c.id === item.id);
          if (has) return { compare: s.compare.filter((c) => !(c.type === item.type && c.id === item.id)) };
          if (s.compare.length >= MAX_COMPARE) return { compare: [...s.compare.slice(1), item] };
          return { compare: [...s.compare, item] };
        }),
      clearCompare: () => set({ compare: [] }),
      toggleBookmark: (b) =>
        set((s) => {
          const has = s.bookmarks.some((x) => x.type === b.type && x.id === b.id);
          return {
            bookmarks: has
              ? s.bookmarks.filter((x) => !(x.type === b.type && x.id === b.id))
              : [{ ...b, note: '', at: Date.now() }, ...s.bookmarks],
          };
        }),
      setNote: (type, id, note) =>
        set((s) => ({ bookmarks: s.bookmarks.map((x) => (x.type === type && x.id === id ? { ...x, note } : x)) })),
      setQuizScore: (pathId, score) => set((s) => ({ quizScores: { ...s.quizScores, [pathId]: Math.max(score, s.quizScores[pathId] ?? 0) } })),
    }),
    { name: 'ecclesia-ui', storage: createJSONStorage(() => safeStorage), version: 1 },
  ),
);
