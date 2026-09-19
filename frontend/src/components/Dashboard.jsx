import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplet, Sun, Wind, BatteryCharging, Zap, RefreshCw } from 'lucide-react';
import { getStrings } from '../i18n';

// ── Translation lookup maps for API data (English keys → local language) ──
const fieldNameMap = {
  ta: {
    'North Cornfield':  'வடக்கு மக்காச்சோள வயல்',
    'South Orchard':    'தெற்கு திராட்சைத் தோட்டம்',
    'East Greenhouse':  'கிழக்கு பசுமைக்குடில்',
  },
  hi: {
    'North Cornfield':  'उत्तर मक्का खेत',
    'South Orchard':    'दक्षिण बाग',
    'East Greenhouse':  'पूर्व ग्रीनहाउस',
  }
};

const cropMap = {
  ta: { Corn:'மக்காச்சோளம்', Grapes:'திராட்சை', Tomato:'தக்காளி', Wheat:'கோதுமை', Rice:'அரிசி', Sugarcane:'கரும்பு', Cotton:'பருத்தி', Banana:'வாழை', Coconut:'தேங்காய்', Groundnut:'நிலக்கடலை', Chili:'மிளகாய்', Onion:'வெங்காயம்' },
  hi: { Corn:'मक्का', Grapes:'अंगूर', Tomato:'टमाटर', Wheat:'गेहूं', Rice:'चावल', Sugarcane:'गन्ना', Cotton:'कपास', Banana:'केला', Coconut:'नारियल', Groundnut:'मूंगफली', Chili:'मिर्च', Onion:'प्याज' }
};

const soilMap = {
  ta: { Loamy:'லோமி', Sandy:'மணல்', Clay:'களிமண்' },
  hi: { Loamy:'दोमट', Sandy:'रेतीली', Clay:'चिकनी' }
};

const pumpNameMap = {
  ta: { 'Irrigation Pump A':'பாசன பம்ப் A', 'Drip Pump B':'சொட்டு பம்ப் B', 'Sprinkler Pump C':'தெளிப்பு பம்ப் C' },
  hi: { 'Irrigation Pump A':'सिंचाई पंप A', 'Drip Pump B':'टपक पंप B', 'Sprinkler Pump C':'फुहारा पंप C' }
};

const assetNameMap = {
  ta: { 'Solar Array Alpha':'சூரிய வரிசை ஆல்பா', 'Wind Turbine Beta':'காற்றாலை பிடா', 'Lithium Battery Pack':'லிதியம் பேட்டரி தொகுப்பு' },
  hi: { 'Solar Array Alpha':'सौर ऐरे अल्फा', 'Wind Turbine Beta':'पवन टरबाइन बीटा', 'Lithium Battery Pack':'लिथियम बैटरी पैक' }
};

// Translate a field object for display (does NOT mutate state)
function translateField(field, language, t) {
  if (language === 'en') return field;
  const fm = fieldNameMap[language] || {};
  const cm = cropMap[language] || {};
  const sm = soilMap[language] || {};
  const pm = pumpNameMap[language] || {};

  const pumpPrefix = { ta: 'பம்ப்', hi: 'पंप' };

  return {
    ...field,
    name: fm[field.name] || field.name,
    crop_type: cm[field.crop_type] || field.crop_type,
    soil_type: sm[field.soil_type] || field.soil_type,
    pumps: field.pumps?.map(p => {
      if (pm[p.name]) return { ...p, name: pm[p.name] };
      if (p.name.startsWith('Pump for ')) {
        const rawFieldName = p.name.replace('Pump for ', '');
        const translatedField = fm[rawFieldName] || rawFieldName;
        const prefix = pumpPrefix[language] || 'Pump';
        return { ...p, name: `${prefix}: ${translatedField}` };
      }
      return p;
    })
  };
}

function translateAsset(asset, language) {
  if (language === 'en') return asset;
  const am = assetNameMap[language] || {};
  return { ...asset, name: am[asset.name] || asset.name };
}

