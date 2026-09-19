from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    crop_type = Column(String)  # Wheat, Corn, Tomato, Grapes, Rice
    soil_type = Column(String)  # Sandy, Loamy, Clay
    area_hectares = Column(Float)
    current_moisture = Column(Float, default=45.0)  # Percent percentage (0-100)
    optimal_min_moisture = Column(Float, default=35.0)
    optimal_max_moisture = Column(Float, default=75.0)

    pumps = relationship("WaterPump", back_populates="field", cascade="all, delete-orphan")
    telemetry_logs = relationship("TelemetryLog", back_populates="field", cascade="all, delete-orphan")

class RenewableAsset(Base):
    __tablename__ = "renewable_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)  # "Solar", "Wind", "Battery"
    capacity = Column(Float)  # Solar/Wind in kW, Battery in kWh
    current_soc = Column(Float, default=100.0)  # For Battery: State of Charge (%), others 0.0
    efficiency = Column(Float, default=0.85)

class WaterPump(Base):
    __tablename__ = "water_pumps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    power_consumption_kw = Column(Float)
    flow_rate_lpm = Column(Float)  # Liters Per Minute
    grid_cost_kwh = Column(Float, default=0.15)  # Electricity cost rate ($ per kWh)
    is_active = Column(Boolean, default=False)

    field = relationship("Field", back_populates="pumps")
    schedules = relationship("PumpSchedule", back_populates="pump", cascade="all, delete-orphan")

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    field_id = Column(Integer, ForeignKey("fields.id"))
    soil_moisture = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    battery_charge = Column(Float)  # State of Charge at log time
    grid_draw_kw = Column(Float)
    renewable_gen_kw = Column(Float)

    field = relationship("Field", back_populates="telemetry_logs")

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    day_offset = Column(Integer)  # 0 for today, 1 for tomorrow, etc. (0 to 6)
    status = Column(String)  # "Sunny", "Rainy", "Heatwave", "Overcast"
    temp_min = Column(Float)
    temp_max = Column(Float)
    humidity = Column(Float)
    solar_irradiance = Column(Float)  # W/m2
    wind_speed = Column(Float)  # m/s
    precipitation_mm = Column(Float, default=0.0)

class PumpSchedule(Base):
    __tablename__ = "pump_schedules"

    id = Column(Integer, primary_key=True, index=True)
    pump_id = Column(Integer, ForeignKey("water_pumps.id"))
    time_slot = Column(String)  # Format: "YYYY-MM-DD HH:00"
    duration_minutes = Column(Integer)
    water_volume_liters = Column(Float)
    energy_source = Column(String)  # "Solar", "Wind", "Battery", "Grid", "Hybrid"
    energy_cost_est = Column(Float)
    completed = Column(Boolean, default=False)

    pump = relationship("WaterPump", back_populates="schedules")
