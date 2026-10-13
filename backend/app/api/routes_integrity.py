import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, EvidenceRecord, ChainOfCustodyLog
from ..schemas import (
    IntegrityVerificationResponse, TamperSimulateRequest
)
from ..services.hashing import verify_chain, compute_canonical_hash

router = APIRouter(prefix="/integrity", tags=["Integrity & Tampering"])


@router.get("/verify", response_model=IntegrityVerificationResponse)
def verify_hash_chain(db: Session = Depends(get_db)):
    """Verifies the entire cryptographic SHA-256 hash chain and pinpoints any fractured block."""
    records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).all()
    if not records:
        return IntegrityVerificationResponse(
            status="PASS",
            total_blocks_checked=0,
            root_hash="0" * 64,
            verification_timestamp=datetime.now(timezone.utc).isoformat()
        )

    is_valid, fracture_idx, frac_id, reason = verify_chain(records)
    root_hash = records[-1].block_hash if records else ("0" * 64)

    return IntegrityVerificationResponse(
        status="PASS" if is_valid else "FAIL",
        total_blocks_checked=len(records),
        fracture_index=fracture_idx,
        fractured_evidence_id=frac_id,
        reason=reason,
        root_hash=root_hash,
        verification_timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    )


@router.post("/tamper-simulate")
def simulate_tampering(request: TamperSimulateRequest, db: Session = Depends(get_db)):
    """
    Simulates adversarial tampering with a specific evidence record:
    Modifies internal payload without updating hash chain, simulating malicious falsification.
    """
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.evidence_id == request.evidence_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence ID {request.evidence_id} not found.")

    if rec.is_tampered:
        return {"message": "Record is already in a tampered state.", "evidence_id": rec.evidence_id}

    # Backup original state
    rec.original_payload = rec.raw_payload
    rec.original_hash = rec.canonical_hash

    # Modify payload
    try:
        data = json.loads(rec.raw_payload)
        data[request.field_to_tamper] = request.tampered_value
        rec.raw_payload = json.dumps(data, sort_keys=True)
        rec.is_tampered = True

        # Log custody alert
        custody_entry = ChainOfCustodyLog(
            evidence_id=rec.evidence_id,
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            custodian="Adversary Simulation Engine",
            action="TAMPER_DETECT_TRIGGER",
            hash_state=rec.block_hash,
            details=f"Altered field '{request.field_to_tamper}' to '{request.tampered_value}'."
        )
        db.add(custody_entry)
        db.commit()

        return {
            "status": "tampered",
            "evidence_id": rec.evidence_id,
            "modified_field": request.field_to_tamper,
            "new_value": request.tampered_value,
            "message": "Record payload altered. Run '/api/integrity/verify' to witness chain fracture detection."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Tamper simulation failed: {str(e)}")


@router.post("/restore/{evidence_id}")
def restore_tampered_record(evidence_id: str, db: Session = Depends(get_db)):
    """Restores a tampered record back to its authentic cryptographic state."""
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.evidence_id == evidence_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence ID {evidence_id} not found.")

    if not rec.is_tampered or not rec.original_payload:
        return {"message": "Record is not tampered or has no restoration backup.", "evidence_id": evidence_id}

    rec.raw_payload = rec.original_payload
    rec.canonical_hash = rec.original_hash
    rec.is_tampered = False

    # Log restoration
    custody_entry = ChainOfCustodyLog(
        evidence_id=rec.evidence_id,
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        custodian="Forensic Lead Cryptographer",
        action="RECORD_RESTORED",
        hash_state=rec.block_hash,
        details="Restored bit-for-bit canonical payload and re-established hash chain validity."
    )
    db.add(custody_entry)
    db.commit()

    return {
        "status": "restored",
        "evidence_id": evidence_id,
        "message": "Evidence record successfully restored to authentic cryptographic state."
    }


@router.get("/blocks")
def get_hash_blocks(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieves chronological hash chain blocks for cryptographic inspector view."""
    records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).limit(limit).all()
    blocks = []
    for r in records:
        blocks.append({
            "block_index": r.id,
            "evidence_id": r.evidence_id,
            "timestamp": r.timestamp,
            "canonical_hash": r.canonical_hash,
            "prev_hash": r.prev_hash,
            "block_hash": r.block_hash,
            "is_tampered": r.is_tampered,
            "ground_truth_label": r.ground_truth_label
        })
    return {"blocks": blocks, "total": len(blocks)}
