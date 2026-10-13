import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
DATA_DIR = WORKSPACE_DIR
STORAGE_DIR = BASE_DIR / "storage"
DB_PATH = STORAGE_DIR / "aedc_forensics.db"
MODELS_DIR = STORAGE_DIR / "models"
REPORTS_DIR = STORAGE_DIR / "reports"
UPLOADS_DIR = STORAGE_DIR / "uploads"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "AEDC Cyber Forensics API"
    app_version: str = "2.0.0"
    database_url: str = f"sqlite:///{DB_PATH.as_posix()}"
    secret_key: str = os.getenv("AEDC_SECRET_KEY", "aedc-forensics-cryptographic-seal-2026")
    default_alpha: float = 0.55  # Weight for Random Forest, (1 - alpha) for GNN
    
    # Risk scoring thresholds
    risk_low_max: float = 39.9
    risk_med_max: float = 69.9
    risk_high_max: float = 84.9
    # >= 85 is Critical

settings = Settings()
