import sys
import os
import math

# Add backend directory to system path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
import models
import twin_engine
import ml_scheduler

def test_twin_mathematics():
    print("Testing Digital Twin physics modeling...")
    
    # 1. Test evapotranspiration
    # High temp, low humidity, breezy should result in significant ETc
    etc = twin_engine.calculate_evapotranspiration(
        temp=35.0,
        humidity=30.0,
        wind_speed=5.0,
        crop_type="Corn"
    )
    assert etc > 0, "Evapotranspiration should be positive"
    print(f"  - Simulated ETc (35C, 30% Hum, 5m/s wind) for Corn: {etc:.2f} mm/day")
    
    # 2. Test soil moisture depletion
    # Starting at 50%, loamy soil, etc of 6mm, no rain, no water
    new_moisture = twin_engine.calculate_soil_moisture_change(
        current_moisture_pct=50.0,
        etc_mm=6.0,
        precipitation_mm=0.0,
        irrigation_liters=0.0,
        area_hectares=10.0,
        soil_type="Loamy"
    )
    assert new_moisture < 50.0, "Soil moisture should decrease without water input"
    print(f"  - Moisture after 6.0mm depletion on Loamy soil: {new_moisture:.1f}% (from 50%)")
    
    # 3. Test irrigation soil moisture boost
    # 50,000 liters on 5 hectares loamy soil
    boost_moisture = twin_engine.calculate_soil_moisture_change(
        current_moisture_pct=30.0,
        etc_mm=0.0,
        precipitation_mm=0.0,
        irrigation_liters=50000.0,
        area_hectares=5.0,
        soil_type="Loamy"
      )
    assert boost_moisture > 30.0, "Soil moisture should increase after irrigation"
    print(f"  - Moisture after 50,000L irrigation on 5ha Loamy soil: {boost_moisture:.1f}% (from 30%)")
    
    # 4. Test solar generation
    # 60kW capacity, full sun (1000 W/m2) at 25C should yield full capacity * efficiency ratio
    solar_yield = twin_engine.calculate_solar_generation(
        capacity_kw=60.0,
        solar_irradiance=1000.0,
        temp=25.0
    )
    assert math.isclose(solar_yield, 60.0, rel_tol=1e-2), "Should match capacity at STC"
    print(f"  - Solar gen at peak irradiance (1000 W/m2, 25C): {solar_yield:.1f} kW")
    
    # 5. Test battery simulation
    # Deficit of 10kW with 50kWh charge in 100kWh capacity battery
    bat_sim = twin_engine.run_battery_simulation(
        current_charge_kwh=50.0,
        capacity_kwh=100.0,
        net_power_kw=-10.0, # deficit
        time_step_hours=1.0
    )
    assert bat_sim["end_charge_kwh"] < 50.0, "Battery should discharge to cover deficit"
    assert bat_sim["grid_draw_kw"] == 0.0, "Grid draw should be zero when battery has charge"
    print(f"  - Battery state of charge after covering 10kW deficit: {bat_sim['end_charge_kwh']:.1f} kWh")

    print("Twin mathematics tests passed successfully!\n")

def test_database_seeding_and_ml():
    print("Testing Database connectivity and ML Scheduler...")
    
    # Initialize DB (creates sqlite table in memory or local test db)
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    
    try:
        # Seed test database if empty
        if db.query(models.Field).first() is None:
            print("  - Seeding DB with test data...")
            import seed_data
            seed_data.seed_db()
            
        field = db.query(models.Field).first()
        assert field is not None, "Database seeding failed to insert field records"
        print(f"  - Found field: {field.name} ({field.crop_type})")
        
        # Test ML Scheduler
        print("  - Running ML suitability scheduler...")
        schedules = ml_scheduler.predict_irrigation_schedules(db, field.id)
        assert len(schedules) > 0, "Scheduler failed to return schedules"
        print(f"  - Successfully generated {len(schedules)} optimized irrigation slots for {field.name}.")
        
        # Print first few slots
        for slot in schedules[:3]:
            print(f"    * Slot: {slot['time_slot']} | Source: {slot['energy_source']} | Est Cost: ${slot['energy_cost_est']}")
            
        print("Database and ML scheduling tests passed successfully!\n")
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Running AgriTwin AI Backend Test Suite ===")
    test_twin_mathematics()
    test_database_seeding_and_ml()
    print("=== All Tests Completed Successfully! ===")
