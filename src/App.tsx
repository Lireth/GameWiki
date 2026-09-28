import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// 首页保持首屏直达，404 页极小保持急加载；其余页面（含高频图鉴页）按路由分割，
// 显著减小主包体积。Suspense 边界在 AppLayout 的内容区，
// 避免加载 chunk 时导航壳一起被占位替换。
const CharactersPage = lazy(() =>
  import('./pages/CharactersPage').then((m) => ({ default: m.CharactersPage })),
);
const CharacterDetailPage = lazy(() =>
  import('./pages/CharacterDetailPage').then((m) => ({
    default: m.CharacterDetailPage,
  })),
);
const LightConesPage = lazy(() =>
  import('./pages/LightConesPage').then((m) => ({ default: m.LightConesPage })),
);
const LightConeDetailPage = lazy(() =>
  import('./pages/LightConeDetailPage').then((m) => ({
    default: m.LightConeDetailPage,
  })),
);
const RelicsPage = lazy(() =>
  import('./pages/RelicsPage').then((m) => ({ default: m.RelicsPage })),
);
const RelicDetailPage = lazy(() =>
  import('./pages/RelicDetailPage').then((m) => ({
    default: m.RelicDetailPage,
  })),
);
const MatrixPage = lazy(() =>
  import('./pages/MatrixPage').then((m) => ({ default: m.MatrixPage })),
);
const NewsPage = lazy(() =>
  import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })),
);
const BannersPage = lazy(() =>
  import('./pages/BannersPage').then((m) => ({ default: m.BannersPage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const VersionDetailPage = lazy(() =>
  import('./pages/VersionDetailPage').then((m) => ({
    default: m.VersionDetailPage,
  })),
);
const VersionComparePage = lazy(() =>
  import('./pages/VersionComparePage').then((m) => ({
    default: m.VersionComparePage,
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
          <Route path="banners" element={<BannersPage />} />
          <Route path="versions" element={<VersionIndexPage />} />
          <Route path="versions/:version" element={<VersionDetailPage />} />
          <Route path="versions/:version/compare" element={<VersionComparePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
