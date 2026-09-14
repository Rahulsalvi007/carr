import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveDetection from './pages/LiveDetection';
import UploadMedia from './pages/UploadMedia';
import Vehicles from './pages/Vehicles';
import Violations from './pages/Violations';
import History from './pages/History';
import Analytics from './pages/Analytics';
import MobileCam from './pages/MobileCam';
import Settings from './pages/Settings';

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

  React.useEffect(() => {
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
        return <MobileCam />;
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
        <MobileCam onBackToDashboard={() => setActiveTab('dashboard')} />
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
            : 'p-4 lg:p-8 max-w-7xl mx-auto w-full'
        }`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
