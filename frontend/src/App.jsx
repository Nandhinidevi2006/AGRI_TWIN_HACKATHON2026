import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sliders, Calendar, BarChart3, Settings, Shield, Clock, Download, Smartphone } from 'lucide-react';
import { getStrings } from './i18n';
import Dashboard from './components/Dashboard';
import DigitalTwinSandbox from './components/DigitalTwinSandbox';
import AIScheduler from './components/AIScheduler';
import Analytics from './components/Analytics';
import FieldsConfig from './components/FieldsConfig';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('en');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const appT = getStrings(language, 'app');

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const navCopy = {
    en: {
      dashboard: 'Field Dashboard',
      sandbox: 'Digital Twin Sandbox',
      scheduler: 'AI Pump Schedules',
      analytics: 'Resource Insights',
      config: 'Farm Configurator',
      status: 'Digital Twin Online',
      cluster: 'Cluster: Chennai South',
      installApp: 'Install App',
      installBannerTitle: 'Install AgriTwin on your phone!',
      installBannerSub: 'Works offline. Access your farm anytime, anywhere.',
    },
    ta: {
      dashboard: 'கள டாஷ்போர்ட்',
      sandbox: 'டிஜிட்டல் ட்விண் சோதனைப் பகுதி',
      scheduler: 'AI பம்ப் அட்டவணைகள்',
      analytics: 'வள பகுப்பாய்வு',
      config: 'பண்ணை அமைப்புகள்',
      status: 'டிஜிட்டல் ட்விண் செயல்பாட்டில்',
      cluster: 'கிளஸ்டர்: சென்னை தெற்கு',
      installApp: 'ஆப் நிறுவு',
      installBannerTitle: 'AgriTwin-ஐ உங்கள் தொலைபேசியில் நிறுவுங்கள்!',
      installBannerSub: 'ஆஃப்லைனிலும் வேலை செய்யும். எங்கிருந்தும் உங்கள் பண்ணையை அணுகலாம்.',
    },
    hi: {
      dashboard: 'खेत डैशबोर्ड',
      sandbox: 'डिजिटल ट्विन सैंडबॉक्स',
      scheduler: 'AI पंप अनुसूची',
      analytics: 'संसाधन विश्लेषण',
      config: 'फार्म कॉन्फ़िगरेटर',
      status: 'डिजिटल ट्विन ऑनलाइन',
      cluster: 'क्लस्टर: चेन्नई दक्षिण',
      installApp: 'ऐप इंस्टॉल करें',
      installBannerTitle: 'AgriTwin को अपने फ़ोन पर इंस्टॉल करें!',
      installBannerSub: 'ऑफलाइन भी काम करता है। कहीं से भी अपने खेत तक पहुँचें।',
    }
  };

  const navText = navCopy[language] || navCopy.en;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <Dashboard language={language} />;
      case 'sandbox':     return <DigitalTwinSandbox language={language} />;
      case 'scheduler':   return <AIScheduler language={language} />;
      case 'analytics':   return <Analytics language={language} />;
      case 'config':      return <FieldsConfig language={language} />;
      default:            return <Dashboard language={language} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: navText.dashboard, icon: <LayoutDashboard size={20} /> },
    { id: 'sandbox',   label: navText.sandbox,   icon: <Sliders size={20} /> },
    { id: 'scheduler', label: navText.scheduler, icon: <Calendar size={20} /> },
    { id: 'analytics', label: navText.analytics, icon: <BarChart3 size={20} /> },
    { id: 'config',    label: navText.config,    icon: <Settings size={20} /> }
  ];

  return (
    <div className="app-container">
      {/* PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'linear-gradient(135deg, #0d2d1a, #0a4020)',
          border: '1px solid rgba(16,185,129,0.4)', borderRadius: '20px',
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 8px 40px rgba(16,185,129,0.25)', backdropFilter: 'blur(20px)',
          maxWidth: '480px', width: 'calc(100vw - 48px)',
          animation: 'fadeIn 0.4s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '14px', padding: '10px', flexShrink: 0
          }}>
            <Smartphone size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>
              {navText.installBannerTitle}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              {navText.installBannerSub}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleInstall}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '8px 16px', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Download size={14} /> {navText.installApp}
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              style={{
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '8px 12px', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">{appT.brand || 'AgriTwin AI'}</span>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald)' }}>
            <Shield size={14} />
            <span>{navText.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <Clock size={14} />
            <span>{navText.cluster}</span>
          </div>

          {/* Install App button in sidebar for desktop */}
          {!isInstalled && installPrompt && (
            <button
              onClick={handleInstall}
              style={{
                marginTop: '16px', width: '100%',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px',
                padding: '10px 14px', color: 'var(--emerald)',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))'}
            >
              <Download size={14} />
              {navText.installApp}
            </button>
          )}
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="main-content">
        <div style={{ float: 'right', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '20px', pointerEvents: 'none' }}>
          <span>{appT.telemetryStatus || 'Telemetry: Sync Active'}</span>
          <span>•</span>
          <span>{appT.coordinates || 'Lat/Lon: 12.981N, 80.096E'}</span>
        </div>

        <div style={{ float: 'right', marginRight: '12px', marginBottom: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ta' : language === 'ta' ? 'hi' : 'en')}
            className="btn btn-secondary"
            style={{ pointerEvents: 'auto' }}
          >
            {language === 'en' ? 'தமிழ்' : language === 'ta' ? 'हिंदी' : 'English'}
          </button>
        </div>
        
        <div style={{ clear: 'both', height: '10px' }}></div>
        
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
