from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db, ForensicCertificate
from ..schemas import CertificateValidateRequest
from ..services.certification import validate_forensic_evidence

router = APIRouter(prefix="/certification", tags=["Forensic Certification"])


@router.post("/validate")
def validate_and_issue_certificate(
    request: CertificateValidateRequest = CertificateValidateRequest(),
    db: Session = Depends(get_db)
):
    """
    Executes the 5 mandatory forensic checks and issues an official Certificate of Authenticity.
    Produces downloadable PDF and JSON forensic reports.
    """
    try:
        cert_data = validate_forensic_evidence(
            db=db,
            case_id=request.case_id,
            custodian=request.custodian
        )
        return cert_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certification execution failed: {str(e)}")


@router.get("/list")
def list_certificates(db: Session = Depends(get_db)):
    """Retrieves all issued forensic certificates."""
    certs = db.query(ForensicCertificate).order_by(ForensicCertificate.created_at.desc()).all()
    return {"certificates": [c.to_dict() for c in certs], "total": len(certs)}


@router.get("/download/pdf/{cert_id}")
def download_certificate_pdf(cert_id: str, db: Session = Depends(get_db)):
    """Downloads the official Court-Admissible Forensic Certificate in PDF format."""
    cert = db.query(ForensicCertificate).filter(ForensicCertificate.id == cert_id).first()
    if not cert or not cert.pdf_path:
        raise HTTPException(status_code=404, detail=f"Certificate PDF for {cert_id} not found.")

    p = Path(cert.pdf_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Certificate PDF file is missing on storage.")

    return FileResponse(
        path=str(p),
        media_type="application/pdf",
        filename=f"AEDC_Forensic_Certificate_{cert_id}.pdf"
    )


@router.get("/download/json/{cert_id}")
def download_certificate_json(cert_id: str, db: Session = Depends(get_db)):
    """Downloads the cryptographic JSON digest for the forensic certificate."""
    cert = db.query(ForensicCertificate).filter(ForensicCertificate.id == cert_id).first()
    if not cert or not cert.json_path:
        raise HTTPException(status_code=404, detail=f"Certificate JSON for {cert_id} not found.")

    p = Path(cert.json_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Certificate JSON file is missing on storage.")

    return FileResponse(
        path=str(p),
        media_type="application/json",
        filename=f"AEDC_Forensic_Digest_{cert_id}.json"
    )
