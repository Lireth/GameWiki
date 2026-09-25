import { lazy } from 'react';
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
import { RelicDetailPage } from './pages/RelicDetailPage';
import { RelicsPage } from './pages/RelicsPage';

// 低频页面按路由分割，减小主包体积；Suspense 边界在 AppLayout 的内容区，
// 避免加载 chunk 时导航壳一起被占位替换。
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const VersionDetailPage = lazy(() =>
  import('./pages/VersionDetailPage').then((m) => ({
    default: m.VersionDetailPage,
  })),
);
const VersionIndexPage = lazy(() =>
  import('./pages/VersionIndexPage').then((m) => ({
    default: m.VersionIndexPage,
  })),
);
const FavoritesPage = lazy(() =>
  import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })),
);

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="characters/:id" element={<CharacterDetailPage />} />
            <Route path="light-cones" element={<LightConesPage />} />
            <Route path="light-cones/:id" element={<LightConeDetailPage />} />
            <Route path="relics" element={<RelicsPage />} />
            <Route path="relics/:id" element={<RelicDetailPage />} />
          <Route path="matrix" element={<MatrixPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="versions" element={<VersionIndexPage />} />
          <Route path="versions/:version" element={<VersionDetailPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
