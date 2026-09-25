import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/ScrollToTop';
import { CharacterDetailPage } from './pages/CharacterDetailPage';
import { CharactersPage } from './pages/CharactersPage';
import { HomePage } from './pages/HomePage';
import { LightConeDetailPage } from './pages/LightConeDetailPage';
import { LightConesPage } from './pages/LightConesPage';
import { MatrixPage } from './pages/MatrixPage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// 低频页面按路由分割，减小主包体积
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const VersionDetailPage = lazy(() =>
  import('./pages/VersionDetailPage').then((m) => ({
    default: m.VersionDetailPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-space-950">
            <p className="font-display text-sm tracking-widest text-slate-500">
              LOADING…
            </p>
          </div>
        }
      >
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="characters/:id" element={<CharacterDetailPage />} />
            <Route path="light-cones" element={<LightConesPage />} />
            <Route path="light-cones/:id" element={<LightConeDetailPage />} />
            <Route path="matrix" element={<MatrixPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="versions/:version" element={<VersionDetailPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
