
---# 🌱 AgriTwin AI — AI Digital Twin for Smart Irrigation & Renewable Energy

**Team Name:** CODEX

---

## 📋 Table of Contents
1. [Problem Statement](#-problem-statement)
2. [Solution Overview](#-solution-overview)
3. [PPT / Presentation Link](#-ppt--presentation-link)
4. [Live Demonstration Link](#-live-demonstration-link)
5. [Technology Stack](#-technology-stack)
6. [Team Members](#-team-members)
7. [Setup Instructions](#-setup-instructions)
8. [System Architecture](#-system-architecture)
9. [Mathematical Modeling & ML Engine](#-mathematical-modeling--ml-engine)
10. [Known Limitations & Assumptions](#-known-limitations--assumptions)
11. [Future Scope](#-future-scope)

---

## 🚨 Problem Statement

Modern agriculture faces severe challenges due to climate volatility, surging energy costs, and resource wastage:

* **Experience-Based & Manual Decisions**: Farmers frequently water crops on fixed timers or subjective estimates, leading to over-irrigation (leaching nutrients and wasting water) or under-irrigation (causing crop stress and reducing yield).
* **Surging Electricity Costs**: Water pumps are highly energy-intensive. Running them during peak grid hours contributes to high utility bills and increased carbon emissions.
* **Expensive Hardware Barriers**: Most "smart farming" solutions require intensive investment in IoT soil sensor meshes, cabling, and field installations — financially inaccessible for small and medium-scale farms.
* **Lack of Predictive Intelligence**: Existing tools monitor current conditions but fail to integrate multi-day weather predictions and grid pricing to plan optimal resource usage.

---

## 💡 Solution Overview

AgriTwin AI is a **software-first, hardware-ready** digital twin platform that creates a virtual replica of a farm's fields, crop water needs, and onsite renewable energy assets (solar, wind, battery) — without requiring any physical sensors to get started.

1. **Virtual Farm Simulation (Digital Twin)**: Simulates daily soil moisture depletion and clean energy yield using physics-based models, removing dependency on expensive hardware.
2. **AI-Driven Smart Scheduler**: Uses a Random Forest suitability model plus weather-adaptive heuristics to schedule pump operations when solar/wind generation is high or grid tariffs are cheapest.
3. **Rain-Adaptive Conservation**: Detects incoming rainfall forecasts and pauses upcoming irrigation cycles, letting nature irrigate and saving pump power.
4. **What-If Stress Sandbox**: Lets farmers simulate heatwaves, droughts, or infrastructure changes to see projected water/power impact before committing resources.

**Why it matters:** unlike most smart-irrigation systems that require an IoT sensor mesh to function, AgriTwin AI works from day one using weather data and physics alone — then gets *more* accurate later if the farmer adds real sensors, instead of requiring them upfront.

---

## 🎥 PPT / Presentation Link



## 🔗 Live Demonstration Link



---

## 🛠️ Technology Stack

### Backend
* **Python 3.12**
* **FastAPI**: High-performance async web framework.
* **SQLAlchemy**: ORM for database queries.
* **SQLite**: Lightweight, file-based database for zero-config runs.
* **Scikit-learn**: Random Forest models for suitability scoring.
* **Pandas / NumPy**: Numerical computation and data manipulation.

### Frontend
* **React 18**: Frontend component library.
* **Vite**: Ultra-fast frontend bundler and dev server.
* **Recharts**: Modular SVG charting library.
* **Lucide React**: Clean vector icons.
* **Custom Vanilla CSS**: Sleek dark mode with glassmorphic panels and responsive grids.

---

## 👥 Team Members

| Name | Role |
|---|---|
| NANDHINI DEVI N | Team Lead — Backend, Digital Twin Engine & ML Scheduler |
| PARIMALA M | Frontend / Repo & Documentation |


---

## 🚀 Setup Instructions

### Option 1: Quick Run with Docker (Recommended)
```bash
git clone <repository-url>
cd agri-twin-ai
docker-compose up --build
```
* React Dashboard: `http://localhost`
* FastAPI Swagger Docs: `http://localhost:8000/docs`

### Option 2: Local Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open:
* Frontend: `http://localhost:5173`
* Backend: `http://127.0.0.1:8000`
* API Docs: `http://127.0.0.1:8000/docs`

---

## 🏗️ System Architecture

```
                  ┌──────────────────────────────┐
                  │      React Frontend (UI)     │
                  │   Vite + Recharts Dashboard   │
                  └──────────────┬───────────────┘
                                 │ HTTP / JSON
                                 ▼
                  ┌──────────────────────────────┐
                  │       FastAPI Backend        │
                  │    Uvicorn API Gateway       │
                  └──────┬────────────────┬──────┘
                         │                │
     ┌───────────────────▼───┐        ┌───▼──────────────────┐
     │  Digital Twin Engine  │        │  AI/ML Scheduling    │
     │  Evapotranspiration   │        │ RandomForestRegressor│
     │  & Energy Physics     │        │  Heuristic Optimizer │
     └───────────────────────┘        └──────────────────────┘
                         │                │
                         └───────┬────────┘
                                 │ SQLAlchemy
                                 ▼
                  ┌──────────────────────────────┐
                  │       SQLite Database        │
                  └──────────────────────────────┘
```

---

## 📊 Mathematical Modeling & ML Engine

### Soil Moisture Depletion (Evapotranspiration)
$$ET_c = K_c \times ET_0$$
$$ET_0 = 3.5 \times \frac{T + 10}{25} \times (1.0 - \frac{H}{100}) \times (1.0 + 0.15 \times W)$$
$$Moisture_{t} = Moisture_{t-1} - \frac{ET_c}{S_{cap}} \times 100\% + \frac{Rain + Irrigation}{S_{cap}} \times 100\%$$

### Microgrid Generation Modeling
$$P_{solar} = Capacity \times \frac{Irradiance}{1000} \times Efficiency \times TempDerating$$
$$P_{wind} = Capacity \times \left(\frac{WindSpeed - 2.5}{12.0 - 2.5}\right)^3$$

---

## ⚠️ Known Limitations & Assumptions

* **Simulation, not sensing**: Soil moisture is estimated via physics-based modeling, not measured directly. Accuracy depends on weather forecast quality and will drift from real field conditions without sensor calibration — this is exactly why the platform is architected to be hardware-ready for future sensor integration.
* **Weather data is seeded, not live**: Current build uses a pre-loaded 7-day forecast dataset for demo reliability. Production deployment would integrate a live weather API.
* **Single-tenant demo**: No farmer authentication or multi-farm account system yet.
* **ML component**: The suitability-scoring model is currently trained on synthetic priors derived from our heuristic rules, designed to be retrained on real telemetry as usage data accumulates.

---

## 🔮 Future Scope

* **Onsite IoT Node Integration**: Connect physical soil/temperature/power sensors to override simulated values with real-world readings.
* **GIS Satellite Analysis**: Incorporate NDVI mapping from Sentinel/Landsat imagery for automatic crop health assessment.
* **Predictive Yield Modeling**: Estimate final harvest yield from historical soil and weather profiles.
* **Autonomous Valve Operations**: Deploy automated relays to actuate irrigation valves from AI schedule signals.
