import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flushSync } from 'react-dom';
import { Icon } from './Icon';
import { SCHEMES, useUi, type Mode, type MotionPref, type SchemeId } from '../store/ui';
import { cx } from './ui';

function systemDark() {
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}

/** Keeps <html data-scheme/data-theme/data-motion> in sync with the store and the OS. */
export function ThemeSync() {
  const { scheme, mode, motion: m } = useUi();
  const [sysDark, setSysDark] = useState(systemDark);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setSysDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.scheme = scheme;
    el.dataset.theme = mode === 'dark' || (mode === 'system' && sysDark) ? 'dark' : 'light';
    if (m === 'system') delete el.dataset.motion;
    else el.dataset.motion = m;
  }, [scheme, mode, sysDark, m]);
  return null;
}

/** Runs a state change inside a View Transition that reveals the new theme as a growing circle. */
function withReveal(e: React.MouseEvent, change: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduced = document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduced) { change(); return; }
  const x = e.clientX, y = e.clientY;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = doc.startViewTransition(() => flushSync(change));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

export function ThemeButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <motion.button
        whileHover={{ rotate: 20 }}
        whileTap={{ scale: 0.9 }}
        className="btn !px-2.5"
        aria-label="Colour scheme and display settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="palette" />
      </motion.button>
      <AnimatePresence>{open && <ThemePanel onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function ThemePanel({ onClose }: { onClose: () => void }) {
  const { scheme, mode, motion: m, setScheme, setMode, setMotion } = useUi();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label="Appearance"
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="card fixed right-3 top-16 z-50 w-[min(92vw,380px)] origin-top-right p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Appearance</h3>
          <button className="text-muted hover:text-ink" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Colour scheme</div>
        <div className="mb-4 grid grid-cols-1 gap-1.5">
          {SCHEMES.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={(e) => withReveal(e, () => setScheme(s.id as SchemeId))}
              className={cx('flex items-center gap-3 rounded-xl border p-2 text-left transition', scheme === s.id ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2')}
              aria-pressed={scheme === s.id}
            >
              <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line">
                <span className="h-full w-1/2" style={{ background: s.swatch[0] }} />
                <span className="h-full w-1/2" style={{ background: s.swatch[1] }} />
                <span className="absolute inset-[30%] rounded-full" style={{ background: s.swatch[2] }} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.blurb}</span>
              </span>
              {scheme === s.id && <Icon name="check" className="ml-auto text-accent" />}
            </motion.button>
          ))}
        </div>
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Mode</div>
        <Segmented<Mode>
          value={mode}
          options={[{ v: 'light', l: 'Light', i: 'sun' }, { v: 'dark', l: 'Dark', i: 'moon' }, { v: 'system', l: 'System', i: 'layers' }]}
          onPick={(v, e) => withReveal(e, () => setMode(v))}
        />
        <div className="mb-1 mt-4 text-xs font-bold uppercase tracking-widest text-muted">Motion</div>
        <Segmented<MotionPref>
          value={m}
          options={[{ v: 'full', l: 'Full', i: 'sparkles' }, { v: 'reduced', l: 'Reduced', i: 'pause' }, { v: 'system', l: 'System', i: 'layers' }]}
          onPick={(v) => setMotion(v)}
        />
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Set in <b className="text-ink-2">Avenir Next</b> where installed (macOS, iOS), with Nunito Sans as the open fallback.
        </p>
      </motion.div>
    </>
  );
}

function Segmented<T extends string>({ value, options, onPick }: { value: T; options: { v: T; l: string; i: Parameters<typeof Icon>[0]['name'] }[]; onPick: (v: T, e: React.MouseEvent) => void }) {
  return (
    <div className="flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.v} onClick={(e) => onPick(o.v, e)} className={cx('relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold', value === o.v ? 'text-accent-ink' : 'text-ink-2')} aria-pressed={value === o.v}>
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join()}`} className="absolute inset-0 rounded-lg bg-accent" />}
          <span className="relative flex items-center gap-1.5"><Icon name={o.i} size={14} /> {o.l}</span>
        </button>
      ))}
    </div>
  );
}
