import json
import hashlib
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime, timezone


def canonical_json(data: Dict[str, Any]) -> str:
    """
    Deterministically serializes a dictionary into canonical JSON format:
    - Sorted keys
    - No whitespace between delimiters
    - Handles nested data structures consistently
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def sha256_hash(content: str) -> str:
    """Computes standard hexadecimal SHA-256 hash of a string."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def compute_canonical_hash(record_dict: Dict[str, Any]) -> str:
    """Computes SHA-256 over canonical JSON of the record payload."""
    serialized = canonical_json(record_dict)
    return sha256_hash(serialized)


def compute_block_hash(prev_hash: str, canonical_hash: str) -> str:
    """
    Computes tamper-evident chained hash:
    H_i = SHA256(H_{i-1} || H_canonical)
    """
    combined = f"{prev_hash}{canonical_hash}"
    return sha256_hash(combined)


def verify_chain(records: List[Any]) -> Tuple[bool, Optional[int], Optional[str], Optional[str]]:
    """
    Cryptographically verifies an entire sequence of evidence records.
    Returns: (is_valid, fracture_index, fractured_evidence_id, reason)
    """
    if not records:
        return True, None, None, None

    expected_prev = "0" * 64

    for idx, rec in enumerate(records):
        # 1. Parse and verify canonical payload hash
        try:
            payload = json.loads(rec.raw_payload)
            expected_canonical = compute_canonical_hash(payload)
        except Exception as e:
            return False, idx, rec.evidence_id, f"Invalid JSON payload at index {idx}: {str(e)}"

        if expected_canonical != rec.canonical_hash:
            return False, idx, rec.evidence_id, (
                f"Record payload altered! Expected hash {expected_canonical[:12]}..., "
                f"stored hash {rec.canonical_hash[:12]}..."
            )

        # 2. Verify previous hash pointer
        if rec.prev_hash != expected_prev:
            return False, idx, rec.evidence_id, (
                f"Hash chain broken at index {idx}! Previous pointer mismatch: "
                f"expected {expected_prev[:12]}..., got {rec.prev_hash[:12]}..."
            )

        # 3. Verify block hash computation
        expected_block_hash = compute_block_hash(rec.prev_hash, rec.canonical_hash)
        if rec.block_hash != expected_block_hash:
            return False, idx, rec.evidence_id, (
                f"Block hash mismatch at index {idx}! Expected {expected_block_hash[:12]}..., "
                f"got {rec.block_hash[:12]}..."
            )

        expected_prev = rec.block_hash

    return True, None, None, None
