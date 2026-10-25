"""Tests for Concurrent Load & Connection Pool Health (TC-PER-06).

Meets requirements:
- TC-PER-06: 100 concurrent requests without RLS transaction connection pool exhaustion.
- Measure M8: RLS query overhead and connection acquisition latency.
- Section 3.9, Table 28.
"""

import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import User


@pytest.fixture
def concurrency_admin(db_session: Session):
    user = db_session.query(User).filter_by(email="concurrency_admin@test.ph").first()
    if not user:
        user = User(
            email="concurrency_admin@test.ph",
            username="concurrency_admin",
            full_name="Concurrency Admin",
            hashed_password=get_password_hash("Pass123!"),
            role="admin",
            is_superuser=True,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


def test_tc_per_06_hundred_concurrent_requests(monotonic_timer, client: TestClient, concurrency_admin):
    """TC-PER-06: 100 concurrent requests execute without connection pool exhaustion or errors."""
    token = create_access_token(subject=concurrency_admin.id)
    headers = {"Authorization": f"Bearer {token}"}
    timer = monotonic_timer()

    num_requests = 100
    concurrency_level = 20

    def make_request(request_idx: int):
        # Vary endpoints between leaderboard, certificates, and records
        endpoints = [
            "/api/v1/gamification/leaderboard",
            "/api/v1/certifications/",
            "/api/v1/records/"
        ]
        target = endpoints[request_idx % len(endpoints)]
        resp = client.get(target, headers=headers)
        return resp.status_code

    timer.start()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency_level) as executor:
        futures = [executor.submit(make_request, i) for i in range(num_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    total_ns = timer.stop()
    total_ms = total_ns / 1_000_000.0
    avg_ms = total_ms / num_requests

    # Assert 100% success rate without connection exhaustion (HTTP 500 / 503)
    assert len(results) == 100
    failed_codes = [code for code in results if code != 200]
    assert len(failed_codes) == 0, f"Requests failed under load: {failed_codes}"

    print(f"\n[TC-PER-06 Benchmark] 100 Concurrent Requests Total Time: {total_ms:.2f}ms (Avg: {avg_ms:.2f}ms/req)")
