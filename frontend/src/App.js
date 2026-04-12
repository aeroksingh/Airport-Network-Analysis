import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Flights from './pages/Flights';
import Passengers from './pages/Passengers';
import Gates from './pages/Gates';
import FileSharing from './pages/FileSharing';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (userData, tokenData) => {
    setUser(userData); setToken(tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('user'); localStorage.removeItem('token');
  };

  // Handle kicked event from WebSocket
  useEffect(() => {
    const handler = (e) => {
      toast.error(`You have been removed from the network: ${e.detail?.reason || ''}`);
      logout();
      window.location.href = '/login';
    };
    window.addEventListener('airtower:kicked', handler);
    return () => window.removeEventListener('airtower:kicked', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const AdminGuard = () => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="dark"
          toastStyle={{ background: '#161d2e', border: '1px solid #1e2d45', color: '#f0f4ff', fontFamily: 'DM Sans, sans-serif' }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/setup" element={<PublicRoute><Setup /></PublicRoute>} />

          <Route element={<ProtectedLayout />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="flights" element={<Flights />} />
              <Route path="files" element={<FileSharing />} />
              <Route path="passengers" element={<Passengers />} />
              <Route path="gates" element={<Gates />} />
              <Route element={<AdminGuard />}>
                <Route path="admin" element={<AdminPanel />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
