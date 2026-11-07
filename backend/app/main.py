from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, init_db_rls
from app.api.api import api_router

# Create database tables automatically
Base.metadata.create_all(bind=engine)
init_db_rls(engine)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CrossQuest Secure Multi-Client Training Record Management System with CP-ABE & Access Anomaly Detection",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

from fastapi import Request

# Set CORS middleware for frontend PWA (restricted to allowed origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Adds OWASP-recommended security headers (SEC-01..05, ZAP baseline compliance)."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.on_event("startup")
def verify_fail_closed_crypto_environment():
    """Fail-closed verification: production environment must refuse to start without native Charm-Crypto (SEC-04),
    and must not start with default/insecure hardcoded secrets (SEC-06)."""
    if getattr(settings, "ENVIRONMENT", "development") == "production":
        from app.crypto.cpabe_engine import CHARM_AVAILABLE
        if not CHARM_AVAILABLE:
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Server refusing to start in production without native Charm-Crypto library. "
                "CP-ABE simulation mode is disallowed in production (SEC-04, VR-24)."
            )

        # Insecure default credentials check
        insecure_secret_defaults = [
            "supersecretjwtkeyforcrossquestplatformchangeinproduction",
            "change-me-in-production-super-secret-key-at-least-32-chars-long"
        ]
        if settings.SECRET_KEY in insecure_secret_defaults or "change-me" in settings.SECRET_KEY.lower() or "changeinproduction" in settings.SECRET_KEY.lower():
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Server refusing to start in production with default/insecure SECRET_KEY. "
                "Configure a strong, random secret key via the SECRET_KEY environment variable."
            )

        insecure_context_defaults = [
            "crossquest_internal_context_signing_secret_key_change_in_prod",
            "change-me-for-production-context-signature-verification-key"
        ]
        if settings.CONTEXT_SIGNING_SECRET in insecure_context_defaults or "change-me" in settings.CONTEXT_SIGNING_SECRET.lower() or "change_in_prod" in settings.CONTEXT_SIGNING_SECRET.lower():
            raise RuntimeError(
                "FAIL-CLOSED SECURITY ENFORCEMENT: Server refusing to start in production with default/insecure CONTEXT_SIGNING_SECRET. "
                "Configure a secure context signing key via the CONTEXT_SIGNING_SECRET environment variable."
            )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
