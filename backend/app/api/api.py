from fastapi import APIRouter
from app.api.endpoints import (
    auth,
    users,
    trainees,
    records,
    certifications,
    gamification,
    anomalies,
    reports,
    imports
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Staff & Attributes"])
api_router.include_router(trainees.router, prefix="/trainees", tags=["Trainees & Clients"])
api_router.include_router(records.router, prefix="/records", tags=["Training Records & CP-ABE"])
api_router.include_router(certifications.router, prefix="/certifications", tags=["Certifications & Expiry"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Access Anomaly Detection"])
api_router.include_router(reports.router, prefix="/reports", tags=["Client Reports"])
api_router.include_router(imports.router, prefix="/imports", tags=["Pilot CSV Import"])

