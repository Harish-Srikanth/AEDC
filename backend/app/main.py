import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings, STORAGE_DIR
from .database import init_db
from .api.routes_health import router as health_router
from .api.routes_datasets import router as datasets_router
from .api.routes_evidence import router as evidence_router
from .api.routes_models import router as models_router
from .api.routes_gnn import router as gnn_router
from .api.routes_xai import router as xai_router
from .api.routes_graph import router as graph_router
from .api.routes_timeline import router as timeline_router
from .api.routes_integrity import router as integrity_router
from .api.routes_custody import router as custody_router
from .api.routes_certification import router as certification_router
from .api.routes_stream import router as stream_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    init_db()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Adaptive AI Cyber Forensics with Evidence Certification & Non-Repudiation Merkle Hash Chain",
    lifespan=lifespan
)

# CORS Middleware for local development and cloud deployments (Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api prefix
api_prefix = "/api"
app.include_router(health_router, prefix=api_prefix)
app.include_router(datasets_router, prefix=api_prefix)
app.include_router(evidence_router, prefix=api_prefix)
app.include_router(models_router, prefix=api_prefix)
app.include_router(gnn_router, prefix=api_prefix)
app.include_router(xai_router, prefix=api_prefix)
app.include_router(graph_router, prefix=api_prefix)
app.include_router(timeline_router, prefix=api_prefix)
app.include_router(integrity_router, prefix=api_prefix)
app.include_router(custody_router, prefix=api_prefix)
app.include_router(certification_router, prefix=api_prefix)
app.include_router(stream_router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "platform": settings.app_name,
        "version": settings.app_version,
        "status": "online",
        "documentation": "/docs",
        "health_check": "/api/health",
        "api_endpoints": "/api"
    }
