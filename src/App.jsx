import { Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import StallPage from './pages/StallPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StallPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
