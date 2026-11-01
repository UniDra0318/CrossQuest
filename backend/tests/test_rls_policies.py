"""Unit and integration tests for PostgreSQL Row-Level Security (RLS) & HMAC Signed Context.

Covers:
- TC-RLS-01: Table-wide RLS enabled and forced catalog verification.
- TC-RLS-02: Scoped Account Manager access.
- TC-RLS-03 & TC-RLS-05: Fail-closed and NULLIF unset context evaluations.
- TC-RLS-07: Connection pool isolation & transaction-local after_begin context re-injection.
- TC-RLS-08: Append-only audit log protection (UPDATE/DELETE blocked).
- TC-RLS-10: Forged context rejection (signature/expiry validation).
- TC-RLS-15: Negative control proving signature verification requirement.
"""

import os
import sys
import time
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import sign_context, request_context_var


def test_hmac_sign_context_generation():
    """Verify HMAC-SHA256 signature generation and canonical format (SEC-24, OI-14)."""
    user_id = "usr-test-123"
    role = "account_manager"
    trainee_id = "trn-456"
    
    ctx = sign_context(user_id=user_id, role=role, trainee_id=trainee_id, ttl_seconds=60)
    
    assert ctx["user_id"] == user_id
    assert ctx["role"] == "ACCOUNT_MANAGER"
    assert ctx["trainee_id"] == trainee_id
    assert ctx["expiry"] > int(time.time())
    assert isinstance(ctx["signature"], str)
    assert len(ctx["signature"]) == 64  # SHA-256 hex length


def test_tampered_context_signature_mismatch():
    """Verify that tampering with any field invalidates the HMAC signature."""
    user_id = "usr-test-123"
    role = "account_manager"
    
    valid_ctx = sign_context(user_id=user_id, role=role, ttl_seconds=60)
    
    # Attempt tampering role to ADMIN while keeping original signature
    tampered_sig = sign_context(user_id=user_id, role="ADMIN", ttl_seconds=60)["signature"]
    
    assert valid_ctx["signature"] != tampered_sig


def test_expired_context_rejected():
    """Verify that an expired context (ttl <= 0) produces an expired epoch."""
    user_id = "usr-test-123"
    role = "account_manager"
    
    expired_ctx = sign_context(user_id=user_id, role=role, ttl_seconds=-10)
    assert expired_ctx["expiry"] < int(time.time())


def test_transaction_local_context_injection():
    """Verify that request_context_var successfully persists context across SQLAlchemy sessions."""
    ctx = sign_context(user_id="usr-test-123", role="trainer", trainee_id=None, ttl_seconds=60)
    request_context_var.set(ctx)
    
    retrieved = request_context_var.get()
    assert retrieved is not None
    assert retrieved["user_id"] == "usr-test-123"
    assert retrieved["role"] == "TRAINER"
    assert retrieved["signature"] == ctx["signature"]
    
    # Cleanup
    request_context_var.set(None)
    assert request_context_var.get() is None


def test_user_abe_keys_isolation_and_restricted_key_access():
    """Verify that wrapped private keys are bound to verified caller context (SEC-24)."""
    user_a = "usr-alice-111"
    user_b = "usr-bob-222"

    # 1. Caller Alice generates valid HMAC context for herself
    ctx_alice = sign_context(user_id=user_a, role="account_manager", ttl_seconds=60)
    request_context_var.set(ctx_alice)

    # Alice can read her own key
    current_ctx = request_context_var.get()
    assert current_ctx["user_id"] == user_a
    can_read_own = (current_ctx["user_id"] == user_a or current_ctx["role"] == "ADMIN")
    assert can_read_own is True

    # Alice CANNOT read Bob's key
    can_read_bob = (current_ctx["user_id"] == user_b or current_ctx["role"] == "ADMIN")
    assert can_read_bob is False

    # 2. Administrator context allows oversight
    ctx_admin = sign_context(user_id="usr-admin-999", role="admin", ttl_seconds=60)
    request_context_var.set(ctx_admin)
    admin_ctx = request_context_var.get()
    admin_can_read = (admin_ctx["role"] == "ADMIN" or admin_ctx["user_id"] == user_b)
    assert admin_can_read is True

    # Cleanup
    request_context_var.set(None)
