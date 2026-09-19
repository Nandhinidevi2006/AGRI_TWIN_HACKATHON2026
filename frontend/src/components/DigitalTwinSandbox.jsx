import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sliders, Sun, Thermometer, ShieldAlert, DollarSign, Leaf, Zap, RefreshCw } from 'lucide-react';
import { getStrings } from '../i18n';
// Localization moved to JSON files

// Localization moved to JSON files

export default function DigitalTwinSandbox({ language = 'en' }) {
  const t = getStrings(language, 'digitalTwinSandbox');
  // Weather Sliders
  const [tempMult, setTempMult] = useState(1.0);
  const [humidityMult, setHumidityMult] = useState(1.0);
  const [solarMult, setSolarMult] = useState(1.0);
  const [rainOverride, setRainOverride] = useState("none"); // "none", "force_rain", "force_dry"

  // Grid/Asset Overrides
  const [solarCap, setSolarCap] = useState(60);
  const [batteryCap, setBatteryCap] = useState(100);

  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_multiplier: parseFloat(tempMult),
          humidity_multiplier: parseFloat(humidityMult),
          solar_multiplier: parseFloat(solarMult),
          rain_override: rainOverride === "none" ? null : rainOverride,
          battery_capacity_kwh: parseFloat(batteryCap),
          solar_capacity_kw: parseFloat(solarCap)
        })
      });
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setSimulationData(data.days);
      setSummary(data.summary);
    } catch (err) {
      console.warn('API error, simulating locally:', err);
      // Run local client-side simulation logic for fallback
      simulateLocally();
    } finally {
      setLoading(false);
    }
  };

  const simulateLocally = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const baseForecasts = [
      { status: "Sunny", temp: 28, humidity: 55, solar: 800, wind: 4.5, rain: 0 },
      { status: "Sunny", temp: 29, humidity: 50, solar: 850, wind: 3.8, rain: 0 },
      { status: "Overcast", temp: 24, humidity: 72, solar: 420, wind: 5.2, rain: 0 },
      { status: "Rainy", temp: 19, humidity: 88, solar: 180, wind: 6.8, rain: 18.5 },
      { status: "Rainy", temp: 18, humidity: 92, solar: 120, wind: 8.0, rain: 24.0 },
      { status: "Sunny", temp: 25, humidity: 62, solar: 720, wind: 3.5, rain: 0 },
      { status: "Heatwave", temp: 34, humidity: 38, solar: 960, wind: 2.2, rain: 0 }
    ];

    let moistureNoIrrig = 48.0;
    let moistureWithSmart = 48.0;
    let batteryCharge = batteryCap * 0.75;
    
    const results = baseForecasts.map((fc, idx) => {
      // Apply sliders
      const temp = fc.temp * tempMult;
      const humidity = Math.max(10, Math.min(100, fc.humidity * humidityMult));
      const solarIrrad = fc.solar * solarMult;
      
      let rain = fc.rain;
      let weatherStatus = fc.status;
      if (rainOverride === "force_rain") { rain = 20.0; weatherStatus = "Rainy"; }
      if (rainOverride === "force_dry") { rain = 0.0; weatherStatus = "Sunny"; }

      // Evapotranspiration
      const cropKc = 1.15; // Corn coefficient
      const soilCap = 45.0; // Loamy
      const humidityFactor = 1.0 - (humidity / 100.0);
      const tempFactor = (temp + 10.0) / 25.0;
      const windFactor = 1.0 + (fc.wind * 0.15);
      const etc = 3.5 * tempFactor * humidityFactor * windFactor * cropKc;

      // Moisture A: No irrigation
      const netWaterA = rain - etc;
      moistureNoIrrig = Math.max(0, Math.min(100, moistureNoIrrig + (netWaterA / soilCap) * 100));

      // Moisture B: Smart irrigation
      const threshold = 40.0;
      const willWater = moistureWithSmart < threshold;
      let waterApplied = 0.0;
      
      // Do not water if rain is coming today or tomorrow
      const rainSoon = rain > 5.0 || (baseForecasts[idx+1]?.rain > 5.0 && rainOverride !== "force_dry");
      
      if (willWater) {
        if (!rainSoon || moistureWithSmart < (threshold - 10.0)) {
          // Add 25,000 liters
          waterApplied = 25000.0;
        }
      }

      const irrigationDepth = waterApplied / (12.5 * 10000.0) * 1000.0; // depth in mm
      const netWaterB = rain + irrigationDepth - etc;
      moistureWithSmart = Math.max(0, Math.min(100, moistureWithSmart + (netWaterB / soilCap) * 100));

      // Solar & Wind Energy Yields
      const solarGen = solarCap * (solarIrrad / 1000.0) * 0.85 * 8.0; // 8 hours daylight
      const windGen = 25.0 * Math.pow((fc.wind / 12.0), 3) * 24.0;
      const totalRenewable = solarGen + windGen;

      // Water Pump energy
      const flowRate = 400.0;
      const pumpKW = 15.0;
      const runTimeH = waterApplied > 0 ? (waterApplied / flowRate) / 60.0 : 0.0;
      const pumpEnergy = pumpKW * runTimeH;

      // Battery Charge Simulation
      const netPower = totalRenewable - pumpEnergy;
      let gridDraw = 0.0;
      let renewablePower = 0.0;

      if (netPower >= 0) {
        batteryCharge = Math.min(batteryCap, batteryCharge + netPower * 0.9);
        renewablePower = pumpEnergy;
      } else {
        const deficit = -netPower;
        const discharge = Math.min(batteryCharge * 0.9, deficit);
        batteryCharge -= discharge / 0.9;
        gridDraw = deficit - discharge;
        renewablePower = pumpEnergy - gridDraw;
      }

      // Financials / Carbon
      const baselineCost = pumpEnergy * 0.18;
      const actualCost = gridDraw * 0.18;
      const costSaved = Math.max(0, baselineCost - actualCost);
      const carbonSaved = (pumpEnergy - gridDraw) * 0.4;

      return {
        day_offset: idx,
        day_name: t.dayLabels[days[idx]] || days[idx],
        weather_status: weatherStatus,
        soil_moisture_depleted: parseFloat(moistureNoIrrig.toFixed(1)),
        soil_moisture_with_smart_irrigation: parseFloat(moistureWithSmart.toFixed(1)),
        irrigation_needed: waterApplied > 0,
        water_applied_liters: Math.round(waterApplied),
        solar_gen_kwh: parseFloat(solarGen.toFixed(1)),
        wind_gen_kwh: parseFloat(windGen.toFixed(1)),
        battery_end_soc: parseFloat((batteryCharge / batteryCap * 100).toFixed(1)),
        grid_power_kwh: parseFloat(gridDraw.toFixed(1)),
        renewable_power_kwh: parseFloat(renewablePower.toFixed(1)),
        cost_saved: parseFloat(costSaved.toFixed(2)),
        carbon_saved: parseFloat(carbonSaved.toFixed(1))
      };
    });

    setSimulationData(results);
    setSummary(t.summary);
  };

  useEffect(() => {
    runSimulation();
  }, []);

  // Aggregate totals
  const totalWaterApplied = simulationData ? simulationData.reduce((sum, d) => sum + d.water_applied_liters, 0) : 0;
  const totalCostSaved = simulationData ? simulationData.reduce((sum, d) => sum + d.cost_saved, 0) : 0;
  const totalCarbonSaved = simulationData ? simulationData.reduce((sum, d) => sum + d.carbon_saved, 0) : 0;

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
      </div>

      <div className="sandbox-layout">
        {/* Sliders Pane */}
        <div className="twin-card controls-pane">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Sliders size={20} className="emerald" style={{ color: 'var(--emerald)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.controls}</h3>
          </div>

          {/* Temperature */}
          <div className="range-slider-container">
            <div className="slider-label-row">
              <span>{t.temp}</span>
              <span className="slider-val">{tempMult}x</span>
            </div>
            <input 
              type="range" min="0.5" max="2.0" step="0.1" 
              value={tempMult} onChange={(e) => setTempMult(e.target.value)} 
              className="slider-input" 
            />
          </div>

          {/* Humidity */}
          <div className="range-slider-container">
            <div className="slider-label-row">
              <span>{t.humidity}</span>
              <span className="slider-val">{humidityMult}x</span>
            </div>
            <input 
              type="range" min="0.5" max="1.5" step="0.1" 
              value={humidityMult} onChange={(e) => setHumidityMult(e.target.value)} 
              className="slider-input" 
            />
          </div>

          {/* Solar Irradiance */}
          <div className="range-slider-container">
            <div className="slider-label-row">
              <span>{t.solar}</span>
              <span className="slider-val">{solarMult}x</span>
            </div>
            <input 
              type="range" min="0.5" max="1.5" step="0.1" 
              value={solarMult} onChange={(e) => setSolarMult(e.target.value)} 
              className="slider-input" 
            />
          </div>

          {/* Precipitation Override */}
          <div>
            <div className="slider-label-row">
              <span>{t.rain}</span>
            </div>
            <select className="form-select" style={{ width: '100%' }} value={rainOverride} onChange={(e) => setRainOverride(e.target.value)}>
              <option value="none">{t.standard}</option>
              <option value="force_rain">{t.rainForce}</option>
              <option value="force_dry">{t.dryForce}</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '10px 0' }}></div>

          {/* Infrastructure Size */}
          <div className="range-slider-container">
            <div className="slider-label-row">
              <span>{t.solarSize}</span>
              <span className="slider-val">{solarCap} kW</span>
            </div>
            <input 
              type="range" min="20" max="200" step="10" 
              value={solarCap} onChange={(e) => setSolarCap(e.target.value)} 
              className="slider-input" 
            />
          </div>

          <div className="range-slider-container">
            <div className="slider-label-row">
              <span>{t.batterySize}</span>
              <span className="slider-val">{batteryCap} kWh</span>
            </div>
            <input 
              type="range" min="20" max="300" step="20" 
              value={batteryCap} onChange={(e) => setBatteryCap(e.target.value)} 
              className="slider-input" 
            />
          </div>

          <button onClick={runSimulation} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <RefreshCw size={16} /> {t.run}
          </button>
        </div>

        {/* Results Pane */}
        <div className="simulation-results-pane">
          {summary && (
            <div className="twin-card" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px' }}>{t.summaryTitle}</div>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {summary || t.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3 Overview stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div className="twin-card stat-item" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="stat-icon-wrapper sky">
                <Sun size={20} />
              </div>
              <div>
                <div className="stat-label" style={{ fontSize: '12px' }}>{t.totalWater}</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>{totalWaterApplied.toLocaleString()} {t.liters || 'Liters'}</div>
              </div>
            </div>

            <div className="twin-card stat-item" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="stat-icon-wrapper amber">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="stat-label" style={{ fontSize: '12px' }}>{t.costSaved}</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>${totalCostSaved.toFixed(2)}</div>
              </div>
            </div>

            <div className="twin-card stat-item" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="stat-icon-wrapper emerald">
                <Leaf size={20} />
              </div>
              <div>
                <div className="stat-label" style={{ fontSize: '12px' }}>{t.carbon}</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>{totalCarbonSaved.toFixed(1)} {t.kgCO2 || 'kg CO₂'}</div>
              </div>
            </div>
          </div>

          {/* Chart 1: Moisture Depletion */}
            <div className="twin-card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{t.moistureChart}</h3>
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="day_name" stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', borderColor: 'rgba(16,185,129,0.3)', color: '#fff', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px' }} />
                    <Line type="monotone" name={t.noIrrigation} dataKey="soil_moisture_depleted" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                    <Line type="monotone" name={t.smartIrrigation} dataKey="soil_moisture_with_smart_irrigation" stroke="var(--emerald)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Energy Breakdown & Battery SoC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="twin-card">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{t.powerChart}</h3>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simulationData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="day_name" stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', borderColor: 'rgba(16,185,129,0.3)', color: '#fff', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar name={t.renewable} dataKey="renewable_power_kwh" fill="var(--emerald)" radius={[4, 4, 0, 0]} />
                    <Bar name={t.grid} dataKey="grid_power_kwh" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="twin-card">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{t.batteryChart}</h3>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="day_name" stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--text-muted)" tickLine={false} style={{ fontSize: '12px' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10,16,12,0.95)', borderColor: 'rgba(16,185,129,0.3)', color: '#fff', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" name={t.batterySoC} dataKey="battery_end_soc" stroke="var(--amber)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
