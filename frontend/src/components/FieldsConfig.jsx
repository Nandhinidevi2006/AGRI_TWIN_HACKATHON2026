import React, { useState, useEffect } from 'react';
import { PlusCircle, Sliders, Info, Server, RefreshCw } from 'lucide-react';

import { getStrings } from "../i18n";

// Localization maps for mock data names
const fieldNameMap = {
  ta: {
    'North Cornfield': 'வடக்கு மக்காச்சோள வயல்',
    'South Orchard': 'தெற்கு திராட்சைத் தோட்டம்',
    'East Greenhouse': 'கிழக்கு பசுமைக்குடில்'
  },
  hi: {
    'North Cornfield': 'उत्तर मक्का खेत',
    'South Orchard': 'दक्षिण बाग',
    'East Greenhouse': 'पूर्व ग्रीनहाउस'
  }
};

const assetNameMap = {
  ta: {
    'Solar Array Alpha': 'சூரிய வரிசை ஆல்பா',
    'Wind Turbine Beta': 'காற்றாலை பிடா',
    'Lithium Battery Pack': 'லிதியம் பேட்டரி தொகுப்பு'
  },
  hi: {
    'Solar Array Alpha': 'सौर ऐरे अल्फा',
    'Wind Turbine Beta': 'पवन टरबाइन बीटा',
    'Lithium Battery Pack': 'लिथियम बैटरी पैक'
  }
};


