import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Float
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class ClientCompany(Base):
    __tablename__ = "client_companies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. 'CORP_ALPHA'
    name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trainees = relationship("Trainee", back_populates="current_company")
    training_records = relationship("TrainingRecord", back_populates="company_at_completion")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Crossworks staff attribute management for CP-ABE
    role = Column(String(50), nullable=False, default="account_manager") # admin, trainer, account_manager, auditor
    clearance_level = Column(Integer, default=1) # 1=Standard, 2=Confidential, 3=Secret
    assigned_client_accounts = Column(JSON, default=list) # List of company codes, e.g. ["CORP_ALPHA", "CORP_BETA"]
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    access_logs = relationship("AccessLog", back_populates="user")


class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    
    # Trainee company affiliation is recorded as an attribute of the attendee
    current_company_id = Column(String(36), ForeignKey("client_companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    current_company = relationship("ClientCompany", back_populates="trainees")
    training_records = relationship("TrainingRecord", back_populates="trainee")
    certificates = relationship("Certificate", back_populates="trainee")
    gamification = relationship("GamificationProgress", uselist=False, back_populates="trainee")


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    
    # Retains the company attribute in effect at completion time to preserve historical isolation
    company_at_completion_id = Column(String(36), ForeignKey("client_companies.id"), nullable=False)
    course_name = Column(String(200), nullable=False)
    status = Column(String(50), default="in_progress") # not_started, in_progress, completed
    completion_date = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)

    # CP-ABE Encrypted Data and Policy Specification
    # Policy string binds role, assigned client accounts, and clearance level
    encryption_policy = Column(String(500), nullable=False) # e.g. "(ROLE:account_manager AND COMPANY:CORP_ALPHA) OR ROLE:admin"
    encrypted_payload = Column(Text, nullable=False) # Base64 or serialized CP-ABE ciphertext
    is_encrypted = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    trainee = relationship("Trainee", back_populates="training_records")
    company_at_completion = relationship("ClientCompany", back_populates="training_records")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    title = Column(String(200), nullable=False)
    issue_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=False)
    is_nearing_renewal = Column(Boolean, default=False)
    status = Column(String(50), default="active") # active, expired, revoked

    trainee = relationship("Trainee", back_populates="certificates")


class GamificationProgress(Base):
    __tablename__ = "gamification_progress"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), unique=True, nullable=False)
    points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    badges = Column(JSON, default=list) # List of earned badge keys
    quizzes_completed = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trainee = relationship("Trainee", back_populates="gamification")


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    target_record_id = Column(String(36), nullable=True)
    access_type = Column(String(50), nullable=False) # VIEW, DECRYPT, EXPORT, MODIFY
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(45), nullable=True)
    status = Column(String(50), nullable=False) # SUCCESS, FAILED_POLICY, OUT_OF_SCOPE, DENIED
    requested_company_code = Column(String(50), nullable=True)

    user = relationship("User", back_populates="access_logs")


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    anomaly_type = Column(String(100), nullable=False) # OUT_OF_SCOPE, OFF_HOURS, REPEATED_FAILED_ATTEMPTS, ABNORMAL_VOLUME
    severity = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    metadata_info = Column(JSON, default=dict)
    is_reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
