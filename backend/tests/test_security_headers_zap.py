"""Tests for OWASP ZAP Baseline Security Headers (SEC-01..05, TC-SEC-01..05).

Meets requirements:
- SEC-01..05: OWASP recommended security headers against MIME sniffing, clickjacking, and XSS.
- Chapter III Section 3.9 & Table 28.
"""

from fastapi.testclient import TestClient


def test_tc_sec_01_to_05_owasp_security_headers(client: TestClient):
    """TC-SEC-01..05: API responses must include standard OWASP ZAP security headers."""
    resp = client.get("/")
    assert resp.status_code == 200

    headers = resp.headers
    # TC-SEC-01: No MIME sniffing
    assert headers.get("x-content-type-options") == "nosniff"
    # TC-SEC-02: Clickjacking protection
    assert headers.get("x-frame-options") == "DENY"
    # TC-SEC-03: Cross-site scripting filter
    assert headers.get("x-xss-protection") == "1; mode=block"
    # TC-SEC-04: HTTPS strict transport security
    assert "max-age=" in headers.get("strict-transport-security", "")
    # TC-SEC-05: Referrer policy
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
