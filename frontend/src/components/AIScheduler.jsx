import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { getStrings } from '../i18n';

export default function AIScheduler({ language = 'en' }) {
  const t = getStrings(language, 'aischeduler');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reoptimizing, setReoptimizing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setSchedules(data);
      setError(null);
    } catch (err) {
      console.warn('API error, using mock schedules:', err);
      generateMockSchedules();
    } finally {
      setLoading(false);
    }
  };

  const generateMockSchedules = () => {
    const mockSched = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const slotTime = new Date(now.getTime() + (i * 12 + 4) * 3600 * 1000);
      const hour = slotTime.getHours();
      let source = 'Grid';
      let cost = 4.5;
      if (10 <= hour && hour <= 16) { source = 'Solar'; cost = 0; }
      else if (hour >= 22 || hour <= 6) { source = 'Battery'; cost = 0.8; }
      else { source = 'Hybrid'; cost = 1.9; }
      mockSched.push({
        id: i + 1,
        pump_id: 1,
        time_slot: slotTime.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        duration_minutes: 30,
        water_volume_liters: 12000,
        energy_source: source,
        energy_cost_est: cost,
        completed: false,
      });
    }
    setSchedules(mockSched);
  };

  const handleReoptimize = async () => {
    setReoptimizing(true);
    try {
      const res = await fetch('/api/schedules/reoptimize', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reoptimize');
      await fetchSchedules();
    } catch (err) {
      console.warn('Could not reoptimize backend, running local logic:', err);
      setTimeout(() => { generateMockSchedules(); setReoptimizing(false); }, 1000);
      return;
    }
    setReoptimizing(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
        <button onClick={handleReoptimize} className="btn btn-primary" disabled={reoptimizing}>
          <RefreshCw size={16} className={reoptimizing ? 'animate-spin' : ''} />
          {reoptimizing ? t.optimizing : t.optimize}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
        <div className="twin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.mainTitle}</h3>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t.upcoming}</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <AlertCircle size={32} style={{ marginBottom: '12px' }} />
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="schedules-list">
              {schedules.map(item => (
                <div key={item.id} className={`schedule-card ${item.completed ? 'completed' : ''}`}>
                  <div className="schedule-time">
                    <Calendar size={14} style={{ marginRight: '6px' }} />
                    {item.time_slot.split(' ')[0]}
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px', fontWeight: '600' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                      {item.time_slot.split(' ')[1] || item.time_slot.split(',')[1]?.trim()}
                    </div>
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-title">{t.scheduleTitle}</div>
                    <div className="schedule-meta">
                      {t.volume}: {item.water_volume_liters.toLocaleString()} {t.liters || 'Liters'} | {t.duration}: {item.duration_minutes} {t.mins || 'mins'}
                    </div>
                  </div>
                  <div>
                    <span className={`source-badge ${item.energy_source.toLowerCase()}`}>{t[item.energy_source.toLowerCase()] || item.energy_source}</span>
                  </div>
                  <div className="schedule-cost" style={{ color: item.energy_cost_est === 0 ? 'var(--emerald)' : 'inherit' }}>
                    {item.energy_cost_est === 0 ? t.free : `$${item.energy_cost_est.toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="twin-card" style={{ background: 'rgba(16,185,129,0.02)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>{t.howTitle}</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{t.howBody}</p>
          </div>
          <div className="twin-card" style={{ background: 'rgba(14,165,233,0.02)', borderColor: 'rgba(14,165,233,0.1)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>{t.safetyTitle}</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{t.safetyBody}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
