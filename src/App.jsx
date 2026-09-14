import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Lazy-load page components to reduce initial bundle size significantly
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveDetection = lazy(() => import('./pages/LiveDetection'));
const UploadMedia = lazy(() => import('./pages/UploadMedia'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Violations = lazy(() => import('./pages/Violations'));
const History = lazy(() => import('./pages/History'));
const Analytics = lazy(() => import('./pages/Analytics'));
const MobileCam = lazy(() => import('./pages/MobileCam'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-950 animate-spin" />
      <span className="text-xs text-zinc-500 font-mono">Loading module...</span>
    </div>
  );
}

export default function App() {
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab) return urlTab;
      const hashTab = window.location.hash.replace('#', '').trim();
      if (hashTab) return hashTab;
    } catch (e) {}
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  useEffect(() => {
    const handlePopState = () => {
      const tab = getInitialTab();
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'live':
        return <LiveDetection />;
      case 'upload':
        return <UploadMedia />;
      case 'vehicles':
        return <Vehicles />;
      case 'violations':
        return <Violations />;
      case 'history':
        return <History />;
      case 'analytics':
        return <Analytics />;
      case 'mobile-cam':
        return <MobileCam onBackToDashboard={() => setActiveTab('dashboard')} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  // Dedicated full-bleed interface for mobile phone camera transmitter
  if (activeTab === 'mobile-cam') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
        <Suspense fallback={<PageLoader />}>
          <MobileCam onBackToDashboard={() => setActiveTab('dashboard')} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Page Content Container */}
        <main className={`flex-1 overflow-y-auto ${
          activeTab === 'live'
            ? 'p-2 sm:p-3 lg:p-4 w-full max-w-full'
            : 'p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full'
        }`}>
          <Suspense fallback={<PageLoader />}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
