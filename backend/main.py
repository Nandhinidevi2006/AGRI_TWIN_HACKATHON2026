import datetime
import math
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import engine, Base, get_db
import models
import schemas
import twin_engine
import ml_scheduler
from seed_data import seed_db

app = FastAPI(title="AgriTwin AI API", description="Digital Twin & ML Engine for smart irrigation & energy management")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AgriTwin AI API is running.",
        "frontend": "http://localhost:5173",
        "docs": "/docs",
        "health": "/api/fields"
    }

@app.on_event("startup")
def startup_event():
    # Make sure tables exist and are seeded
    Base.metadata.create_all(bind=engine)
    seed_db()

# --- Fields Endpoints ---

@app.get("/api/fields", response_model=List[schemas.FieldResponse])
def get_fields(db: Session = Depends(get_db)):
    return db.query(models.Field).all()

@app.get("/api/fields/{field_id}", response_model=schemas.FieldResponse)
def get_field(field_id: int, db: Session = Depends(get_db)):
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field

@app.post("/api/fields", response_model=schemas.FieldResponse)
def create_field(field: schemas.FieldCreate, db: Session = Depends(get_db)):
    db_field = models.Field(**field.dict())
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    
    # Auto-add a pump for the new field
    db_pump = models.WaterPump(
        name=f"Pump for {field.name}",
        field_id=db_field.id,
        power_consumption_kw=5.0,
        flow_rate_lpm=150.0,
        grid_cost_kwh=0.15
    )
    db.add(db_pump)
    db.commit()
    db.refresh(db_field)
    
    # Generate initial schedules
    schedules = ml_scheduler.predict_irrigation_schedules(db, db_field.id)
    for s in schedules:
        db.add(models.PumpSchedule(**s))
    db.commit()
    
    return db_field

@app.put("/api/fields/{field_id}", response_model=schemas.FieldResponse)
def update_field(field_id: int, field_data: schemas.FieldCreate, db: Session = Depends(get_db)):
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    for key, value in field_data.dict().items():
        setattr(field, key, value)
        
    db.commit()
    db.refresh(field)
    
    # Recalculate schedules since thresholds/crops changed
    db.query(models.PumpSchedule).filter(
        models.PumpSchedule.pump_id.in_([p.id for p in field.pumps])
    ).delete(synchronize_session=False)
    
    schedules = ml_scheduler.predict_irrigation_schedules(db, field_id)
    for s in schedules:
        db.add(models.PumpSchedule(**s))
    db.commit()
    
    return field

@app.delete("/api/fields/{field_id}")
def delete_field(field_id: int, db: Session = Depends(get_db)):
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field)
    db.commit()
    return {"detail": "Field deleted successfully"}

# --- Renewable Assets Endpoints ---

@app.get("/api/assets", response_model=List[schemas.RenewableAssetResponse])
def get_assets(db: Session = Depends(get_db)):
    return db.query(models.RenewableAsset).all()

