import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminPage } from './pages/AdminPage';
import { CharacterDetailPage } from './pages/CharacterDetailPage';
import { CharactersPage } from './pages/CharactersPage';
import { HomePage } from './pages/HomePage';
import { LightConeDetailPage } from './pages/LightConeDetailPage';
import { LightConesPage } from './pages/LightConesPage';
import { MatrixPage } from './pages/MatrixPage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
          <Route path="matrix" element={<MatrixPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
