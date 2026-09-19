import numpy as np
import pandas as pd
import math
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models
import twin_engine

# A utility to generate a 24-hour load/price pattern
# Grid electricity prices: peak hours (9 AM - 5 PM) are expensive ($0.24/kWh), off-peak hours (10 PM - 6 AM) are cheap ($0.08/kWh), other times medium ($0.14/kWh)
def get_grid_price_for_hour(hour: int) -> float:
    if 9 <= hour <= 17:
        return 0.24
    elif hour >= 22 or hour <= 6:
        return 0.08
    return 0.14

def predict_irrigation_schedules(db: Session, field_id: int) -> List[Dict[str, Any]]:
    """
    Simulates a 7-day forecast hour-by-hour.
    Uses physical twin equations + ML suitability score to schedule pump events.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or not field.pumps:
        return []
        
    pump = field.pumps[0]  # Optimize for the primary pump
    
    # Get weather forecast and renewable assets
    forecasts = db.query(models.WeatherForecast).order_by(models.WeatherForecast.day_offset).all()
    assets = db.query(models.RenewableAsset).all()
    
    solar_asset = next((a for a in assets if a.type == "Solar"), None)
    wind_asset = next((a for a in assets if a.type == "Wind"), None)
    battery_asset = next((a for a in assets if a.type == "Battery"), None)
    
    solar_cap = solar_asset.capacity if solar_asset else 0.0
    wind_cap = wind_asset.capacity if wind_asset else 0.0
    bat_cap = battery_asset.capacity if battery_asset else 0.0
    bat_soc = battery_asset.current_soc if battery_asset else 0.0
    bat_charge = (bat_soc / 100.0) * bat_cap
    
    # 1. Gather historical logs for training the ML suitability model
    # We want to train a model that learns from historical states:
    # Features: [temperature, humidity, wind_speed, solar_irradiance, grid_price, soil_moisture_deficit]
    # Target suitability score = 1.0 (free solar power + dry soil) down to 0.0 (rainy + wet soil + peak grid prices)
    historical_logs = db.query(models.TelemetryLog).filter(models.TelemetryLog.field_id == field_id).limit(100).all()
    
    # Train a machine learning model
    ml_model = RandomForestRegressor(n_estimators=10, random_state=42)
    
    # Generate synthetic training set if history is small (cold start)
    features_list = []
    targets_list = []
    
    if len(historical_logs) >= 10:
        for log in historical_logs:
            hour = log.timestamp.hour
            grid_price = get_grid_price_for_hour(hour)
            deficit = max(0.0, field.optimal_max_moisture - log.soil_moisture)
            
            # Simple heuristic target to train the ML
            solar_power = log.renewable_gen_kw
            cost_factor = 1.0 - (grid_price / 0.24) # 0 to 0.66
            moisture_factor = deficit / 100.0
            
            # suitability score
            suitability = (solar_power * 0.4) + (cost_factor * 0.3) + (moisture_factor * 0.3)
            
            features_list.append([
                log.temperature,
                log.humidity,
                log.renewable_gen_kw,
                grid_price,
                deficit
            ])
            targets_list.append(suitability)
    else:
        # Seed synthetic training data for ML engine initialization
        for _ in range(100):
            temp = np.random.uniform(15.0, 38.0)
            hum = np.random.uniform(30.0, 90.0)
            solar = np.random.uniform(0.0, 800.0)
            sol_kw = calculate_approx_solar(solar, temp, solar_cap)
            hour = np.random.randint(0, 24)
            grid_p = get_grid_price_for_hour(hour)
            moist_def = np.random.uniform(0.0, 50.0)
            
            # Suitability heuristic
            solar_contrib = (sol_kw / (solar_cap + 1)) * 0.4
            price_contrib = (1.0 - (grid_p / 0.24)) * 0.3
            need_contrib = (moist_def / 50.0) * 0.3
            suitability = solar_contrib + price_contrib + need_contrib
            
            features_list.append([temp, hum, sol_kw, grid_p, moist_def])
            targets_list.append(suitability)
            
    ml_model.fit(features_list, targets_list)
    
    # 2. Run hourly simulation over 7 days (168 hours) to schedule pumps
    current_time = datetime.now()
    simulated_moisture = field.current_moisture
    simulated_bat_charge = bat_charge
    
    schedules = []
    
    # Step-by-step scheduler
    for hour_offset in range(168):
        slot_time = current_time + timedelta(hours=hour_offset)
        day_idx = min(6, hour_offset // 24)
        hour = slot_time.hour
        
        # Get forecast for this slot
        fc = forecasts[day_idx] if day_idx < len(forecasts) else forecasts[-1]
        
        # Calculate ETc for this hour (divided by 24 for hourly decay)
        hourly_etc = twin_engine.calculate_evapotranspiration(
            fc.temp_max if 10 <= hour <= 16 else fc.temp_min,
            fc.humidity,
            fc.wind_speed,
            field.crop_type
        ) / 24.0
        
        # Hourly precipitation (if rainy, distribute rain across daytime hours)
        hourly_rain = 0.0
        if fc.status == "Rainy" and 8 <= hour <= 18:
            hourly_rain = fc.precipitation_mm / 10.0
            
        # Power generations
        # Solar peaks around 1 PM (hour 13)
        solar_irrad_factor = max(0.0, math.sin((hour - 6) * math.pi / 12.0)) if 6 <= hour <= 18 else 0.0
        slot_irradiance = fc.solar_irradiance * solar_irrad_factor
        
        solar_gen = twin_engine.calculate_solar_generation(solar_cap, slot_irradiance, fc.temp_max if 12 <= hour <= 15 else fc.temp_min)
        wind_gen = twin_engine.calculate_wind_generation(wind_cap, fc.wind_speed)
        renewable_total = solar_gen + wind_gen
        
        # Electricity pricing
        grid_price = get_grid_price_for_hour(hour)
        
        # Check current deficit
        moisture_deficit = max(0.0, field.optimal_max_moisture - simulated_moisture)
        
        # Use ML to predict suitability score
        ml_features = [[
            fc.temp_max if 10 <= hour <= 16 else fc.temp_min,
            fc.humidity,
            renewable_total,
            grid_price,
            moisture_deficit
        ]]
        suitability_score = ml_model.predict(ml_features)[0]
        
        # Scheduling Logic:
        # We need to water if moisture falls below optimal_min_moisture
        # Or, if suitability score is extremely high (free energy + moderately dry soil), top up the soil moisture.
        # However, do not irrigate if heavy rain is forecasted tomorrow/day-after (precipitation > 5mm)
        upcoming_rain = False
        next_24h_day_indices = range(day_idx, min(7, day_idx + 2))
        for r_day in next_24h_day_indices:
            if r_day < len(forecasts) and forecasts[r_day].precipitation_mm > 5.0:
                upcoming_rain = True
                
        # Determine if we should turn on the pump
        trigger_irrigation = False
        
        # Critical threshold override: must irrigate if too dry, rain or no rain
        if simulated_moisture < field.optimal_min_moisture:
            trigger_irrigation = True
        # Opportunistic irrigation: high suitability, no upcoming rain, and soil is below max target
        elif suitability_score > 0.65 and not upcoming_rain and simulated_moisture < (field.optimal_max_moisture - 10.0):
            trigger_irrigation = True
            
        pump_run_time_min = 0
        water_liters = 0.0
        grid_cost = 0.0
        energy_src = "Grid"
        
        if trigger_irrigation:
            # Run pump for 30 mins to avoid overshooting
            pump_run_time_min = 30
            # Flow rate is LPM
            water_liters = pump.flow_rate_lpm * pump_run_time_min
            
            # Pump electricity requirement (kWh)
            pump_energy_kwh = pump.power_consumption_kw * (pump_run_time_min / 60.0)
            
            # Simulate battery + renewable balance
            net_power = renewable_total - pump.power_consumption_kw
            bat_sim = twin_engine.run_battery_simulation(
                simulated_bat_charge,
                bat_cap,
                net_power,
                time_step_hours=(pump_run_time_min / 60.0)
            )
            
            simulated_bat_charge = bat_sim["end_charge_kwh"]
            grid_draw = bat_sim["grid_draw_kw"]
            
            # Calculate cost
            grid_cost = grid_draw * (pump_run_time_min / 60.0) * grid_price
            
            # Energy source label
            if grid_draw == 0:
                energy_src = "Solar" if solar_gen > wind_gen else "Wind"
                if bat_sim["battery_discharge_kw"] > 0:
                    energy_src = "Battery"
            elif grid_draw < pump.power_consumption_kw:
                energy_src = "Hybrid"
            else:
                energy_src = "Grid"
        else:
            # Just simulate idle battery behavior (recharging from excess solar/wind)
            net_power = renewable_total
            bat_sim = twin_engine.run_battery_simulation(
                simulated_bat_charge,
                bat_cap,
                net_power,
                time_step_hours=1.0
            )
            simulated_bat_charge = bat_sim["end_charge_kwh"]
            
        # Update simulated soil moisture
        simulated_moisture = twin_engine.calculate_soil_moisture_change(
            simulated_moisture,
            hourly_etc,
            hourly_rain,
            water_liters,
            field.area_hectares,
            field.soil_type
        )
        
        if trigger_irrigation:
            schedules.append({
                "pump_id": pump.id,
                "time_slot": slot_time.strftime("%Y-%m-%d %H:00"),
                "duration_minutes": pump_run_time_min,
                "water_volume_liters": water_liters,
                "energy_source": energy_src,
                "energy_cost_est": round(grid_cost, 2),
                "completed": False
            })
            
    return schedules

def calculate_approx_solar(irradiance: float, temp: float, capacity: float) -> float:
    irradiance_ratio = min(1.2, irradiance / 1000.0)
    temp_derating = 1.0 - max(0.0, temp - 25.0) * 0.004
    return capacity * irradiance_ratio * temp_derating * 0.85
