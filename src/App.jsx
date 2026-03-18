import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StallPage from './pages/StallPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StallPage />} />
      <Route
        path="/admin"
        element={(
          <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">Loading admin panel...</div>}>
            <AdminPage />
          </Suspense>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
