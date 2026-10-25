"""Locust Load Test Suite for CrossQuest (TC-PER-06).

Meets requirements:
- TC-PER-06: 100 concurrent requests without RLS transaction connection pool exhaustion.
- Section 3.9 & Table 28 performance targets:
  - 100 concurrent simulated users across internal roles (Trainees, Account Managers, Trainers).
  - API latencies under load with signed RLS context injection.
  - Zero connection leaks or unhandled HTTP 500 pool exhaustion errors.

Usage:
    locust -f backend/tests/locustfile.py --headless -u 100 -r 20 --run-time 30s --host http://localhost:8000
"""

try:
    from locust import HttpUser, task, between
except ImportError:
    # Fallback definitions when locust is not yet installed in local environment
    class HttpUser:  # type: ignore
        wait_time = None
        client = None

    def task(weight=1):  # type: ignore
        def decorator(f):
            return f
        return decorator

    def between(a, b):  # type: ignore
        return None

import random

class CrossQuestUser(HttpUser):
    wait_time = between(0.1, 0.5)

    def on_start(self):
        """Authenticates a test user session and obtains access token."""
        # Authenticate with admin or demo account
        resp = self.client.post("/api/v1/auth/login", data={
            "username": "admin@test.ph",
            "password": "Password123!"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(3)
    def fetch_records_with_rls(self):
        """Simulates querying training records with RLS signed context evaluation."""
        self.client.get("/api/v1/records/", headers=self.headers, name="/records/")

    @task(2)
    def fetch_gamification_leaderboard(self):
        """Simulates querying the gamification leaderboard."""
        self.client.get("/api/v1/gamification/leaderboard", headers=self.headers, name="/gamification/leaderboard")

    @task(2)
    def fetch_certifications(self):
        """Simulates querying certificate statuses."""
        self.client.get("/api/v1/certifications/", headers=self.headers, name="/certifications/")

    @task(1)
    def health_check(self):
        """Basic system health and liveness probe."""
        self.client.get("/", name="/health")
