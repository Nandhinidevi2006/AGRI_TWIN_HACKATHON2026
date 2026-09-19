
# 🌱 AgriTwin AI — Digital Twin for Smart Irrigation & Renewable Energy
 
**Team:** CODEX
 
---
 
## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [PPT / Presentation Link](#ppt--presentation-link)
4. [Live Demonstration Link](#live-demonstration-link)
5. [Technology Stack](#technology-stack)
6. [Team Members](#team-members)
7. [Setup Instructions](#setup-instructions)
8. [System Architecture](#system-architecture)
9. [Mathematical Modeling & ML Engine](#mathematical-modeling--ml-engine)
10. [Known Limitations](#known-limitations)
11. [Future Scope](#future-scope)
---
 
## Problem Statement
 
Water and electricity are two of the biggest recurring costs on a farm, and most farmers still manage both by feel rather than by data. Irrigation usually runs on a fixed schedule or gut instinct — water the field every morning, whether the soil actually needs it or not. This leads to two failure modes at once: over-watering, which wastes water and washes nutrients out of the soil, or under-watering, which stresses the crop and cuts yield.
 
On top of that, water pumps are power-hungry, and running them during peak grid hours quietly inflates electricity bills month after month. There's technology that solves parts of this — soil sensor networks, IoT-based irrigation controllers — but almost all of it assumes the farmer can afford a mesh of physical sensors, gateways, and wiring across every field. For a lot of small and mid-sized farms, that upfront cost alone rules it out before they even get to test if it works.
 
So the gap isn't a lack of smart-irrigation ideas — it's that the smart ones are usually priced out of reach for the farmers who'd benefit the most, and even the ones farmers can afford rarely account for *when* the electricity itself is cheap or clean.
 
---
 
## Solution Overview
 
We built AgriTwin AI to answer one question: can a farm get smart irrigation without buying a single sensor first?
 
The idea is a digital twin — a virtual model of a farmer's field that simulates soil moisture and energy conditions using weather data and physics, instead of requiring hardware readings from day one. If a farmer wants to add real soil sensors later, the twin can absorb that data and get more accurate over time. But it doesn't have to wait for that to be useful.
 
What it actually does:
 
- **Simulates the field**: tracks how soil moisture rises and falls day to day based on temperature, humidity, wind, and rainfall, using standard evapotranspiration modeling.
- **Schedules the pump intelligently**: a Random Forest–based scorer, combined with rule-based logic, figures out when solar or wind generation is high, or when grid electricity is cheapest, and times irrigation around that.
- **Reads the weather before it happens**: if rain is forecast, it holds off on irrigation instead of watering right before the sky does it for free.
- **Lets you stress-test the farm**: a "what-if" sandbox where you can simulate a heatwave, a drought, or a bigger solar array, and see the water/cost/power impact before actually changing anything.
The bet we're making is that removing the hardware barrier gets a lot more farms to actually start using something like this, even if it means the first version leans on modeling instead of sensors. It's a starting point, not a finished precision-agriculture system — and we've tried to be upfront about that rather than oversell it.
 
---
 
 
## Live Demonstration Link

 https://agri-twin-hackmatrix2026-1.onrender.com

## Demo video link
 
  https://drive.google.com/file/d/1khNqP3SkTEtgKa0kmYKcJHRhtTnwM8tR/view?usp=sharing
 
 
---
 
## Technology Stack
 
### Backend
- Python 3.12
- FastAPI for the API layer
- SQLAlchemy as the ORM
- SQLite for storage (no external DB setup needed to run it)
- Scikit-learn — Random Forest model for irrigation suitability scoring
- Pandas / NumPy for the numerical work behind the twin engine
### Frontend
- React 18
- Vite for the dev server and build
- Recharts for the dashboard's charts
- Lucide React for icons
- Hand-written CSS for the dark, glassmorphic dashboard look (no UI framework)

 
## Team Members
 
| Name | Role |
|---|---|
| Nandhini Devi N | Team Lead — Backend, Digital Twin Engine & ML Scheduler |
| Parimala M | Frontend, Repo & Documentation |
 
---
 
## Setup Instructions
 
### Docker (fastest way to run it)
```bash
git clone <repository-url>
cd AGRI_TWIN_HACKMATRIX2026
docker-compose up --build
```
- Dashboard: `http://localhost`
- API docs: `http://localhost:8000/docs`
### Running it manually
 
Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
 
Frontend (separate terminal):
```bash
cd frontend
npm install
npm run dev
```
 
Once both are running:
- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`
---
 
## System Architecture
 
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
 
The frontend never talks to the database directly — everything routes through FastAPI, which keeps the twin engine and ML scheduler as the single source of truth for irrigation decisions.
 
---
 
## Mathematical Modeling & ML Engine
 
**Soil moisture depletion.** Crop water loss (evapotranspiration, $ET_c$) depends on the crop type ($K_c$) and a reference evapotranspiration value ($ET_0$):
 
$$ET_c = K_c \times ET_0$$
 
We estimate $ET_0$ from temperature, humidity, and wind speed:
 
$$ET_0 = 3.5 \times \frac{T + 10}{25} \times (1.0 - \frac{H}{100}) \times (1.0 + 0.15 \times W)$$
 
Each day's soil moisture is then updated as:
 
$$Moisture_{t} = Moisture_{t-1} - \frac{ET_c}{S_{cap}} \times 100\% + \frac{Rain + Irrigation}{S_{cap}} \times 100\%$$
 
**Renewable generation.** Solar and wind output are modeled with fairly standard formulas — solar scales with irradiance and derates with heat, wind follows a cubic power curve within the turbine's cut-in/cut-out range:
 
$$P_{solar} = Capacity \times \frac{Irradiance}{1000} \times Efficiency \times TempDerating$$
 
$$P_{wind} = Capacity \times \left(\frac{WindSpeed - 2.5}{12.0 - 2.5}\right)^3$$
 
**The ML piece.** The Random Forest model scores how "worth it" a given hour is for irrigation, based on renewable output, grid price, and how dry the soil currently is. Right now it's trained on synthetic examples generated from our own scoring heuristic — it's essentially learning a smoothed version of the rule we already wrote. The plan is to swap that training data for real usage logs once the system runs on an actual field for a while, at which point it should start catching patterns the heuristic alone wouldn't.
 
---
 
## Known Limitations
 
We'd rather list these ourselves than have them come up as surprises:
 
- The twin estimates soil moisture from weather physics, not a real sensor reading, so its accuracy depends entirely on forecast quality and will drift from actual field conditions over time without something to recalibrate against.
- The weather data currently used is seeded ahead of time rather than pulled from a live API — good enough for a working demo, not yet a production data pipeline.
- There's no farmer login or multi-farm account system yet; it currently runs as a single shared instance.
- As mentioned above, the ML scheduler is trained on synthetic data derived from our own heuristic, not on real historical outcomes — that's the next thing we'd want to fix with real deployment data.
---
 
## Future Scope
 
- Hook up real soil moisture / temperature sensors over LoRaWAN so the twin can start correcting itself against actual field readings instead of running purely on simulation.
- Pull in satellite NDVI data (Sentinel/Landsat) to estimate crop health automatically instead of relying only on manually entered crop type.
- Extend the model to predict expected yield, not just irrigation timing, using historical soil and weather patterns.
- Automate the last mile — relay-controlled valves that act directly on the AI's schedule instead of needing a manual pump toggle.
 