export default function FieldsConfig({ language = 'en' }) {
  const t = getStrings(language, 'fieldsConfig');
  const [fields, setFields] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New Field Form State
  const [name, setName] = useState("");
  const [cropType, setCropType] = useState("Corn");
  const [soilType, setSoilType] = useState("Loamy");
  const [area, setArea] = useState(5.0);
  const [minMoisture, setMinMoisture] = useState(40.0);
  const [maxMoisture, setMaxMoisture] = useState(75.0);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const resFields = await fetch('/api/fields');
      const resAssets = await fetch('/api/assets');
      if (!resFields.ok || !resAssets.ok) throw new Error('API Offline');
      
      setFields(await resFields.json());
      setAssets(await resAssets.json());
    } catch (err) {
      console.warn('API error, loading config defaults:', err);
      // Fallback mocks
      const localizedFieldName = (name) => (fieldNameMap[language] && fieldNameMap[language][name]) || name;
const localizedAssetName = (name) => (assetNameMap[language] && assetNameMap[language][name]) || name;

setFields([
        { id: 1, name: localizedFieldName('North Cornfield'), crop_type: "Corn", soil_type: "Loamy", area_hectares: 12.5, optimal_min_moisture: 40.0, optimal_max_moisture: 75.0 },
        { id: 2, name: localizedFieldName('South Orchard'), crop_type: "Grapes", soil_type: "Sandy", area_hectares: 8.0, optimal_min_moisture: 30.0, optimal_max_moisture: 60.0 }
      ]);
      setAssets([
        { id: 1, name: localizedAssetName('Solar Array Alpha'), type: "Solar", capacity: 60.0, efficiency: 0.18 },
        { id: 2, name: localizedAssetName('Wind Turbine Beta'), type: "Wind", capacity: 25.0, efficiency: 0.40 },
        { id: 3, name: localizedAssetName('Lithium Battery Pack'), type: "Battery", capacity: 100.0, efficiency: 0.90 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          crop_type: cropType,
          soil_type: soilType,
          area_hectares: parseFloat(area),
          optimal_min_moisture: parseFloat(minMoisture),
          optimal_max_moisture: parseFloat(maxMoisture)
        })
      });
      if (!res.ok) throw new Error('Failed to create field');
      const data = await res.json();
      setFields([...fields, data]);
      setMessage(t.fieldAdded);
      // Reset Form
      setName("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.warn('API error, adding locally:', err);
      // Local addition
      const mockNew = {
        id: fields.length + 1,
        name,
        crop_type: cropType,
        soil_type: soilType,
        area_hectares: parseFloat(area),
        optimal_min_moisture: parseFloat(minMoisture),
        optimal_max_moisture: parseFloat(maxMoisture)
      };
      setFields([...fields, mockNew]);
      setMessage(t.localAdded);
      setName("");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAsset = async (assetId, idx, val) => {
    const updated = [...assets];
    updated[idx].capacity = parseFloat(val);
    setAssets(updated);

    try {
      await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated[idx].name,
          type: updated[idx].type,
          capacity: parseFloat(val),
          efficiency: updated[idx].efficiency
        })
      });
    } catch (err) {
      console.warn('API Offline, saved asset locally');
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Left Pane: Infrastructure Assets & Fields list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Infrastructure sizes */}
          <div className="twin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Server size={20} className="emerald" style={{ color: 'var(--emerald)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.capacity}</h3>
            </div>
            
            {loading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <div>
                {assets.map((asset, idx) => (
                  <div key={asset.id} className="range-slider-container">
                    <div className="slider-label-row">
                      <span>{asset.name}</span>
                      <span className="slider-val">{asset.capacity} {asset.type === 'Battery' ? 'kWh' : 'kW'}</span>
                    </div>
                    <input 
                      type="range" 
                      min={asset.type === 'Battery' ? '20' : '10'} 
                      max={asset.type === 'Battery' ? '300' : '150'} 
                      step="10" 
                      value={asset.capacity} 
                      onChange={(e) => handleUpdateAsset(asset.id, idx, e.target.value)} 
                      className="slider-input" 
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '10px', marginTop: '12px' }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{t.infrastructureInfo}</span>
            </div>
          </div>

          {/* Fields list */}
          <div className="twin-card">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{t.registered}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fields.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '14px 18px', borderRadius: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{f.name}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {(t.cropOptions && t.cropOptions[f.crop_type]) || f.crop_type} | {(t.soilOptions && t.soilOptions[f.soil_type]) || f.soil_type} {t.soilLabel || 'Soil'} | {f.area_hectares} ha
                    </span>
                  </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {t.thresholdLabel}: {f.optimal_min_moisture}% - {f.optimal_max_moisture}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane: Add Field Form */}
        <div className="twin-card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <PlusCircle size={20} className="emerald" style={{ color: 'var(--emerald)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.addTitle}</h3>
          </div>

          {message && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--emerald)', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateField}>
            <div className="form-group">
              <label className="form-label">{t.fieldName}</label>
              <input 
                type="text" placeholder={t.fieldNamePlaceholder} 
                value={name} onChange={(e) => setName(e.target.value)} 
                className="form-input" required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">{t.cropType}</label>
                <select className="form-select" value={cropType} onChange={(e) => setCropType(e.target.value)}>
                  <option value="Wheat">{t.cropOptions.Wheat}</option>
                  <option value="Corn">{t.cropOptions.Corn}</option>
                  <option value="Tomato">{t.cropOptions.Tomato}</option>
                  <option value="Grapes">{t.cropOptions.Grapes}</option>
                  <option value="Rice">{t.cropOptions.Rice}</option>
                  <option value="Sugarcane">{t.cropOptions.Sugarcane}</option>
                  <option value="Cotton">{t.cropOptions.Cotton}</option>
                  <option value="Banana">{t.cropOptions.Banana}</option>
                  <option value="Coconut">{t.cropOptions.Coconut}</option>
                  <option value="Groundnut">{t.cropOptions.Groundnut}</option>
                  <option value="Chili">{t.cropOptions.Chili}</option>
                  <option value="Onion">{t.cropOptions.Onion}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t.soilType}</label>
                <select className="form-select" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Sandy">{t.soilOptions.Sandy}</option>
                  <option value="Loamy">{t.soilOptions.Loamy}</option>
                  <option value="Clay">{t.soilOptions.Clay}</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.area}</label>
              <input 
                type="number" min="0.5" max="100" step="0.5" 
                value={area} onChange={(e) => setArea(e.target.value)} 
                className="form-input" required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">{t.min}</label>
                <input 
                  type="number" min="10" max="50" 
                  value={minMoisture} onChange={(e) => setMinMoisture(e.target.value)} 
                  className="form-input" required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.max}</label>
                <input 
                  type="number" min="55" max="95" 
                  value={maxMoisture} onChange={(e) => setMaxMoisture(e.target.value)} 
                  className="form-input" required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} disabled={saving}>
              {saving ? t.saving : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
