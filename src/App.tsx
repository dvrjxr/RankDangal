import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Rank from './pages/Rank';
import Sunday from './pages/Sunday';
import PYQ from './pages/PYQ';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import SplashScreen from './components/SplashScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

const APP_VERSION = '1.0.0';

function AppContent() {
  const { user, userData, loading } = useAuth();
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const [updateLink, setUpdateLink] = useState('');

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/dvrjxr/RD-MCQ/main/Update.json');
        const data = await res.json();
        if (data.updateAvailable && compareVersions(APP_VERSION, data.minRequiredVersion) < 0) {
          setUpdateNeeded(true);
          setUpdateLink(data.updateLink);
        }
      } catch (e) {
        console.error('Update check failed', e);
      }
    };
    checkUpdate();
  }, []);

  if (updateNeeded) {
    return (
      <div className="fixed inset-0 bg-bg-0 flex flex-col items-center justify-center p-6 text-center z-[9999]">
        <div className="w-20 h-20 bg-blue-glow rounded-3xl flex items-center justify-center mb-6 border-2 border-blue">
          <svg className="w-10 h-10 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </div>
        <h1 className="text-2xl font-black text-t1 mb-2">Update Required</h1>
        <p className="text-t3 mb-8 font-bold">A new version of Rank Dangal is available. Please update to continue.</p>
        <a 
          href={updateLink} 
          className="w-full max-w-xs btn-primary"
        >
          Update Now
        </a>
      </div>
    );
  }

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rank" element={<Rank />} />
          <Route path="/pyq" element={<PYQ />} />
          <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" replace />} />
          
          {/* Auth Required Routes */}
          <Route 
            path="/profile" 
            element={user ? (userData ? <Profile /> : <Navigate to="/onboarding" replace />) : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/sunday" 
            element={user ? (userData ? <Sunday /> : <Navigate to="/onboarding" replace />) : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/quiz" 
            element={user ? (userData ? <Quiz /> : <Navigate to="/onboarding" replace />) : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/settings" 
            element={user ? <Settings /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/admin" 
            element={user && userData?.isAdmin ? <Admin /> : <Navigate to="/" replace />} 
          />
        </Route>

        {/* Auth Pages */}
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/onboarding" element={user ? (userData ? <Navigate to="/" replace /> : <Onboarding />) : <Navigate to="/auth" replace />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function compareVersions(v1: string, v2: string) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
