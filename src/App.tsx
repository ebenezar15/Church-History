import { lazy, Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Layout, PageLoader } from './components/Layout';
import { ThemeSync } from './components/Theme';
import { useUi } from './store/ui';

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(load);
  return <C />;
};

const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: page(() => import('./pages/Landing')) },
      { path: '/timeline', element: page(() => import('./pages/Timeline')) },
      { path: '/eras', element: page(() => import('./pages/Eras')) },
      { path: '/eras/:id', element: page(() => import('./pages/EraDetail')) },
      { path: '/events/:id', element: page(() => import('./pages/EventDetail')) },
      { path: '/map', element: page(() => import('./pages/WorldMap')) },
      { path: '/traditions', element: page(() => import('./pages/FamilyTree')) },
      { path: '/traditions/:id', element: page(() => import('./pages/TraditionDetail')) },
      { path: '/doctrines', element: page(() => import('./pages/Doctrines')) },
      { path: '/doctrines/:id', element: page(() => import('./pages/DoctrineDetail')) },
      { path: '/positions/:id', element: page(() => import('./pages/PositionDetail')) },
      { path: '/debates', element: page(() => import('./pages/Debates')) },
      { path: '/debates/:id', element: page(() => import('./pages/DebateDetail')) },
      { path: '/compare', element: page(() => import('./pages/Compare')) },
      { path: '/compare/featured/:id', element: page(() => import('./pages/FeaturedComparison')) },
      { path: '/people', element: page(() => import('./pages/People')) },
      { path: '/people/:id', element: page(() => import('./pages/PersonDetail')) },
      { path: '/library', element: page(() => import('./pages/Library')) },
      { path: '/library/:id', element: page(() => import('./pages/WorkDetail')) },
      { path: '/quotes', element: page(() => import('./pages/Quotes')) },
      { path: '/experiences', element: page(() => import('./pages/Experiences')) },
      { path: '/experiences/:id', element: page(() => import('./pages/ExperienceDetail')) },
      { path: '/paths', element: page(() => import('./pages/Paths')) },
      { path: '/paths/:id', element: page(() => import('./pages/PathDetail')) },
      { path: '/missions', element: page(() => import('./pages/Missions')) },
      { path: '/missions/india', element: page(() => import('./pages/IndiaMissions')) },
      { path: '/missions/india/:id', element: page(() => import('./pages/IndiaMissions').then((m) => ({ default: m.IndiaDetail }))) },
      { path: '/missions/:id', element: page(() => import('./pages/MissionDetail')) },
      { path: '/saved', element: page(() => import('./pages/Saved')) },
      { path: '/ask', element: page(() => import('./pages/Ask')) },
      { path: '*', element: page(() => import('./pages/NotFound')) },
    ],
  },
];

const router = import.meta.env.VITE_HASH_ROUTER ? createPortableRouter(routes) : createBrowserRouter(routes);

/**
 * The single-file build runs from a file, a raw-file host or inside a sandboxed viewer frame, where the
 * page address may be about:srcdoc or blob: and the History API may refuse to work. So it keeps its own
 * page history in memory, and mirrors it to #/path in the address bar only where the browser allows,
 * which keeps deep links and the Back button working wherever they can.
 */
function createPortableRouter(rs: RouteObject[]) {
  const fromHash = () => {
    try {
      const h = window.location.hash.replace(/^#/, '');
      return h.startsWith('/') ? h : '/';
    } catch {
      return '/';
    }
  };
  const r = createMemoryRouter(rs, { initialEntries: [fromHash()] });
  let syncing = false;
  r.subscribe((state) => {
    if (syncing) return;
    const target = '#' + state.location.pathname + state.location.search;
    try {
      if (window.location.hash !== target) window.history.pushState(null, '', target);
    } catch {
      /* address bar not writable here: navigation still works in memory */
    }
  });
  const onPop = () => {
    const path = fromHash();
    const cur = r.state.location.pathname + r.state.location.search;
    if (path !== cur) {
      syncing = true;
      r.navigate(path).finally(() => { syncing = false; });
    }
  };
  try {
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
  } catch {
    /* ignore */
  }
  return r;
}

export function App() {
  const motion = useUi((s) => s.motion);
  return (
    <MotionConfig reducedMotion={motion === 'full' ? 'never' : motion === 'reduced' ? 'always' : 'user'}>
      <ThemeSync />
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </MotionConfig>
  );
}