@app.put("/api/assets/{asset_id}", response_model=schemas.RenewableAssetResponse)
def update_asset(asset_id: int, asset_data: schemas.RenewableAssetCreate, db: Session = Depends(get_db)):
    asset = db.query(models.RenewableAsset).filter(models.RenewableAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    for key, value in asset_data.dict().items():
        setattr(asset, key, value)
        
    db.commit()
    db.refresh(asset)
    
    # Regenerate schedules for all fields since power source capacity changed
    db.query(models.PumpSchedule).delete()
    fields = db.query(models.Field).all()
    for f in fields:
        schedules = ml_scheduler.predict_irrigation_schedules(db, f.id)
        for s in schedules:
            db.add(models.PumpSchedule(**s))
    db.commit()
    
    return asset

# --- Pumps Endpoints ---

@app.get("/api/pumps", response_model=List[schemas.WaterPumpResponse])
def get_pumps(db: Session = Depends(get_db)):
    return db.query(models.WaterPump).all()

@app.post("/api/pumps/{pump_id}/toggle")
def toggle_pump(pump_id: int, db: Session = Depends(get_db)):
    pump = db.query(models.WaterPump).filter(models.WaterPump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pump not found")
        
    pump.is_active = not pump.is_active
    db.commit()
    
    # If turned on manually, simulate a soil moisture update
    if pump.is_active and pump.field:
        field = pump.field
        # Instant moisture boost from manual watering
        field.current_moisture = min(100.0, field.current_moisture + 5.0)
        db.commit()
        
    return {"id": pump.id, "is_active": pump.is_active, "field_moisture": pump.field.current_moisture if pump.field else None}

# --- Telemetry Logs Endpoints ---

@app.get("/api/telemetry/{field_id}", response_model=List[schemas.TelemetryLogResponse])
def get_telemetry(field_id: int, db: Session = Depends(get_db)):
    return db.query(models.TelemetryLog).filter(models.TelemetryLog.field_id == field_id).order_by(models.TelemetryLog.timestamp.asc()).all()

# --- Schedules Endpoints ---

@app.get("/api/schedules", response_model=List[schemas.PumpScheduleResponse])
def get_schedules(db: Session = Depends(get_db)):
    return db.query(models.PumpSchedule).order_by(models.PumpSchedule.time_slot.asc()).all()

@app.post("/api/schedules/reoptimize")
def reoptimize_schedules(db: Session = Depends(get_db)):
    db.query(models.PumpSchedule).delete()
    fields = db.query(models.Field).all()
    
    total_added = 0
    for f in fields:
        schedules = ml_scheduler.predict_irrigation_schedules(db, f.id)
        for s in schedules:
            db.add(models.PumpSchedule(**s))
            total_added += 1
            
    db.commit()
    return {"detail": f"Successfully reoptimized. Added {total_added} scheduled slots."}

# --- Digital Twin Simulator Sandbox Endpoint ---

@app.post("/api/simulate", response_model=schemas.SimulationResponse)
def simulate_scenario(req: schemas.SimulationRequest, db: Session = Depends(get_db)):
    """
    Runs a 7-day sandbox Digital Twin simulation with weather and asset modifiers.
    Calculates depletion with vs without smart irrigation, grid drawing, and cost/carbon savings.
    """
    fields = db.query(models.Field).all()
    if not fields:
        raise HTTPException(status_code=400, detail="No fields seeded. Cannot simulate.")
        
    # Use North Cornfield (first field) as the primary simulation target
    field = fields[0]
    pump = field.pumps[0] if field.pumps else None
    
    forecasts = db.query(models.WeatherForecast).order_by(models.WeatherForecast.day_offset).all()
    assets = db.query(models.RenewableAsset).all()
    
    solar_asset = next((a for a in assets if a.type == "Solar"), None)
    wind_asset = next((a for a in assets if a.type == "Wind"), None)
    battery_asset = next((a for a in assets if a.type == "Battery"), None)
    
    # Overrides from request
    solar_cap = req.solar_capacity_kw if req.solar_capacity_kw is not None else (solar_asset.capacity if solar_asset else 0.0)
    wind_cap = wind_asset.capacity if wind_asset else 0.0
    bat_cap = req.battery_capacity_kwh if req.battery_capacity_kwh is not None else (battery_asset.capacity if battery_asset else 0.0)
    
    # Starting conditions
    moisture_no_irrig = field.current_moisture
    moisture_with_smart = field.current_moisture
    battery_charge = (battery_asset.current_soc / 100.0) * bat_cap if battery_asset else 0.0
    
    days_detail = []
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    start_weekday = datetime.datetime.now().weekday()
    
    for day_idx in range(7):
        fc = forecasts[day_idx] if day_idx < len(forecasts) else forecasts[-1]
        day_name = weekday_names[(start_weekday + day_idx) % 7]
        
        # Apply modifiers
        temp = ((fc.temp_min + fc.temp_max) / 2.0) * req.temp_multiplier
        humidity = max(10.0, min(100.0, fc.humidity * req.humidity_multiplier))
        solar_irrad = fc.solar_irradiance * req.solar_multiplier
        
        # Rain override
        precip = fc.precipitation_mm
        status = fc.status
        if req.rain_override == "force_rain":
            precip = 20.0
            status = "Rainy"
        elif req.rain_override == "force_dry":
            precip = 0.0
            status = "Sunny"
            
        # Calculate daily ETc
        etc_daily = twin_engine.calculate_evapotranspiration(temp, humidity, fc.wind_speed, field.crop_type)
        
        # Scenario A: No irrigation (just let crops dry out)
        moisture_no_irrig = twin_engine.calculate_soil_moisture_change(
            moisture_no_irrig,
            etc_daily,
            precip,
            0.0, # no irrigation
            field.area_hectares,
            field.soil_type
        )
        
        # Scenario B: Smart Irrigation
        # Simulating at a daily aggregate level for Sandbox convenience
        irrigation_needed = moisture_with_smart < field.optimal_min_moisture
        
        # Do not water if rain is coming today or tomorrow (precip > 5mm)
        rain_predicted_soon = precip > 5.0 or (day_idx + 1 < len(forecasts) and forecasts[day_idx+1].precipitation_mm > 5.0)
        
        # If critical (below min moisture - 10%), water regardless of rain
        water_volume = 0.0
        if irrigation_needed:
            if not rain_predicted_soon or moisture_with_smart < (field.optimal_min_moisture - 10.0):
                # Calculate water required to restore to mid point of optimal range
                target = (field.optimal_min_moisture + field.optimal_max_moisture) / 2.0
                soil_cap = twin_engine.SOIL_CAPACITIES_MM.get(field.soil_type, 45.0)
                deficit_mm = ((target - moisture_with_smart) / 100.0) * soil_cap
                water_volume = deficit_mm * field.area_hectares * 10000.0 # 1 mm per hectare = 10,000 liters
                water_volume = max(2000.0, min(80000.0, water_volume)) # Safety clamps
                
        # Update Smart Moisture
        moisture_with_smart = twin_engine.calculate_soil_moisture_change(
            moisture_with_smart,
            etc_daily,
            precip,
            water_volume,
            field.area_hectares,
            field.soil_type
        )
        
        # Energy yield calculations for the day (12 hours of light)
        solar_gen_kwh = 0.0
        for h in range(6, 18):
            solar_irrad_h = solar_irrad * max(0.0, math.sin((h - 6) * math.pi / 12.0))
            solar_gen_kwh += twin_engine.calculate_solar_generation(solar_cap, solar_irrad_h, temp)
            
        wind_gen_kwh = twin_engine.calculate_wind_generation(wind_cap, fc.wind_speed) * 24.0
        total_renewable_kwh = solar_gen_kwh + wind_gen_kwh
        
        # Water pump energy requirement
        pump_energy_kwh = 0.0
        if water_volume > 0 and pump:
            # How long to run pump?
            run_time_min = water_volume / pump.flow_rate_lpm
            pump_energy_kwh = pump.power_consumption_kw * (run_time_min / 60.0)
            
        # Run Battery Simulation for the day
        net_power_balance = total_renewable_kwh - pump_energy_kwh
        bat_sim = twin_engine.run_battery_simulation(
            battery_charge,
            bat_cap,
            net_power_balance,
            time_step_hours=1.0 # treated as aggregate daily
        )
        
        battery_charge = bat_sim["end_charge_kwh"]
        grid_draw_kwh = bat_sim["grid_draw_kw"]
        renewable_power_used_kwh = min(pump_energy_kwh, total_renewable_kwh + (battery_charge - bat_sim["battery_discharge_kw"]))
        
        # Cost savings calculation
        # Baseline cost: running entirely on grid electricity
        baseline_cost = pump_energy_kwh * 0.18 # average grid rate
        actual_grid_cost = grid_draw_kwh * 0.18
        cost_saved = max(0.0, baseline_cost - actual_grid_cost)
        
        # Carbon savings calculation (approx 0.4 kg CO2 per grid kWh saved)
        carbon_saved = (pump_energy_kwh - grid_draw_kwh) * 0.4
        
        days_detail.append(schemas.SimulationDayDetail(
            day_offset=day_idx,
            day_name=day_name,
            weather_status=status,
            soil_moisture_depleted=round(moisture_no_irrig, 1),
            soil_moisture_with_smart_irrigation=round(moisture_with_smart, 1),
            irrigation_needed=water_volume > 0,
            water_applied_liters=round(water_volume, 0),
            solar_gen_kwh=round(solar_gen_kwh, 1),
            wind_gen_kwh=round(wind_gen_kwh, 1),
            battery_end_soc=round((battery_charge / bat_cap * 100.0), 1) if bat_cap > 0 else 0.0,
            grid_power_kwh=round(grid_draw_kwh, 1),
            renewable_power_kwh=round(renewable_power_used_kwh, 1),
            cost_saved=round(cost_saved, 2),
            carbon_saved=round(carbon_saved, 1)
        ))
        
    # Build summary text based on inputs
    sum_parts = []
    if req.temp_multiplier > 1.1:
        sum_parts.append("Heatwave conditions simulated: Evapotranspiration is elevated by approx 20-30%, causing rapid moisture depletion.")
    if req.rain_override == "force_rain":
        sum_parts.append("Precipitation override active: Rain refilled the crop soil, resulting in 100% smart water pump power saving.")
    if req.solar_capacity_kw is not None and req.solar_capacity_kw > solar_asset.capacity:
        sum_parts.append(f"Enhanced solar capacity ({req.solar_capacity_kw}kW) increased battery charging rates, reducing grid reliance.")
        
    summary = " ".join(sum_parts) if sum_parts else "Standard weather patterns simulated. Smart irrigation successfully avoided peak electricity hours and anticipated forecasts."
    
    return schemas.SimulationResponse(
        summary=summary,
        days=days_detail
    )
