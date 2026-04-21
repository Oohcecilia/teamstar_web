import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import SyncProvider from "@/lib/SyncProvider";

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Teams from './pages/Teams';
import Members from './pages/Members';
import Organizations from './pages/Organizations';
import CalendarPage from './pages/CalendarPage';
import MapPage from './pages/MapPage';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';



// 🔒 Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }


  return children;
};

const RoleProtectedRoute = ({ children }) => {
  const { hasFullAccess } = useAuth();

  if (!hasFullAccess) {
    return <Navigate to="/not-found" replace />;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <SyncProvider>   {/* 👈 ADD THIS */}
          <Router>
            <Routes>
              <Route path="/auth" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="settings" element={<Settings />} />

                <Route
                  path="organizations"
                  element={
                    <RoleProtectedRoute>
                      <Organizations />
                    </RoleProtectedRoute>
                  }
                />

                <Route
                  path="teams"
                  element={
                    <RoleProtectedRoute>
                      <Teams />
                    </RoleProtectedRoute>
                  }
                />

                <Route
                  path="members"
                  element={
                    <RoleProtectedRoute roles={["owner", "admin", "supervisor"]}>
                      <Members />
                    </RoleProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </SyncProvider> {/* 👈 ADD THIS */}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
