import json
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text, DateTime
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    evidence_id = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(String(64), index=True, nullable=False)
    user = Column(String(64), index=True, nullable=True)
    device = Column(String(64), index=True, nullable=True)
    source_ip = Column(String(64), nullable=True)
    destination_ip = Column(String(64), nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(32), nullable=True)
    action = Column(String(64), nullable=True)
    process_name = Column(String(128), nullable=True)
    command_line = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    query_domain = Column(String(256), nullable=True)
    usb_device_id = Column(String(64), nullable=True)
    
    # Raw payload and cryptographic chain
    raw_payload = Column(Text, nullable=False)
    canonical_hash = Column(String(64), nullable=False)
    prev_hash = Column(String(64), nullable=False)
    block_hash = Column(String(64), nullable=False)
    
    # Tampering tracking
    is_tampered = Column(Boolean, default=False, nullable=False)
    original_payload = Column(Text, nullable=True)
    original_hash = Column(String(64), nullable=True)
    
    # Labels and context
    ground_truth_label = Column(String(32), default="normal", nullable=False)
    attack_type = Column(String(64), default="Normal", nullable=False)
    incident_id = Column(String(64), nullable=True)
    user_risk_level = Column(String(32), default="Low", nullable=False)
    asset_criticality = Column(String(32), default="Low", nullable=False)
    
    # AI predictions & Risk scoring
    rf_prediction = Column(Float, nullable=True)
    gnn_prediction = Column(Float, nullable=True)
    combined_score = Column(Float, nullable=True)
    risk_level = Column(String(32), nullable=True)
    is_simulated = Column(Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "evidence_id": self.evidence_id,
            "timestamp": self.timestamp,
            "user": self.user,
            "device": self.device,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "destination_port": self.destination_port,
            "protocol": self.protocol,
            "action": self.action,
            "process_name": self.process_name,
            "command_line": self.command_line,
            "file_path": self.file_path,
            "query_domain": self.query_domain,
            "usb_device_id": self.usb_device_id,
            "canonical_hash": self.canonical_hash,
            "prev_hash": self.prev_hash,
            "block_hash": self.block_hash,
            "is_tampered": self.is_tampered,
            "ground_truth_label": self.ground_truth_label,
            "attack_type": self.attack_type,
            "incident_id": self.incident_id,
            "user_risk_level": self.user_risk_level,
            "asset_criticality": self.asset_criticality,
            "rf_prediction": round(self.rf_prediction, 4) if self.rf_prediction is not None else None,
            "gnn_prediction": round(self.gnn_prediction, 4) if self.gnn_prediction is not None else None,
            "combined_score": round(self.combined_score, 2) if self.combined_score is not None else None,
            "risk_level": self.risk_level,
            "is_simulated": self.is_simulated,
        }


class ChainOfCustodyLog(Base):
    __tablename__ = "chain_of_custody_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evidence_id = Column(String(64), index=True, nullable=False)
    timestamp = Column(String(64), nullable=False)
    custodian = Column(String(128), nullable=False)
    action = Column(String(64), nullable=False)
    hash_state = Column(String(64), nullable=False)
    details = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "evidence_id": self.evidence_id,
            "timestamp": self.timestamp,
            "custodian": self.custodian,
            "action": self.action,
            "hash_state": self.hash_state,
            "details": self.details,
        }


class ForensicCertificate(Base):
    __tablename__ = "forensic_certificates"

    id = Column(String(64), primary_key=True)
    created_at = Column(String(64), nullable=False)
    case_id = Column(String(64), nullable=False)
    custodian = Column(String(128), nullable=False)
    total_records = Column(Integer, nullable=False)
    verified_records = Column(Integer, nullable=False)
    tampered_records = Column(Integer, nullable=False)
    verdict = Column(String(32), nullable=False)  # PASS, FAIL, REVIEW REQUIRED
    root_hash = Column(String(64), nullable=False)
    integrity_check_passed = Column(Boolean, nullable=False)
    model_consensus_passed = Column(Boolean, nullable=False)
    custody_check_passed = Column(Boolean, nullable=False)
    provenance_check_passed = Column(Boolean, nullable=False)
    certificate_digest = Column(String(64), nullable=False)
    pdf_path = Column(Text, nullable=True)
    json_path = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at,
            "case_id": self.case_id,
            "custodian": self.custodian,
            "total_records": self.total_records,
            "verified_records": self.verified_records,
            "tampered_records": self.tampered_records,
            "verdict": self.verdict,
            "root_hash": self.root_hash,
            "integrity_check_passed": self.integrity_check_passed,
            "model_consensus_passed": self.model_consensus_passed,
            "custody_check_passed": self.custody_check_passed,
            "provenance_check_passed": self.provenance_check_passed,
            "certificate_digest": self.certificate_digest,
            "has_pdf": bool(self.pdf_path),
            "has_json": bool(self.json_path),
        }


class ModelArtifact(Base):
    __tablename__ = "model_artifacts"

    id = Column(String(64), primary_key=True)  # 'rf_model', 'gnn_model'
    version = Column(String(32), nullable=False)
    trained_at = Column(String(64), nullable=False)
    metrics = Column(Text, nullable=False)
    parameters = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "version": self.version,
            "trained_at": self.trained_at,
            "metrics": json.loads(self.metrics) if self.metrics else {},
            "parameters": json.loads(self.parameters) if self.parameters else {},
        }


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