export default function Dashboard({ language = 'en' }) {

  const t = getStrings(language, 'dashboard');

  const [fields, setFields] = useState([]);
  const [assets, setAssets] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all fields and assets
  const fetchData = async () => {
    try {
      setLoading(true);
      const [fieldsRes, assetsRes] = await Promise.all([
        fetch('/api/fields'),
        fetch('/api/assets')
      ]);

      if (!fieldsRes.ok || !assetsRes.ok) throw new Error('Backend offline');

      const data = await fieldsRes.json();
      const assetData = await assetsRes.json();
      setFields(data);
      setAssets(assetData);
      if (data.length > 0 && !selectedFieldId) {
        setSelectedFieldId(data[0].id);
      }
      setError(null);
    } catch (err) {
      console.warn('Backend API error, using mock fallback:', err);
      setError(t.usingMock);
      // Mock Fallbacks
      const mockFields = language === 'ta'
        ? [
            {
              id: 1,
              name: 'வடக்கு மக்காச்சோள வயல்',
              crop_type: 'மக்காச்சோளம்',
              soil_type: 'லோமி',
              area_hectares: 12.5,
              current_moisture: 48.2,
              optimal_min_moisture: 40.0,
              optimal_max_moisture: 75.0,
              pumps: [{ id: 1, name: 'பாசன பம்ப் A', is_active: false, power_consumption_kw: 15.0, flow_rate_lpm: 400.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 2,
              name: 'தெற்கு திராட்சைத் தோட்டம்',
              crop_type: 'திராட்சை',
              soil_type: 'மணல்',
              area_hectares: 8.0,
              current_moisture: 36.5,
              optimal_min_moisture: 30.0,
              optimal_max_moisture: 60.0,
              pumps: [{ id: 2, name: 'சொட்டு பம்ப் B', is_active: false, power_consumption_kw: 5.5, flow_rate_lpm: 150.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 3,
              name: 'கிழக்கு பசுமைக்குடில்',
              crop_type: 'தக்காளி',
              soil_type: 'களிமண்',
              area_hectares: 2.5,
              current_moisture: 56.0,
              optimal_min_moisture: 50.0,
              optimal_max_moisture: 80.0,
              pumps: [{ id: 3, name: 'தெளிப்பு பம்ப் C', is_active: true, power_consumption_kw: 3.0, flow_rate_lpm: 80.0, grid_cost_kwh: 0.15 }]
            }
          ]
        : language === 'hi'
        ? [
            {
              id: 1,
              name: 'उत्तर मक्का खेत',
              crop_type: 'मक्का',
              soil_type: 'दोमट',
              area_hectares: 12.5,
              current_moisture: 48.2,
              optimal_min_moisture: 40.0,
              optimal_max_moisture: 75.0,
              pumps: [{ id: 1, name: 'सिंचाई पंप A', is_active: false, power_consumption_kw: 15.0, flow_rate_lpm: 400.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 2,
              name: 'दक्षिण बाग',
              crop_type: 'अंगूर',
              soil_type: 'रेतीली',
              area_hectares: 8.0,
              current_moisture: 36.5,
              optimal_min_moisture: 30.0,
              optimal_max_moisture: 60.0,
              pumps: [{ id: 2, name: 'टपक पंप B', is_active: false, power_consumption_kw: 5.5, flow_rate_lpm: 150.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 3,
              name: 'पूर्व ग्रीनहाउस',
              crop_type: 'टमाटर',
              soil_type: 'चिकनी',
              area_hectares: 2.5,
              current_moisture: 56.0,
              optimal_min_moisture: 50.0,
              optimal_max_moisture: 80.0,
              pumps: [{ id: 3, name: 'फुहारा पंप C', is_active: true, power_consumption_kw: 3.0, flow_rate_lpm: 80.0, grid_cost_kwh: 0.15 }]
            }
          ]
        : [
            {
              id: 1,
              name: 'North Cornfield',
              crop_type: 'Corn',
              soil_type: 'Loamy',
              area_hectares: 12.5,
              current_moisture: 48.2,
              optimal_min_moisture: 40.0,
              optimal_max_moisture: 75.0,
              pumps: [{ id: 1, name: 'Irrigation Pump A', is_active: false, power_consumption_kw: 15.0, flow_rate_lpm: 400.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 2,
              name: 'South Orchard',
              crop_type: 'Grapes',
              soil_type: 'Sandy',
              area_hectares: 8.0,
              current_moisture: 36.5,
              optimal_min_moisture: 30.0,
              optimal_max_moisture: 60.0,
              pumps: [{ id: 2, name: 'Drip Pump B', is_active: false, power_consumption_kw: 5.5, flow_rate_lpm: 150.0, grid_cost_kwh: 0.15 }]
            },
            {
              id: 3,
              name: 'East Greenhouse',
              crop_type: 'Tomato',
              soil_type: 'Clay',
              area_hectares: 2.5,
              current_moisture: 56.0,
              optimal_min_moisture: 50.0,
              optimal_max_moisture: 80.0,
              pumps: [{ id: 3, name: 'Sprinkler Pump C', is_active: true, power_consumption_kw: 3.0, flow_rate_lpm: 80.0, grid_cost_kwh: 0.15 }]
            }
          ];
      const mockAssets = language === 'ta'
        ? [
            { id: 1, name: 'சூரிய வரிசை ஆல்பா', type: 'Solar', capacity: 60.0, current_soc: 0.0, efficiency: 0.18 },
            { id: 2, name: 'காற்றாலை பிடா', type: 'Wind', capacity: 25.0, current_soc: 0.0, efficiency: 0.4 },
            { id: 3, name: 'லிதியம் பேட்டரி தொகுப்பு', type: 'Battery', capacity: 100.0, current_soc: 75.0, efficiency: 0.9 }
          ]
        : language === 'hi'
        ? [
            { id: 1, name: 'सौर ऐरे अल्फा', type: 'Solar', capacity: 60.0, current_soc: 0.0, efficiency: 0.18 },
            { id: 2, name: 'पवन टरबाइन बीटा', type: 'Wind', capacity: 25.0, current_soc: 0.0, efficiency: 0.4 },
            { id: 3, name: 'लिथियम बैटरी पैक', type: 'Battery', capacity: 100.0, current_soc: 75.0, efficiency: 0.9 }
          ]
        : [
            { id: 1, name: 'Solar Array Alpha', type: 'Solar', capacity: 60.0, current_soc: 0.0, efficiency: 0.18 },
            { id: 2, name: 'Wind Turbine Beta', type: 'Wind', capacity: 25.0, current_soc: 0.0, efficiency: 0.4 },
            { id: 3, name: 'Lithium Battery Pack', type: 'Battery', capacity: 100.0, current_soc: 75.0, efficiency: 0.9 }
          ];
      setFields(mockFields);
      setAssets(mockAssets);
      if (!selectedFieldId) setSelectedFieldId(1);
    } finally {
      setLoading(false);
    }
  };

  // Fetch telemetry logs for selected field
  const fetchTelemetry = async (fieldId) => {
    if (!fieldId) return;
    try {
      const res = await fetch(`/api/telemetry/${fieldId}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      const formatted = data.map(log => ({
        ...log,
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [t.soil]: log.soil_moisture,
        [t.renewablePower || 'Renewable Power (kW)']: log.renewable_gen_kw,
        [t.gridDraw || 'Grid Draw (kW)']: log.grid_draw_kw
      }));
      setTelemetry(formatted);
    } catch (err) {
      // Mock historical data logs
      const mockLogs = [];
      const now = new Date();
      for (let i = 24; i > 0; i--) {
        const time = new Date(now.getTime() - i * 3600 * 1000);
        const hour = time.getHours();
        const solarMulti = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
        mockLogs.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          [t.soil]: 45 + Math.sin(i / 3) * 5 + (fieldId === 3 ? 10 : 0),
          [t.renewablePower || 'Renewable Power (kW)']: (solarMulti * 50) + 12 + Math.random() * 4,
          [t.gridDraw || 'Grid Draw (kW)']: (hour === 14 && fieldId === 1) ? 15 : 0
        });
      }
      setTelemetry(mockLogs);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedFieldId) {
      fetchTelemetry(selectedFieldId);
    }
  }, [selectedFieldId]);

  // Toggle pump status
  const handleTogglePump = async (pumpId, fieldIdx) => {
    try {
      const res = await fetch(`/api/pumps/${pumpId}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle pump');
      const data = await res.json();

      // Update local state
      const updatedFields = [...fields];
      updatedFields[fieldIdx].pumps[0].is_active = data.is_active;
      if (data.field_moisture) {
        updatedFields[fieldIdx].current_moisture = data.field_moisture;
      }
      setFields(updatedFields);
    } catch (err) {
      // Mock toggle fallback
      const updatedFields = [...fields];
      const active = !updatedFields[fieldIdx].pumps[0].is_active;
      updatedFields[fieldIdx].pumps[0].is_active = active;
      if (active) {
        updatedFields[fieldIdx].current_moisture = Math.min(100, updatedFields[fieldIdx].current_moisture + 5);
      }
      setFields(updatedFields);
    }
  };

  // Aggregated card values
  const activePumpsCount = fields.filter(f => f.pumps?.[0]?.is_active).length;
  const avgMoisture = fields.length > 0 ? (fields.reduce((acc, f) => acc + f.current_moisture, 0) / fields.length).toFixed(1) : '0';
  const cleanGenerationKw = assets
    .filter(asset => asset.type === 'Solar' || asset.type === 'Wind')
    .reduce((acc, asset) => acc + asset.capacity, 0)
    .toFixed(1);
  const carbonOffsetKg = (Number(cleanGenerationKw) * 0.5).toFixed(1);

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary">
          <RefreshCw size={16} /> {t.sync}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', padding: '12px 18px', borderRadius: '12px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
          <Zap size={16} /> {error}
        </div>
      )}

      {/* Stats Section */}
      <div className="grid-stats">
        <div className="twin-card stat-item">
          <div className="stat-icon-wrapper sky">
            <Droplet size={24} />
          </div>
          <div>
            <div className="stat-label">{t.avgSoil}</div>
            <div className="stat-value">{avgMoisture}%</div>
          </div>
        </div>

        <div className="twin-card stat-item">
          <div className="stat-icon-wrapper amber">
            <Sun size={24} />
          </div>
          <div>
            <div className="stat-label">{t.cleanGen}</div>
            <div className="stat-value">{cleanGenerationKw} kW</div>
          </div>
        </div>

        <div className="twin-card stat-item">
          <div className="stat-icon-wrapper emerald">
            <BatteryCharging size={24} />
          </div>
          <div>
            <div className="stat-label">{t.activePumps}</div>
            <div className="stat-value">{activePumpsCount} / {fields.length}</div>
          </div>
        </div>

        <div className="twin-card stat-item">
          <div className="stat-icon-wrapper cyan">
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-label">{t.carbon}</div>
            <div className="stat-value">{carbonOffsetKg} {t.kgCO2 || 'kg CO₂'}</div>
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="moisture-grid-header">
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{t.fieldsHeader}</h2>
      </div>

      <div className="fields-grid">
        {fields.map((rawField, idx) => {
          const field = translateField(rawField, language, t);
          const pump = field.pumps?.[0];
          const isDry = field.current_moisture < field.optimal_min_moisture;
          const isWet = field.current_moisture > field.optimal_max_moisture;
          const minMarkerPos = `${field.optimal_min_moisture}%`;
          const maxMarkerPos = `${field.optimal_max_moisture}%`;

          let statusText = t.optimal;
          let statusColor = "#10b981";
          if (isDry) { statusText = t.dry; statusColor = "#f59e0b"; }
          if (isWet) { statusText = t.wet; statusColor = "#3b82f6"; }
          if (!isDry && !isWet) { statusText = t.optimal; }

          return (
            <div key={field.id} className="twin-card" style={{ cursor: 'pointer', borderColor: selectedFieldId === field.id ? 'var(--emerald)' : 'var(--border-subtle)' }} onClick={() => setSelectedFieldId(field.id)}>
              <div className="field-header">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{field.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span className="crop-badge">{field.crop_type}</span>
                    <span className="crop-badge">{field.soil_type} {t.soilSuffix}</span>
                  </div>
                </div>
                <div style={{ color: statusColor, fontSize: '13px', fontWeight: '700' }}>{statusText}</div>
              </div>

              {/* Moisture Progress Gauge */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
                  <span>{t.soil}</span>
                  <span style={{ color: statusColor }}>{field.current_moisture}%</span>
                </div>
                <div className="moisture-gauge-container">
                  <div className="moisture-bar" style={{ width: `${field.current_moisture}%`, backgroundColor: statusColor }}></div>
                  <div className="moisture-threshold-indicator" style={{ left: minMarkerPos }} title={t.minThreshold}></div>
                  <div className="moisture-threshold-indicator" style={{ left: maxMarkerPos }} title={t.maxThreshold}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>0%</span>
                  <span>{t.min} ({field.optimal_min_moisture}%)</span>
                  <span>{t.max} ({field.optimal_max_moisture}%)</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="field-details">
                <div className="field-details-item">
                  {t.area}
                  <span>{field.area_hectares} ha</span>
                </div>
                <div className="field-details-item">
                  {t.flow}
                  <span>{pump ? `${pump.flow_rate_lpm} L/min` : t.none}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t.pump}: {pump?.name || t.none}</span>
                {pump && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleTogglePump(pump.id, idx); }} 
                    className={`btn ${pump.is_active ? 'btn-primary active-pulse' : 'btn-secondary'}`}
                  >
                    {pump.is_active ? t.on : t.off}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Telemetry Charts */}
      {selectedFieldId && (
        <div className="twin-card" style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
            {t.telemetryTitle}: {fields.find(f => f.id === selectedFieldId)?.name || ''}
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sky)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--sky)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--emerald)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--emerald)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', borderColor: 'rgba(16,185,129,0.3)', color: '#fff', borderRadius: '12px' }} />
                <Area type="monotone" dataKey={t.soil} stroke="var(--sky)" fillOpacity={1} fill="url(#colorMoisture)" strokeWidth={2} />
                <Area type="monotone" dataKey={t.renewablePower || 'Renewable Power (kW)'} stroke="var(--emerald)" fillOpacity={1} fill="url(#colorRen)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
