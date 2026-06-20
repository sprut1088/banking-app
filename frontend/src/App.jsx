import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountDetailsPage from './pages/AccountDetailsPage';
import TransactionsPage from './pages/TransactionsPage';
import CardDetailsPage from './pages/CardDetailsPage';
import PaymentPage from './pages/PaymentPage';
import LoadControlPage from './pages/LoadControlPage';
import SecurityPage from './pages/SecurityPage';
import SupportPage from './pages/SupportPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/accounts" element={<ProtectedRoute><AccountDetailsPage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/cards" element={<ProtectedRoute><CardDetailsPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
      <Route path="/statements" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      <Route path="/load-control" element={<ProtectedRoute><LoadControlPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
