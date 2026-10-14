import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Layout, PageLoader } from './components/Layout';
import { ThemeSync } from './components/Theme';
import { useUi } from './store/ui';

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(load);
  return <C />;
};

// The single-file / offline build has no server to rewrite deep links, so it routes with #/paths instead.
const createRouter = import.meta.env.VITE_HASH_ROUTER ? createHashRouter : createBrowserRouter;
const router = createRouter([
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
      { path: '/saved', element: page(() => import('./pages/Saved')) },
      { path: '/ask', element: page(() => import('./pages/Ask')) },
      { path: '*', element: page(() => import('./pages/NotFound')) },
    ],
  },
]);

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
