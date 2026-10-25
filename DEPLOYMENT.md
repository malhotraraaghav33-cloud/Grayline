# GRAYLINE // Deployment & Integration Guide
**Tagline:** Every Second. Every Life.  
**Platform:** Emergency Medical Triage & Evacuation Logistics Platform

---

## 1. Architecture Overview

GRAYLINE is structured as a decoupled full-stack emergency response system:
- **Frontend**: React 19 + TypeScript + Tailwind CSS tactical cockpit matching the MIL-STD Stitch terminal. Runs on port `3000`.
- **Backend API**: Python FastAPI with modular routers, Pydantic v2 schemas, JWT authentication, and WebSocket real-time broadcast. Runs on port `8000`.
- **Database**: PostgreSQL for persistent multi-user shared data, with seamless zero-config SQLite (`grayline_tactical.db`) fallback for local demonstration.
- **Dijkstra Engine**: Genuine road network solver with active roadblock avoidance and transit time derivation.
- **GPU Inference Gateway**: Optional plug-and-play abstraction client. If no GPU server is configured, operates deterministically using verified demo rules with clear unvalidated notices.

---

## 2. Default Demo Credentials

For testing and demonstration, the database is auto-seeded with three tactical roles:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `tactical_admin_pass` | Administrator | Full access: casualty creation, road closures, triage override, user management |
| `operator` | `tacmed_operator_pass` | Medical Operator | Vitals recording, triage certification, medevac dispatch, hazard reporting |
| `viewer` | `guest_viewer_pass` | Read-Only Viewer | Read telemetry, view tactical maps, audit log inspection |

---

## 3. Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- (Optional) PostgreSQL 15+

### Backend Setup
```bash
# 1. Install backend dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env

# 3. Run database migrations (or allow auto-creation on start)
alembic upgrade head

# 4. Start the FastAPI backend
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: `http://localhost:8000/docs`

### Frontend Setup
```bash
# 1. Install npm dependencies
npm install

# 2. Start Vite development server (proxies /api and /ws to port 8000)
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 4. Docker Deployment

### Launch with Docker Compose (PostgreSQL + FastAPI + Frontend)
```bash
docker-compose up --build
```
This provisions:
- PostgreSQL on port `5432` with volume `postgres_data`
- FastAPI on port `8000` with health check
- Tactical frontend on port `3000`

---

## 5. Automated Tests

Execute the automated test suite covering authentication, authorization, schema bounds validation, triage rules, and Dijkstra routing:

```bash
python3 -m pytest -v
```
All 25 unit and integration tests run against an isolated in-memory test database.

---

## 6. Optional GPU Inference Service Connection

GRAYLINE is architected to be GPU-ready without coupling the core server to GPU drivers:

1. **Standalone Operation (Default)**:
   - When `INFERENCE_SERVICE_URL=""`, the backend operates using the deterministic, explainable rule engine (`RULE-01` to `RULE-09`).
   - The UI and API explicitly display: `UNVALIDATED_DEMO_ALGORITHM: No GPU inference service configured; using verified deterministic demo triage rules.`

2. **Connecting an External GPU Inference Service**:
   - Set the following in `.env`:
     ```bash
     INFERENCE_SERVICE_URL="http://gpu-worker.internal:8080"
     INFERENCE_SERVICE_API_KEY="your-gpu-cluster-token"
     INFERENCE_TIMEOUT_SECONDS=5.0
     ```
   - The GPU service should implement a `/health` and `/predict` endpoint accepting `{ "vitals": {...}, "trauma_mechanism": "..." }` and returning `{ "priority": "CRITICAL", "confidence": 0.94, "rationale": "..." }`.
   - If the GPU service is unavailable or returns an error, GRAYLINE automatically falls back to the deterministic rule engine without interrupting field operations.
   - All model outputs require human medical officer certification before dispatch orders are executed.
