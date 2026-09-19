import React from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Leaf, Award, TrendingUp, Info } from 'lucide-react';
import { getStrings } from '../i18n';
// Localization handled via JSON files

export default function Analytics({ language = 'en' }) {
  const t = getStrings(language, 'analytics');
  // Energy split data
  const energyData = [
    { name: t.solar, value: 45, color: '#f59e0b' },
    { name: t.wind, value: 18, color: '#06b6d4' },
    { name: t.battery, value: 22, color: '#10b981' },
    { name: t.gridDraw, value: 15, color: '#ef4444' }
  ];

  // 12 months water usage comparison (Timer vs AI)
  const waterHistoryData = [
    { month: t.monthLabels.Jan, [t.legacyTimer]: 250, [t.aiPlan]: 180 },
    { month: t.monthLabels.Feb, [t.legacyTimer]: 240, [t.aiPlan]: 165 },
    { month: t.monthLabels.Mar, [t.legacyTimer]: 280, [t.aiPlan]: 190 },
    { month: t.monthLabels.Apr, [t.legacyTimer]: 320, [t.aiPlan]: 210 },
    { month: t.monthLabels.May, [t.legacyTimer]: 380, [t.aiPlan]: 235 },
    { month: t.monthLabels.Jun, [t.legacyTimer]: 450, [t.aiPlan]: 280 },
    { month: t.monthLabels.Jul, [t.legacyTimer]: 520, [t.aiPlan]: 310 },
    { month: t.monthLabels.Aug, [t.legacyTimer]: 490, [t.aiPlan]: 290 },
    { month: t.monthLabels.Sep, [t.legacyTimer]: 410, [t.aiPlan]: 240 },
    { month: t.monthLabels.Oct, [t.legacyTimer]: 330, [t.aiPlan]: 205 },
    { month: t.monthLabels.Nov, [t.legacyTimer]: 270, [t.aiPlan]: 175 },
    { month: t.monthLabels.Dec, [t.legacyTimer]: 260, [t.aiPlan]: 170 }
  ];

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Cumulative Water Saved Chart */}
        <div className="twin-card">
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{t.waterTitle}</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterHistoryData}>
                <defs>
                  <linearGradient id="colorTimer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sky)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--sky)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', borderColor: 'rgba(16,185,129,0.3)', color: '#fff', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Area type="monotone" name={t.legacyTimer} dataKey={t.legacyTimer} stroke="#6b7280" fillOpacity={1} fill="url(#colorTimer)" strokeWidth={1.5} />
                <Area type="monotone" name={t.aiPlan} dataKey={t.aiPlan} stroke="var(--sky)" fillOpacity={1} fill="url(#colorAI)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Source Distribution Chart */}
        <div className="twin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{t.energyTitle}</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={energyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {energyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', color: '#fff', borderRadius: '12px', borderColor: 'rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '180px', paddingRight: '20px' }}>
              {energyData.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color }}></div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {item.name}
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>{item.value}% {t.contribution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{t.info}</span>
          </div>
        </div>
      </div>

      {/* Highlights & Milestones */}
      <div className="twin-card">
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{t.achievements}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '20px', borderRadius: '14px', display: 'flex', gap: '16px' }}>
            <Leaf className="emerald" size={28} style={{ color: 'var(--emerald)' }} />
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{t.carbon}</h4>
              <p style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: 'var(--emerald)' }}>1,480 {t.kgCO2 || 'kg CO₂'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.equivalent}</p>
            </div>
          </div>

          <div style={{ background: 'rgba(14,165,233,0.02)', border: '1px solid rgba(14,165,233,0.1)', padding: '20px', borderRadius: '14px', display: 'flex', gap: '16px' }}>
            <Award className="sky" size={28} style={{ color: 'var(--sky)' }} />
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{t.water}</h4>
              <p style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: 'var(--sky)' }}>34.2% {t.saved || 'Saved'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.conserved}</p>
            </div>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.1)', padding: '20px', borderRadius: '14px', display: 'flex', gap: '16px' }}>
            <TrendingUp className="amber" size={28} style={{ color: 'var(--amber)' }} />
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{t.grid}</h4>
              <p style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: 'var(--amber)' }}>$2,840 {t.saved || 'Saved'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.avoided}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
