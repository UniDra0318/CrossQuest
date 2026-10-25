from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, ConfigDict


# Auth & Token
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    full_name: str
    assigned_client_accounts: List[str] = []

class TokenData(BaseModel):
    user_id: Optional[str] = None


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str # admin, account_manager, finance, trainer, trainee
    assigned_client_accounts: List[str] = []

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserAttributeUpdate(BaseModel):
    role: Optional[str] = None
    assigned_client_accounts: Optional[List[str]] = None


# Client Company
class ClientCompanyBase(BaseModel):
    code: str
    name: str
    industry: Optional[str] = None

class ClientCompanyCreate(ClientCompanyBase):
    pass

class ClientCompanyResponse(ClientCompanyBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Trainee
class TraineeBase(BaseModel):
    trainee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    display_name: Optional[str] = None
    phone: Optional[str] = None
    current_company_id: Optional[str] = None

class TraineeCreate(TraineeBase):
    pass

class TraineeResponse(TraineeBase):
    id: str
    created_at: datetime
    current_company: Optional[ClientCompanyResponse] = None

    model_config = ConfigDict(from_attributes=True)

class TraineeProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None


# Training Record
class TrainingRecordCreate(BaseModel):
    trainee_id: str
    session_id: Optional[str] = None
    company_at_completion_id: str
    course_name: str
    status: str = "In progress" # Enrolled, In progress, Completed, Not completed
    score: Optional[float] = None
    # Sensitive attributes for hybrid CP-ABE payload
    assessment_notes: Optional[str] = None
    practical_lab: Optional[str] = None
    certificate_reference: Optional[str] = None
    extension_fields: Optional[Dict[str, Any]] = None

class TrainingRecordUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    assessment_notes: Optional[str] = None

class TrainingRecordResponse(BaseModel):
    id: str
    trainee_id: str
    session_id: Optional[str] = None
    company_at_completion_id: str
    course_name: str
    status: str
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    encryption_policy: str
    policy_version: int
    is_encrypted: bool
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DecryptedRecordResponse(BaseModel):
    record_id: str
    course_name: str
    status: str
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    decrypted_content: Dict[str, Any]
    decryption_status: str


# Certification
class CertificationTypeResponse(BaseModel):
    code: str
    name: str
    validity_months: int
    validity_basis: str

    model_config = ConfigDict(from_attributes=True)

class CertificateResponse(BaseModel):
    id: str
    trainee_id: str
    record_id: Optional[str] = None
    cert_type_code: Optional[str] = None
    title: str
    issue_date: datetime
    expiry_date: datetime
    expiry_basis: str
    status: str # Valid, Expiring soon, Expired
    is_nearing_renewal: bool

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: str
    recipient_user_id: str
    certification_id: str
    offset_days: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Gamification
class GamificationResponse(BaseModel):
    id: str
    trainee_id: str
    points: int
    level: int
    badges: List[str]
    quizzes_completed: int

    model_config = ConfigDict(from_attributes=True)

class QuizSubmitRequest(BaseModel):
    attempt_id: Optional[str] = None # Client-generated UUID for offline idempotency
    trainee_id: str
    quiz_id: str
    answers: Optional[Dict[str, int]] = None
    score: Optional[float] = None
    total_questions: Optional[int] = None
    submitted_offline: bool = False


# Anomalies & Audit (with full alert lifecycle)
class AnomalyAlertReviewRequest(BaseModel):
    status: str # UNDER_REVIEW or CLOSED
    disposition: Optional[str] = None # CLOSED_EXPECTED_ACTIVITY or CLOSED_FOLLOW_UP_REQUIRED
    review_note: Optional[str] = None

class AnomalyAlertResponse(BaseModel):
    id: str
    subject_user_id: Optional[str] = None
    rule_code: str
    severity: str
    severity_base: Optional[str] = "MEDIUM"
    severity_final: Optional[str] = "MEDIUM"
    after_hours_tag: Optional[bool] = False
    episode_start: Optional[datetime] = None
    client_reviewed: Optional[bool] = False
    status: str # NEW, UNDER_REVIEW, CLOSED
    disposition: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_by_user_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    tags: List[str] = []
    event_count: int
    description: str
    metadata_info: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AccessLogResponse(BaseModel):
    id: str
    occurred_at: datetime
    actor_user_id: Optional[str] = None
    actor_role: Optional[str] = None
    event_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    company_id: Optional[str] = None
    outcome: str
    reason_code: Optional[str] = None
    source_ip: Optional[str] = None
    details: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
