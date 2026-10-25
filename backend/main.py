import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.seed import seed_database
from backend.websocket_manager import ws_manager

# Import route modules
from backend.routes.auth import router as auth_router
from backend.routes.patients import router as patients_router
from backend.routes.vitals import router as vitals_router
from backend.routes.triage import router as triage_router
from backend.routes.evac import router as evac_router
from backend.routes.hazards import router as hazards_router
from backend.routes.facilities import router as facilities_router
from backend.routes.incidents import router as incidents_router
from backend.routes.reports import router as reports_router
from backend.routes.inference import router as inference_router
from backend.routes.health import router as health_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("grayline.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing GRAYLINE Tactical Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Database initialized and verified with tactical seed dataset.")
    finally:
        db.close()
    yield
    logger.info("Shutting down GRAYLINE Tactical Backend.")

app = FastAPI(
    title="GRAYLINE Field Terminal API",
    description="Emergency Medical Triage & Evacuation Logistics Platform for Defense Operations.",
    version="2.4.1-TAC",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(patients_router, prefix=settings.API_V1_STR)
app.include_router(vitals_router, prefix=settings.API_V1_STR)
app.include_router(triage_router, prefix=settings.API_V1_STR)
app.include_router(evac_router, prefix=settings.API_V1_STR)
app.include_router(hazards_router, prefix=settings.API_V1_STR)
app.include_router(facilities_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(inference_router, prefix=settings.API_V1_STR)

# Also expose health check at root /health for convenience
app.include_router(health_router)

# WebSocket Endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; accept client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.websocket("/api/ws")
async def websocket_api_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/")
def root():
    return {
        "project": "GRAYLINE",
        "tagline": "Every Second. Every Life.",
        "version": "2.4.1-TAC",
        "status": "OPERATIONAL",
        "docs": "/docs",
        "api_root": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
