from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db

router = APIRouter(tags=["Health & System"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database_connected": db_ok,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "GRAYLINE Field Terminal API",
        "version": "2.4.1-TAC",
        "demo_mode": True
    }
