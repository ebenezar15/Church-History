import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { ThemeButton } from './Theme';
import { SearchPalette, useSearchHotkey } from './Search';
import { useUi } from '../store/ui';
import { useAtlas, labelFor } from '../data/db';
import { cx } from './ui';

export const NAV: { to: string; label: string; icon: IconName; group: string }[] = [
  { to: '/', label: 'River of Time', icon: 'water', group: 'Explore' },
  { to: '/timeline', label: 'Master Timeline', icon: 'timeline', group: 'Explore' },
  { to: '/eras', label: 'Eras & Life', icon: 'hourglass', group: 'Explore' },
  { to: '/map', label: 'World Map', icon: 'map', group: 'Explore' },
  { to: '/traditions', label: 'Family Tree', icon: 'tree', group: 'Explore' },
  { to: '/doctrines', label: 'Doctrines', icon: 'trinity', group: 'Think' },
  { to: '/debates', label: 'Debate Arena', icon: 'scales', group: 'Think' },
  { to: '/compare', label: 'Compare', icon: 'layers', group: 'Think' },
  { to: '/compare/featured/legal-vs-union-gospel', label: 'Legal vs Union', icon: 'cross', group: 'Think' },
  { to: '/people', label: 'People', icon: 'people', group: 'Read' },
  { to: '/library', label: 'Library', icon: 'book', group: 'Read' },
  { to: '/quotes', label: 'Quote Wall', icon: 'quote', group: 'Read' },
  { to: '/experiences', label: 'Experiences', icon: 'sparkles', group: 'Read' },
  { to: '/paths', label: 'Study Paths', icon: 'compass', group: 'Learn' },
  { to: '/saved', label: 'Saved & Notes', icon: 'bookmark', group: 'Learn' },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const groups = [...new Set(NAV.map((n) => n.group))];
  const savedCount = useUi((s) => s.bookmarks.length);
  return (
    <nav aria-label="Main" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{g}</div>
          <ul className="space-y-0.5">
            {NAV.filter((n) => n.group === g).map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === '/' || n.to === '/compare'}
                  onClick={onNavigate}
                  className={({ isActive }) => cx('group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors', isActive ? 'text-accent' : 'text-ink-2 hover:text-ink')}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-surface-2 ring-1 ring-line" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                      <motion.span className="relative" whileHover={{ scale: 1.2, rotate: -8 }}>
                        <Icon name={n.icon} />
                      </motion.span>
                      <span className="relative">{n.label}</span>
                      {n.to === '/saved' && savedCount > 0 && <span className="relative ml-auto rounded-full bg-accent px-1.5 text-[10px] text-accent-ink">{savedCount}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Ecclesia Atlas home">
      <motion.svg width="34" height="34" viewBox="0 0 64 64" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
        <rect width="64" height="64" rx="16" fill="var(--accent)" />
        <motion.path d="M32 12v40M21 25h22" stroke="var(--accent-ink)" strokeWidth="5.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.3 }} />
        <motion.circle cx="32" cy="25" r="13" fill="none" stroke="var(--accent-ink)" strokeWidth="2" opacity=".55" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.6 }} />
      </motion.svg>
      <span className="leading-none">
        <span className="block text-[17px] font-bold tracking-tight">Ecclesia Atlas</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">AD 30 — today</span>
      </span>
    </Link>
  );
}

function CompareTray() {
  const a = useAtlas();
  const { compare, toggleCompare, clearCompare } = useUi();
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname === '/compare') return null;
  return (
    <AnimatePresence>
      {compare.length > 0 && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="card fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-3 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
          role="region"
          aria-label="Compare tray"
        >
          <Icon name="layers" className="text-accent" />
          <AnimatePresence initial={false}>
            {compare.map((c) => (
              <motion.button layout key={c.type + c.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="chip hover:border-bad" onClick={() => toggleCompare(c)} title="Remove">
                {labelFor(a, c.type, c.id)} <Icon name="close" size={11} />
              </motion.button>
            ))}
          </AnimatePresence>
          <div className="ml-auto flex gap-2">
            <button className="btn !py-1.5" onClick={clearCompare}>Clear</button>
            <button className="btn btn-primary !py-1.5" onClick={() => nav('/compare')} disabled={compare.length < 2}>
              Compare {compare.length} <Icon name="arrow" size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-accent via-gold to-accent-2" style={{ scaleX: x }} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <motion.div className="text-accent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}>
        <Icon name="coptic-cross" size={40} />
      </motion.div>
    </div>
  );
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  useSearchHotkey(setSearchOpen);
  useEffect(() => { window.scrollTo({ top: 0 }); setMenuOpen(false); }, [loc.pathname]);
  const isHome = loc.pathname === '/';

  return (
    <div className="paper-grain min-h-screen">
      <ScrollProgress />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">Skip to content</a>

      <aside className="scrollbar-thin fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-line bg-bg/80 px-3 py-5 backdrop-blur-xl lg:block">
        <div className="mb-6 px-2"><Logo /></div>
        <NavList />
        <p className="mt-8 px-3 text-[11px] leading-relaxed text-muted">A fair-minded historian’s atlas. No tradition is declared “correct”; each speaks for itself first.</p>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl lg:ml-64">
        <div className="flex h-14 items-center gap-2 px-4">
          <button className="btn !px-2.5 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="lg:hidden"><Logo /></div>
          <button onClick={() => setSearchOpen(true)} className="btn ml-auto w-auto !justify-start text-muted sm:w-72 lg:ml-0" aria-label="Search (Ctrl+K)">
            <Icon name="search" />
            <span className="hidden sm:inline">Search the atlas…</span>
            <kbd className="chip ml-auto hidden !py-0 sm:inline-flex">⌘K</kbd>
          </button>
          <div className="lg:ml-auto"><ThemeButton /></div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
            <motion.aside
              className="scrollbar-thin fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-line bg-bg px-3 py-5 lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <Logo />
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
              </div>
              <NavList onNavigate={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="main" className="lg:ml-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, x: 24, rotateY: -4 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -24, rotateY: 4 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformPerspective: 1600, transformOrigin: 'left center' }}
            className={isHome ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10'}
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <footer className="border-t border-line px-6 py-8 text-center text-xs text-muted">
          Ecclesia Atlas · Content cites primary sources and standard reference works · Public-domain texts via CCEL, New Advent and others
        </footer>
      </main>

      <CompareTray />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
