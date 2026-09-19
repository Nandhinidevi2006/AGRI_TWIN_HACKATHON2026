from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Weather ---
class WeatherForecastBase(BaseModel):
    day_offset: int
    status: str
    temp_min: float
    temp_max: float
    humidity: float
    solar_irradiance: float
    wind_speed: float
    precipitation_mm: float

class WeatherForecastResponse(WeatherForecastBase):
    id: int
    class Config:
        from_attributes = True

# --- Water Pump ---
class WaterPumpBase(BaseModel):
    name: str
    field_id: int
    power_consumption_kw: float
    flow_rate_lpm: float
    grid_cost_kwh: float
    is_active: bool

class WaterPumpCreate(BaseModel):
    name: str
    field_id: int
    power_consumption_kw: float
    flow_rate_lpm: float
    grid_cost_kwh: float

class WaterPumpResponse(WaterPumpBase):
    id: int
    class Config:
        from_attributes = True

# --- Field ---
class FieldBase(BaseModel):
    name: str
    crop_type: str
    soil_type: str
    area_hectares: float
    current_moisture: float
    optimal_min_moisture: float
    optimal_max_moisture: float

class FieldCreate(BaseModel):
    name: str
    crop_type: str
    soil_type: str
    area_hectares: float
    optimal_min_moisture: float
    optimal_max_moisture: float

class FieldResponse(FieldBase):
    id: int
    pumps: List[WaterPumpResponse] = []
    class Config:
        from_attributes = True

# --- Renewable Asset ---
class RenewableAssetBase(BaseModel):
    name: str
    type: str
    capacity: float
    current_soc: float
    efficiency: float

class RenewableAssetCreate(BaseModel):
    name: str
    type: str
    capacity: float
    current_soc: Optional[float] = 100.0
    efficiency: Optional[float] = 0.85

class RenewableAssetResponse(RenewableAssetBase):
    id: int
    class Config:
        from_attributes = True

# --- Telemetry Log ---
class TelemetryLogResponse(BaseModel):
    id: int
    timestamp: datetime
    field_id: int
    soil_moisture: float
    temperature: float
    humidity: float
    battery_charge: float
    grid_draw_kw: float
    renewable_gen_kw: float
    class Config:
        from_attributes = True

# --- Pump Schedule ---
class PumpScheduleBase(BaseModel):
    pump_id: int
    time_slot: str
    duration_minutes: int
    water_volume_liters: float
    energy_source: str
    energy_cost_est: float
    completed: bool

class PumpScheduleResponse(PumpScheduleBase):
    id: int
    class Config:
        from_attributes = True

# --- Simulations ---
class SimulationRequest(BaseModel):
    temp_multiplier: Optional[float] = 1.0  # e.g., 1.2 to simulate 20% hotter days
    humidity_multiplier: Optional[float] = 1.0
    solar_multiplier: Optional[float] = 1.0
    rain_override: Optional[str] = None  # "force_rain", "force_dry", or None
    battery_capacity_kwh: Optional[float] = None
    solar_capacity_kw: Optional[float] = None

class SimulationDayDetail(BaseModel):
    day_offset: int
    day_name: str
    weather_status: str
    soil_moisture_depleted: float  # Moisture without irrigation
    soil_moisture_with_smart_irrigation: float # Moisture with scheduled irrigation
    irrigation_needed: bool
    water_applied_liters: float
    solar_gen_kwh: float
    wind_gen_kwh: float
    battery_end_soc: float
    grid_power_kwh: float
    renewable_power_kwh: float
    cost_saved: float
    carbon_saved: float

class SimulationResponse(BaseModel):
    summary: str
    days: List[SimulationDayDetail]
