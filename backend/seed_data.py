import datetime
import random
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models

def seed_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(models.Field).first() is not None:
            print("Database already seeded.")
            return

        print("Seeding fields...")
        f1 = models.Field(
            name="North Cornfield",
            crop_type="Corn",
            soil_type="Loamy",
            area_hectares=12.5,
            current_moisture=48.0,
            optimal_min_moisture=40.0,
            optimal_max_moisture=75.0
        )
        f2 = models.Field(
            name="South Orchard",
            crop_type="Grapes",
            soil_type="Sandy",
            area_hectares=8.0,
            current_moisture=36.0,
            optimal_min_moisture=30.0,
            optimal_max_moisture=60.0
        )
        f3 = models.Field(
            name="East Greenhouse",
            crop_type="Tomato",
            soil_type="Clay",
            area_hectares=2.5,
            current_moisture=56.0,
            optimal_min_moisture=50.0,
            optimal_max_moisture=80.0
        )
        db.add_all([f1, f2, f3])
        db.commit()

        print("Seeding assets...")
        solar = models.RenewableAsset(name="Solar Array Alpha", type="Solar", capacity=60.0, current_soc=0.0, efficiency=0.18)
        wind = models.RenewableAsset(name="Wind Turbine Beta", type="Wind", capacity=25.0, current_soc=0.0, efficiency=0.40)
        battery = models.RenewableAsset(name="Lithium Battery Pack", type="Battery", capacity=100.0, current_soc=75.0, efficiency=0.90)
        db.add_all([solar, wind, battery])
        db.commit()

        print("Seeding pumps...")
        pump1 = models.WaterPump(name="Irrigation Pump A", field_id=f1.id, power_consumption_kw=15.0, flow_rate_lpm=400.0, grid_cost_kwh=0.15)
        pump2 = models.WaterPump(name="Drip Pump B", field_id=f2.id, power_consumption_kw=5.5, flow_rate_lpm=150.0, grid_cost_kwh=0.15)
        pump3 = models.WaterPump(name="Sprinkler Pump C", field_id=f3.id, power_consumption_kw=3.0, flow_rate_lpm=80.0, grid_cost_kwh=0.15)
        db.add_all([pump1, pump2, pump3])
        db.commit()

        print("Seeding weather forecast...")
        forecasts = [
            models.WeatherForecast(day_offset=0, status="Sunny", temp_min=22.0, temp_max=32.0, humidity=55.0, solar_irradiance=820.0, wind_speed=4.5, precipitation_mm=0.0),
            models.WeatherForecast(day_offset=1, status="Sunny", temp_min=23.0, temp_max=33.0, humidity=50.0, solar_irradiance=850.0, wind_speed=3.8, precipitation_mm=0.0),
            models.WeatherForecast(day_offset=2, status="Overcast", temp_min=20.0, temp_max=26.0, humidity=72.0, solar_irradiance=420.0, wind_speed=5.2, precipitation_mm=0.0),
            models.WeatherForecast(day_offset=3, status="Rainy", temp_min=17.0, temp_max=21.0, humidity=88.0, solar_irradiance=180.0, wind_speed=6.8, precipitation_mm=18.5),
            models.WeatherForecast(day_offset=4, status="Rainy", temp_min=16.0, temp_max=20.0, humidity=92.0, solar_irradiance=120.0, wind_speed=8.0, precipitation_mm=24.0),
            models.WeatherForecast(day_offset=5, status="Sunny", temp_min=19.0, temp_max=28.0, humidity=62.0, solar_irradiance=720.0, wind_speed=3.5, precipitation_mm=0.0),
            models.WeatherForecast(day_offset=6, status="Heatwave", temp_min=25.0, temp_max=37.0, humidity=38.0, solar_irradiance=960.0, wind_speed=2.2, precipitation_mm=0.0)
        ]
        db.add_all(forecasts)
        db.commit()

        print("Generating historical telemetry logs for the last 24 hours...")
        now = datetime.datetime.utcnow()
        for hour in range(24, 0, -1):
            timestamp = now - datetime.timedelta(hours=hour)
            
            # Solar generation pattern based on hour of day
            h_of_day = timestamp.hour
            solar_multiplier = max(0.0, (12.0 - abs(h_of_day - 13.0)) / 6.0) if 6 <= h_of_day <= 18 else 0.0
            solar_power = solar.capacity * solar_multiplier * 0.85
            
            # Wind generation pattern
            wind_power = wind.capacity * (0.2 + 0.3 * random.uniform(0.5, 1.5))
            
            # Battery charge SOC variation
            battery_soc = 40.0 + 35.0 * solar_multiplier + random.uniform(-2, 2)
            battery_soc = max(0.0, min(100.0, battery_soc))
            
            # Add logs for field 1 (Corn)
            db.add(models.TelemetryLog(
                timestamp=timestamp,
                field_id=f1.id,
                soil_moisture=52.0 - (hour * 0.15) + (3.0 if h_of_day == 14 else 0), # Simulates irrigation bump at 2pm
                temperature=24.0 + 6.0 * solar_multiplier + random.uniform(-1, 1),
                humidity=65.0 - 20.0 * solar_multiplier + random.uniform(-3, 3),
                battery_charge=battery_soc,
                grid_draw_kw=15.0 if h_of_day == 14 and solar_multiplier < 0.5 else 0.0,
                renewable_gen_kw=solar_power + wind_power
            ))
            
            # Add logs for field 2 (Grapes)
            db.add(models.TelemetryLog(
                timestamp=timestamp,
                field_id=f2.id,
                soil_moisture=38.0 - (hour * 0.08),
                temperature=25.0 + 7.0 * solar_multiplier + random.uniform(-1.5, 1.5),
                humidity=60.0 - 22.0 * solar_multiplier + random.uniform(-3, 3),
                battery_charge=battery_soc,
                grid_draw_kw=0.0,
                renewable_gen_kw=solar_power + wind_power
            ))
            
            # Add logs for field 3 (Tomatoes)
            db.add(models.TelemetryLog(
                timestamp=timestamp,
                field_id=f3.id,
                soil_moisture=58.0 - (hour * 0.12),
                temperature=23.0 + 4.0 * solar_multiplier + random.uniform(-0.5, 0.5),
                humidity=70.0 - 15.0 * solar_multiplier + random.uniform(-2, 2),
                battery_charge=battery_soc,
                grid_draw_kw=0.0,
                renewable_gen_kw=solar_power + wind_power
            ))
            
        db.commit()
        print("Telemetry logs seeded.")
        
        # Build initial schedules
        import ml_scheduler
        for f in [f1, f2, f3]:
            schedules = ml_scheduler.predict_irrigation_schedules(db, f.id)
            for s in schedules:
                db_sched = models.PumpSchedule(**s)
                db.add(db_sched)
        db.commit()
        print("Initial ML pump schedules generated.")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
    print("Database seeding completed successfully!")
