import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import DATA_DIR, UPLOADS_DIR
from ..schemas import DiscoveryResponse, IngestRequest, IngestResponse
from ..services.ingestion import (
    inspect_all_datasets, execute_ingestion_pipeline, find_dataset_files
)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("/discover", response_model=DiscoveryResponse)
def discover_datasets():
    """Discovers available CSV/JSON datasets and verifies multi-source readiness."""
    files_info = inspect_all_datasets()
    found_map = find_dataset_files()
    
    # Priority sources required for complete multi-source forensics
    required_keys = ["auth", "process", "network", "dns", "file", "powershell", "usb"]
    ready = all(k in found_map for k in required_keys)

    return DiscoveryResponse(
        dataset_directory=str(DATA_DIR),
        available_files=files_info,
        correlated_sources=list(found_map.keys()),
        is_ready_to_ingest=ready
    )


@router.post("/upload")
async def upload_dataset_file(file: UploadFile = File(...)):
    """Uploads a forensic log or registry dataset file into the uploads repository."""
    if not file.filename.lower().endswith((".csv", ".json", ".jsonl")):
        raise HTTPException(status_code=400, detail="Only CSV, JSON, and JSONL forensic files supported.")

    target_path = UPLOADS_DIR / file.filename
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    return {
        "filename": file.filename,
        "saved_path": str(target_path),
        "size_bytes": target_path.stat().st_size,
        "status": "uploaded_successfully"
    }


@router.post("/ingest", response_model=IngestResponse)
def ingest_datasets(request: IngestRequest = IngestRequest(), db: Session = Depends(get_db)):
    """Correlates multi-source logs, computes canonical SHA-256 hash chain, and persists evidence."""
    try:
        res = execute_ingestion_pipeline(
            db=db,
            max_records=request.max_records,
            custodian=request.custodian,
            reset_existing=request.reset_existing
        )
        return IngestResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
