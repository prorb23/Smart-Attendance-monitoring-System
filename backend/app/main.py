import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import engine, Base, SessionLocal
from app.models.models import User
from app.auth.auth import get_password_hash
from app.routes import auth_routes, student_routes, face_routes, attendance_routes, report_routes

logger = logging.getLogger(__name__)

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Ensure data directories exist at import time
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for _subdir in ("dataset", "encodings", "exports"):
    os.makedirs(os.path.join(_BASE_DIR, _subdir), exist_ok=True)


def _seed_admin(db) -> None:
    """Create the default admin account if one does not already exist."""
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        db.add(User(
            username="admin",
            password_hash=get_password_hash(os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")),
            role="admin",
        ))
        db.commit()
        logger.info("Default admin account created.")
    else:
        logger.debug("Admin account already present.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        _seed_admin(db)
    except Exception:
        logger.exception("Failed to seed admin account.")
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title="ASR Attendance System",
    description="Facial Recognition Based Attendance System — ASR Technology",
    version="1.0.0",
    lifespan=lifespan,
    # Hide schema endpoints in production via env flag
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
    redoc_url=None,
)

# CORS — restrict to known origins; extend via ALLOWED_ORIGINS env variable
_default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(student_routes.router, prefix="/api/students", tags=["Students"])
app.include_router(face_routes.router, prefix="/api/faces", tags=["Face Recognition"])
app.include_router(attendance_routes.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(report_routes.router, prefix="/api/reports", tags=["Reports"])


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "ASR Attendance System", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
