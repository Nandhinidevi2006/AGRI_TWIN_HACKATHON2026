import math
from typing import Dict, Any

# Crop Coefficients (Kc) based on FAO-56 standards
CROP_KCOEFFS = {
    "Wheat": 1.15,
    "Corn": 1.20,
    "Tomato": 1.15,
    "Grapes": 0.70,
    "Rice": 1.20,
    "Default": 1.00
}

# Soil Water Holding Capacity (mm of water per decimeter of soil root depth)
# Clay holds water very well (dries slowly); Sand drains water quickly (dries fast)
SOIL_CAPACITIES_MM = {
    "Sandy": 25.0,
    "Loamy": 45.0,
    "Clay": 65.0,
    "Default": 45.0
}

def calculate_evapotranspiration(temp: float, humidity: float, wind_speed: float, crop_type: str) -> float:
    """
    Calculates crop evapotranspiration (ETc) in mm/day.
    Uses a simplified Penman-Monteith / Hargreaves heuristic.
    """
    # Reference ET0 estimation
    # High temp, low humidity, high wind speed -> higher ET0
    humidity_factor = max(0.1, 1.0 - (humidity / 100.0))
    wind_factor = 1.0 + (wind_speed * 0.15)
    temp_factor = max(0.5, (temp + 10.0) / 25.0)
    
    et0 = 3.5 * temp_factor * humidity_factor * wind_factor
    
    # Crop ETc
    kc = CROP_KCOEFFS.get(crop_type, CROP_KCOEFFS["Default"])
    return et0 * kc

def calculate_soil_moisture_change(
    current_moisture_pct: float,
    etc_mm: float,
    precipitation_mm: float,
    irrigation_liters: float,
    area_hectares: float,
    soil_type: str
) -> float:
    """
    Models soil moisture changes over time.
    Returns the new soil moisture percentage (0% to 100%).
    """
    soil_cap = SOIL_CAPACITIES_MM.get(soil_type, SOIL_CAPACITIES_MM["Default"])
    
    # 1 mm of rain/water = 1 liter per square meter.
    # 1 hectare = 10,000 square meters.
    # Therefore, 10,000 liters of irrigation on 1 hectare = 1 mm depth.
    irrigation_mm = 0.0
    if area_hectares > 0:
        irrigation_mm = irrigation_liters / (area_hectares * 10000.0)
        
    # Net water balance in mm
    net_water_mm = precipitation_mm + irrigation_mm - etc_mm
    
    # Convert net water change in mm to percentage change
    # e.g., if soil capacity is 45mm, adding 4.5mm of water increases moisture by 10%
    moisture_change_pct = (net_water_mm / soil_cap) * 100.0
    
    new_moisture = current_moisture_pct + moisture_change_pct
    
    # Clamp between 0% and 100%
    return max(0.0, min(100.0, new_moisture))

def calculate_solar_generation(capacity_kw: float, solar_irradiance: float, temp: float, efficiency: float = 0.18) -> float:
    """
    Calculates solar power generation in kW.
    Standard panel efficiency decreases slightly at extremely high temperatures.
    """
    # Irradiance is in W/m2. Standard Test Conditions (STC) is 1000 W/m2.
    # We estimate power output relative to 1000 W/m2 and apply temp derating.
    if capacity_kw <= 0:
        return 0.0
        
    irradiance_ratio = min(1.2, solar_irradiance / 1000.0)
    
    # Temperature coefficient derating (above 25C, efficiency drops ~0.4% per degree C)
    temp_derating = 1.0
    if temp > 25.0:
        temp_derating = 1.0 - (temp - 25.0) * 0.004
        
    return capacity_kw * irradiance_ratio * temp_derating * (efficiency / 0.18)

def calculate_wind_generation(capacity_kw: float, wind_speed: float) -> float:
    """
    Calculates wind power generation in kW using a standard wind power curve.
    Cut-in speed: 2.5 m/s, Rated speed: 12.0 m/s, Cut-out speed: 25.0 m/s.
    """
    if capacity_kw <= 0:
        return 0.0
    
    # Simple wind power curve model
    if wind_speed < 2.5 or wind_speed > 25.0:
        return 0.0
    elif wind_speed >= 12.0:
        return capacity_kw
    else:
        # Power is proportional to the cube of wind speed between cut-in and rated speed
        ratio = (wind_speed - 2.5) / (12.0 - 2.5)
        return capacity_kw * (ratio ** 3)

def run_battery_simulation(
    current_charge_kwh: float,
    capacity_kwh: float,
    net_power_kw: float,
    time_step_hours: float = 1.0,
    charge_efficiency: float = 0.90,
    discharge_efficiency: float = 0.90
) -> Dict[str, float]:
    """
    Simulates battery charging/discharging over a time step.
    Returns: {
        "end_charge_kwh": float,
        "grid_draw_kw": float,
        "battery_discharge_kw": float,
        "battery_charge_kw": float,
        "curtailed_renewable_kw": float
    }
    """
    if capacity_kwh <= 0:
        return {
            "end_charge_kwh": 0.0,
            "grid_draw_kw": max(0.0, -net_power_kw),
            "battery_discharge_kw": 0.0,
            "battery_charge_kw": 0.0,
            "curtailed_renewable_kw": max(0.0, net_power_kw)
        }
        
    grid_draw = 0.0
    bat_discharge = 0.0
    bat_charge = 0.0
    curtailed = 0.0
    
    if net_power_kw >= 0:
        # We have excess renewable power. Charge battery.
        available_charge_power = net_power_kw
        max_possible_charge_kwh = capacity_kwh - current_charge_kwh
        charge_kwh = min(available_charge_power * time_step_hours * charge_efficiency, max_possible_charge_kwh)
        
        end_charge = current_charge_kwh + charge_kwh
        bat_charge = (charge_kwh / charge_efficiency) / time_step_hours
        curtailed = available_charge_power - bat_charge
    else:
        # We have a power deficit (e.g. pump running, low sun). Discharge battery.
        power_deficit = -net_power_kw
        max_possible_discharge_kwh = current_charge_kwh * discharge_efficiency
        needed_discharge_kwh = power_deficit * time_step_hours
        
        discharge_kwh = min(needed_discharge_kwh, max_possible_discharge_kwh)
        end_charge = current_charge_kwh - (discharge_kwh / discharge_efficiency)
        bat_discharge = discharge_kwh / time_step_hours
        
        # If battery couldn't cover everything, draw from grid
        grid_draw = max(0.0, power_deficit - bat_discharge)
        
    return {
        "end_charge_kwh": max(0.0, min(capacity_kwh, end_charge)),
        "grid_draw_kw": grid_draw,
        "battery_discharge_kw": bat_discharge,
        "battery_charge_kw": bat_charge,
        "curtailed_renewable_kw": curtailed
    }
