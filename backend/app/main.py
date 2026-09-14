import sys
from pathlib import Path

# Add project root to sys.path so backend package is found
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database.connection import init_db
from backend.app.api import routes_detection, routes_violations, routes_analytics, routes_vehicles, routes_config, websocket_live

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent AI Road Safety & Vehicle Surveillance API",
    version="1.0.0"
)

# CORS configuration - Allow localhost and all local network addresses for smartphone camera integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    print(f"[{settings.APP_NAME}] Initializing Database...")
    init_db()
    print(f"[{settings.APP_NAME}] Database ready. Storage paths created.")

# Include API Routers
app.include_router(routes_detection.router, prefix=settings.API_PREFIX)
app.include_router(routes_violations.router, prefix=settings.API_PREFIX)
app.include_router(routes_analytics.router, prefix=settings.API_PREFIX)
app.include_router(routes_vehicles.router, prefix=settings.API_PREFIX)
app.include_router(routes_config.router, prefix=settings.API_PREFIX)
app.include_router(websocket_live.router)

# Mount static snapshot directory for violations
app.mount("/api/snapshots", StaticFiles(directory=str(settings.VIOLATIONS_PATH)), name="snapshots")
app.mount("/api/outputs", StaticFiles(directory=str(settings.OUTPUTS_PATH)), name="outputs")

# Mount sample media only if directory exists
_sample_dir = BASE_DIR / "sample_media"
_sample_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/samples", StaticFiles(directory=str(_sample_dir)), name="samples")


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "api_status": "healthy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
